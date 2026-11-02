// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as fs from "fs";
// Typed SDKs generated from CRD manifests (crds/) via Kubernetes provider extensions:
//   pulumi package add kubernetes --extension "name=gateway-networking crd-manifest=crds/gateway-api-standard-v1.7.0.yaml"
//   pulumi package add kubernetes --extension "name=prometheus-operator crd-manifest=crds/monitoring.coreos.com_podmonitors.yaml"
import * as gatewayNetworking from "@pulumi/gateway-networking";
import * as k8s from "@pulumi/kubernetes";
import * as prometheusOperator from "@pulumi/prometheus-operator";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const clusterName = config.get("clusterName") || "gpu-dra-cluster";

// GPU capacity. Three ways to get an A100 node:
//   ON_DEMAND             — no reservation, billed per hour, AWS may have no capacity.
//                           Optionally pin gpuAvailabilityZone to an AZ that has capacity
//                           (EKS fails the node group on the first AZ without it).
//   ON_DEMAND_RESERVATION — on-demand, but grab an On-Demand Capacity Reservation in
//                           gpuAvailabilityZone first. Fails in seconds instead of after
//                           the ~25 min node group timeout, same hourly price, no upfront
//                           cost; deleted with the stack.
//   CAPACITY_BLOCK        — prepaid AWS Capacity Block; set capacityReservationId and
//                           gpuAvailabilityZone (the AZ the block lives in).
const gpuInstanceType = config.get("gpuInstanceType") || "p4d.24xlarge";
const gpuCapacityType = config.get("gpuCapacityType") || "ON_DEMAND";
const gpuAvailabilityZone = config.get("gpuAvailabilityZone");
const isCapacityBlock = gpuCapacityType === "CAPACITY_BLOCK";
const isOnDemandReservation = gpuCapacityType === "ON_DEMAND_RESERVATION";
if (isCapacityBlock && (!config.get("capacityReservationId") || !gpuAvailabilityZone)) {
    throw new Error("gpuCapacityType=CAPACITY_BLOCK needs capacityReservationId and gpuAvailabilityZone");
}
if (isOnDemandReservation && !gpuAvailabilityZone) {
    throw new Error("gpuCapacityType=ON_DEMAND_RESERVATION needs gpuAvailabilityZone");
}
const gpuReservation = isOnDemandReservation
    ? new aws.ec2.CapacityReservation("gpu-odcr", {
        availabilityZone: gpuAvailabilityZone!,
        instanceType: gpuInstanceType,
        instancePlatform: "Linux/UNIX",
        instanceCount: 1,
        // Only instances that target this reservation by ID may use it.
        instanceMatchCriteria: "targeted",
        endDateType: "unlimited",
    })
    : undefined;
const capacityReservationId: pulumi.Input<string> | undefined =
    gpuReservation?.id ?? config.get("capacityReservationId");

// MIG profile names depend on the card. all-balanced layout per GPU:
//   A100 40GB (p4d):  2x 1g.5gb  + 1x 2g.10gb + 1x 3g.20gb
//   A100 80GB (p4de): 2x 1g.10gb + 1x 2g.20gb + 1x 3g.40gb
//   RTX PRO 6000 96GB (g7e, 1 GPU): 2x 1g.24gb + 1x 2g.48gb — only three slices,
//   so there is no medium training pod on this card.
const g7eProfiles = { small: "1g.24gb", large: "2g.48gb" };
const migProfilesByInstanceType: Record<string, { small: string; medium?: string; large: string }> = {
    "p4d.24xlarge": { small: "1g.5gb", medium: "2g.10gb", large: "3g.20gb" },
    "p4de.24xlarge": { small: "1g.10gb", medium: "2g.20gb", large: "3g.40gb" },
    "g7e.2xlarge": g7eProfiles,
    "g7e.4xlarge": g7eProfiles,
    "g7e.8xlarge": g7eProfiles,
};
const migProfiles = migProfilesByInstanceType[gpuInstanceType];
if (!migProfiles) {
    throw new Error(`no MIG profile mapping for ${gpuInstanceType}`);
}

// Pinned versions — bump here, nowhere else.
const versions = {
    kubernetes: "1.37",
    gpuOperator: "v26.7.2",
    draDriver: "0.5.1",
    kubePrometheusStack: "92.17.0",
    gatewayApi: "v1.7.0",
    inferenceExtension: "v1.6.2",
    agentgateway: "1.7.0",
    llmdRouter: "v1.0.0",
    vllm: "v0.32.0",
    pytorch: "26.10-py3",
};

// The model we serve on each 1g MIG slice: Qwen3-8B with FP8 weights (~9.5GB on
// disk, 8.85GiB in GPU memory). Ungated on Hugging Face, so no token needed.
// Sized for the RTX PRO 6000's 1g.24gb slice; it does not fit an A100 1g.5gb/1g.10gb.
const servedModel = "Qwen/Qwen3-8B-FP8";

// VPC with required EKS subnet tags
const vpc = new awsx.ec2.Vpc("gpu-vpc", {
    enableDnsHostnames: true,
    cidrBlock: "10.0.0.0/16",
    subnetSpecs: [
        {
            type: awsx.ec2.SubnetType.Public,
            tags: {
                [`kubernetes.io/cluster/${clusterName}`]: "shared",
                "kubernetes.io/role/elb": "1",
            },
        },
        {
            type: awsx.ec2.SubnetType.Private,
            tags: {
                [`kubernetes.io/cluster/${clusterName}`]: "shared",
                "kubernetes.io/role/internal-elb": "1",
            },
        },
    ],
    subnetStrategy: "Auto",
});

// EKS cluster without Auto Mode
// We'll use a managed node group for system workloads and a GPU node group for GPU workloads
const cluster = new eks.Cluster("gpu-cluster", {
    name: clusterName,
    vpcId: vpc.vpcId,
    publicSubnetIds: vpc.publicSubnetIds,
    privateSubnetIds: vpc.privateSubnetIds,
    authenticationMode: eks.AuthenticationMode.Api,
    skipDefaultNodeGroup: true,
    version: versions.kubernetes,
});

// IAM role for managed node group
const nodeRole = new aws.iam.Role("system-node-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Action: "sts:AssumeRole",
            Effect: "Allow",
            Principal: {
                Service: "ec2.amazonaws.com",
            },
        }],
    }),
});

// Attach required policies for EKS worker nodes
const nodeRolePolicies = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
];

nodeRolePolicies.forEach((policyArn, index) => {
    const _attachment = new aws.iam.RolePolicyAttachment(`system-node-policy-${index}`, {
        role: nodeRole.name,
        policyArn: policyArn,
    });
});

// System Node Group - m6i.xlarge for system workloads (DRA controller, gateway,
// endpoint picker, Prometheus, Grafana)
const systemNodeGroup = new eks.ManagedNodeGroup("system-nodes", {
    cluster: cluster,
    nodeGroupName: "system-nodes",
    nodeRole: nodeRole,
    instanceTypes: ["m6i.xlarge"],
    capacityType: "ON_DEMAND",
    scalingConfig: {
        desiredSize: 2,
        minSize: 1,
        maxSize: 4,
    },
    labels: {
        "node-role": "system",
    },
    taints: [],
}, { dependsOn: [cluster] });


// GPU Node Group - p4d.24xlarge (8x A100 40GB) by default.
// all-balanced layout = 2x 1g + 1x 2g + 1x 3g per GPU (matches our 4 demo pods)

// Pick the private subnets the GPU node may land in: the pinned AZ (Capacity Block
// or gpuAvailabilityZone), or every AZ that offers the instance type.
const gpuOfferings = aws.ec2.getInstanceTypeOfferingsOutput({
    locationType: "availability-zone",
    filters: [{ name: "instance-type", values: [gpuInstanceType] }],
});
const gpuSubnetIds = pulumi.all([vpc.privateSubnetIds, gpuOfferings.locations]).apply(async ([ids, offeredAzs]) => {
    const wantedAzs = gpuAvailabilityZone ? [gpuAvailabilityZone] : offeredAzs;
    const results = await Promise.all(
        ids.map(async (id) => {
            const s = await aws.ec2.getSubnet({ id });
            return { id, az: s.availabilityZone };
        }),
    );
    const matching = results.filter((s) => wantedAzs.includes(s.az)).map((s) => s.id);
    if (matching.length === 0) {
        throw new Error(`no private subnet in ${wantedAzs.join(", ")}; VPC subnets are in ${results.map((s) => s.az).join(", ")}`);
    }
    return matching;
});

// Launch template for the GPU node. When an MNG uses a Launch Template, disk size
// MUST be defined here (the MNG's diskSize field is ignored / rejected by the EKS API).
const gpuLaunchTemplate = new aws.ec2.LaunchTemplate("gpu-lt", {
    namePrefix: "gpu-lt-",
    // Instance type lives in the launch template (required for CAPACITY_BLOCK,
    // and keeps both modes identical).
    instanceType: gpuInstanceType,
    // Required by AWS to launch instances into an EC2 Capacity Block reservation.
    ...(isCapacityBlock ? {
        instanceMarketOptions: {
            marketType: "capacity-block",
        },
    } : {}),
    // Capacity Blocks and targeted ODCRs both need the node to name the reservation.
    ...(capacityReservationId ? {
        capacityReservationSpecification: {
            capacityReservationTarget: {
                capacityReservationId: capacityReservationId,
            },
        },
    } : {}),
    blockDeviceMappings: [{
        deviceName: "/dev/xvda",
        ebs: {
            // vLLM + PyTorch images are large; leave room for both plus model weights.
            volumeSize: 200,
            volumeType: "gp3",
            deleteOnTermination: "true",
            encrypted: "true",
        },
    }],
});

const gpuNodeGroup = new eks.ManagedNodeGroup("gpu-nodes", {
    cluster: cluster,
    nodeGroupName: "gpu-nodes",
    nodeRole: nodeRole,
    subnetIds: gpuSubnetIds,
    // An ODCR is still plain on-demand capacity as far as EKS is concerned.
    capacityType: isOnDemandReservation ? "ON_DEMAND" : gpuCapacityType,
    launchTemplate: {
        id: gpuLaunchTemplate.id,
        version: gpuLaunchTemplate.latestVersion.apply((v) => v.toString()),
    },
    scalingConfig: {
        desiredSize: 1,
        minSize: 1,
        maxSize: 1,
    },
    amiType: "AL2023_x86_64_NVIDIA",
    labels: {
        "node-role": "gpu",
        "nvidia.com/gpu.present": "true",
        "nvidia.com/mig.config": "all-balanced",
    },
    taints: [{
        key: "nvidia.com/gpu",
        value: "true",
        effect: "NO_SCHEDULE",
    }],
}, { dependsOn: [cluster] });

// CoreDNS - Cluster DNS (latest for EKS 1.37)
const coreDnsAddon = new aws.eks.Addon("coredns", {
    clusterName: cluster.eksCluster.name,
    addonName: "coredns",
    addonVersion: "v1.14.7-eksbuild.22",
    resolveConflictsOnCreate: "OVERWRITE",
    resolveConflictsOnUpdate: "OVERWRITE",
}, { dependsOn: [systemNodeGroup] });

// EKS Pod Identity Agent - For IRSA replacement (modern pod identity)
const podIdentityAddon = new aws.eks.Addon("eks-pod-identity-agent", {
    clusterName: cluster.eksCluster.name,
    addonName: "eks-pod-identity-agent",
    addonVersion: "v1.4.1-eksbuild.3",
    resolveConflictsOnCreate: "OVERWRITE",
    resolveConflictsOnUpdate: "OVERWRITE",
}, { dependsOn: [systemNodeGroup] });

// EBS CSI Driver - Required for persistent volumes with EBS
// Creates IAM role with Pod Identity for the ebs-csi-controller-sa service account
const ebsCsiRole = new aws.iam.Role("ebs-csi-role", {
    name: pulumi.interpolate`AmazonEKS_EBS_CSI_DriverRole-${clusterName}`,
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Effect: "Allow",
            Principal: {
                Service: "pods.eks.amazonaws.com",
            },
            Action: [
                "sts:AssumeRole",
                "sts:TagSession",
            ],
        }],
    }),
});

const ebsCsiPolicyAttachment = new aws.iam.RolePolicyAttachment("ebs-csi-policy-attachment", {
    role: ebsCsiRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy",
});

const ebsCsiPodIdentity = new aws.eks.PodIdentityAssociation("ebs-csi-pod-identity", {
    clusterName: cluster.eksCluster.name,
    namespace: "kube-system",
    serviceAccount: "ebs-csi-controller-sa",
    roleArn: ebsCsiRole.arn,
}, { dependsOn: [podIdentityAddon] });

const ebsCsiAddon = new aws.eks.Addon("aws-ebs-csi-driver", {
    clusterName: cluster.eksCluster.name,
    addonName: "aws-ebs-csi-driver",
    addonVersion: "v1.67.2-eksbuild.1",
    resolveConflictsOnCreate: "OVERWRITE",
    resolveConflictsOnUpdate: "OVERWRITE",
}, { dependsOn: [systemNodeGroup, ebsCsiPodIdentity] });

// Kubernetes provider for deploying resources
const k8sProvider = new k8s.Provider("k8s-provider", {
    kubeconfig: cluster.kubeconfigJson,
    enableServerSideApply: true,
});

// Default gp3 StorageClass for EBS volumes
// This is a general-purpose storage class used by all workloads requiring persistent storage
const gp3StorageClass = new k8s.storage.v1.StorageClass("gp3-storage-class", {
    metadata: {
        name: "gp3",
        annotations: {
            "storageclass.kubernetes.io/is-default-class": "true",
        },
    },
    provisioner: "ebs.csi.aws.com",
    volumeBindingMode: "WaitForFirstConsumer",
    reclaimPolicy: "Delete",
    allowVolumeExpansion: true,
    parameters: {
        type: "gp3",
        encrypted: "true",
    },
}, { provider: k8sProvider, dependsOn: [ebsCsiAddon] });

// NVIDIA GPU Operator (ClusterPolicy mode): MIG Manager + DCGM.
// The DRA driver is installed separately below, so the operator's own device
// plugin stays off and we don't use the 26.7 GPUCluster workflow.
const gpuOperatorNamespace = new k8s.core.v1.Namespace("gpu-operator-ns", {
    metadata: { name: "gpu-operator" },
}, { provider: k8sProvider });

const gpuOperator = new k8s.helm.v3.Release("gpu-operator", {
    chart: "gpu-operator",
    namespace: gpuOperatorNamespace.metadata.name,
    repositoryOpts: {
        repo: "https://helm.ngc.nvidia.com/nvidia",
    },
    version: versions.gpuOperator,
    skipAwait: true,
    values: {
        driver: { enabled: false },
        toolkit: { enabled: false },
        devicePlugin: { enabled: false },
        operator: {
            defaultRuntime: "containerd",
        },
        nfd: { enabled: true },
        mig: {
            strategy: "mixed",
        },
        migManager: {
            enabled: true,
            env: [{
                name: "WITH_REBOOT",
                value: "true",
            }],
        },
        dcgmExporter: {
            enabled: true,
            serviceMonitor: { enabled: true },
        },
    },
}, { provider: k8sProvider, dependsOn: [gpuNodeGroup] });

// NVIDIA DRA Driver for GPU allocation — now a Kubernetes SIG project
// (kubernetes-sigs/dra-driver-nvidia-gpu, SemVer since v0.4.0, chart on registry.k8s.io).
// Note: MIG configuration label (nvidia.com/mig.config=all-balanced) is already
// applied via the GPU node group labels, so MIG Manager will automatically
// detect and configure MIG on the GPU nodes
const draDriverNamespace = new k8s.core.v1.Namespace("dra-driver-ns", {
    metadata: { name: "dra-driver-nvidia-gpu" },
}, { provider: k8sProvider });

const draDriver = new k8s.helm.v3.Release("dra-driver-nvidia-gpu", {
    chart: "oci://registry.k8s.io/dra-driver-nvidia/charts/dra-driver-nvidia-gpu",
    namespace: draDriverNamespace.metadata.name,
    version: versions.draDriver,
    skipAwait: true,
    values: {
        nvidiaDriverRoot: "/",
        gpuResourcesEnabledOverride: true,
        resources: {
            gpus: { enabled: true },
            computeDomains: { enabled: false },
        },
        kubeletPlugin: {
            // The plugin only enumerates devices at startup. Hold it off until MIG
            // Manager has applied the layout, otherwise it publishes the whole GPU
            // and no MIG slices. While MIG Manager reconfigures, the label flips
            // to "pending" and the DaemonSet removes the plugin again.
            nodeSelector: { "nvidia.com/mig.config.state": "success" },
            tolerations: [{
                key: "nvidia.com/gpu",
                operator: "Exists",
                effect: "NoSchedule",
            }],
        },
        controller: {
            affinity: {
                nodeAffinity: {
                    requiredDuringSchedulingIgnoredDuringExecution: {
                        nodeSelectorTerms: [{
                            matchExpressions: [{
                                key: "node-role",
                                operator: "In",
                                values: ["system"],
                            }],
                        }],
                    },
                },
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [gpuOperator] });

// DeviceClass for MIG-enabled GPUs
// The NVIDIA DRA driver Helm chart creates mig.nvidia.com DeviceClass automatically
// when resources.gpus.enabled=true (see deviceclass-mig.yaml template)

// Monitoring namespace
const monitoringNamespace = new k8s.core.v1.Namespace("monitoring-ns", {
    metadata: { name: "monitoring" },
}, { provider: k8sProvider });

// Prometheus stack for GPU metrics visualization
const prometheusStack = new k8s.helm.v3.Release("kube-prometheus-stack", {
    chart: "kube-prometheus-stack",
    namespace: monitoringNamespace.metadata.name,
    repositoryOpts: {
        repo: "https://prometheus-community.github.io/helm-charts",
    },
    version: versions.kubePrometheusStack,
    skipAwait: true,
    values: {
        prometheus: {
            prometheusSpec: {
                serviceMonitorSelectorNilUsesHelmValues: false,
                podMonitorSelectorNilUsesHelmValues: false,
                resources: {
                    requests: { cpu: "500m", memory: "1Gi" },
                    limits: { cpu: "1000m", memory: "2Gi" },
                },
            },
        },
        grafana: {
            enabled: true,
            adminPassword: "gpu-monitoring-demo",
            service: { type: "LoadBalancer" },
            dashboardProviders: {
                "dashboardproviders.yaml": {
                    apiVersion: 1,
                    providers: [{
                        name: "default",
                        orgId: 1,
                        folder: "",
                        type: "file",
                        disableDeletion: false,
                        editable: true,
                        options: { path: "/var/lib/grafana/dashboards/default" },
                    }],
                },
            },
            dashboards: {
                default: {
                    // grafana.com dashboard 16640, with the GPU Utilization query
                    // scaled by 100: DCGM reports it as a 0-1 ratio, but the panel
                    // is in percent, so 60% showed as 0.6%.
                    "nvidia-dcgm-mig": {
                        json: fs.readFileSync("dashboards/nvidia-dcgm-mig.json", "utf8"),
                    },
                },
            },
        },
        alertmanager: { enabled: false },
    },
}, { provider: k8sProvider, dependsOn: [gpuOperator, gp3StorageClass] });

// Inference gateway: Gateway API + Gateway API Inference Extension (InferencePool)
// CRDs, agentgateway as the Gateway implementation, and the llm-d router as the
// endpoint picker that chooses a vLLM pod per request.
const gatewayApiCrds = new k8s.yaml.v2.ConfigFile("gateway-api-crds", {
    file: `https://github.com/kubernetes-sigs/gateway-api/releases/download/${versions.gatewayApi}/standard-install.yaml`,
}, { provider: k8sProvider, dependsOn: [systemNodeGroup] });

const inferenceExtensionCrds = new k8s.yaml.v2.ConfigFile("inference-extension-crds", {
    file: `https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases/download/${versions.inferenceExtension}/v1-manifests.yaml`,
}, { provider: k8sProvider, dependsOn: [gatewayApiCrds] });

const agentgatewayNamespace = new k8s.core.v1.Namespace("agentgateway-ns", {
    metadata: { name: "agentgateway-system" },
}, { provider: k8sProvider });

const agentgatewayCrds = new k8s.helm.v3.Release("agentgateway-crds", {
    name: "agentgateway-crds",
    chart: "oci://cr.agentgateway.dev/charts/agentgateway-crds",
    namespace: agentgatewayNamespace.metadata.name,
    version: versions.agentgateway,
}, { provider: k8sProvider, dependsOn: [gatewayApiCrds] });

const agentgateway = new k8s.helm.v3.Release("agentgateway", {
    name: "agentgateway",
    chart: "oci://cr.agentgateway.dev/charts/agentgateway",
    namespace: agentgatewayNamespace.metadata.name,
    version: versions.agentgateway,
    values: {
        inferenceExtension: { enabled: true },
    },
}, { provider: k8sProvider, dependsOn: [agentgatewayCrds, inferenceExtensionCrds] });

// MIG Test Namespace — training pods, vLLM servers, router and gateway all live here
// because a pod can only reference a ResourceClaim in its own namespace.
const migTestNamespace = new k8s.core.v1.Namespace("mig-test-ns", {
    metadata: { name: "mig-test" },
}, { provider: k8sProvider });

// ConfigMap with Fashion-MNIST training scripts
const fashionMnistScripts = new k8s.core.v1.ConfigMap("fashion-mnist-scripts", {
    metadata: {
        name: "fashion-mnist-scripts",
        namespace: migTestNamespace.metadata.name,
    },
    data: {
        "large-training-script.py": `import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models

print("Starting Large Training Workload (${migProfiles.large} MIG)")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'}")

transform = transforms.Compose([
    transforms.Resize(224),
    transforms.Grayscale(3),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])

train_dataset = datasets.FashionMNIST('./data', train=True, download=True, transform=transform)
train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=256, shuffle=True)

model = models.resnet18(weights=None, num_classes=10).cuda()
optimizer = optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

print("Starting training loop...")
for epoch in range(100000):
    model.train()
    total_loss = 0
    correct = 0
    total = 0

    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.cuda(), target.cuda()
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        pred = output.argmax(dim=1)
        correct += pred.eq(target).sum().item()
        total += target.size(0)

    accuracy = 100. * correct / total
    avg_loss = total_loss / len(train_loader)
    print(f"Epoch {epoch+1} | Loss: {avg_loss:.4f} | Accuracy: {accuracy:.2f}% | GPU Mem: {torch.cuda.memory_allocated()/1e9:.2f}GB")

print("Training complete!")
`,
        "medium-training-script.py": `import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms

print("Starting Medium Training Workload (${migProfiles.medium} MIG)")
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"CUDA device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'}")

transform = transforms.Compose([
    transforms.Resize(32),
    transforms.ToTensor(),
    transforms.Normalize((0.5,), (0.5,))
])

train_dataset = datasets.FashionMNIST('./data', train=True, download=True, transform=transform)
train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=128, shuffle=True)

# Custom CNN with 4 conv layers + 2 FC
model = nn.Sequential(
    nn.Conv2d(1, 64, kernel_size=3, padding=1),
    nn.ReLU(),
    nn.MaxPool2d(2),
    nn.Conv2d(64, 128, kernel_size=3, padding=1),
    nn.ReLU(),
    nn.MaxPool2d(2),
    nn.Conv2d(128, 256, kernel_size=3, padding=1),
    nn.ReLU(),
    nn.MaxPool2d(2),
    nn.Conv2d(256, 512, kernel_size=3, padding=1),
    nn.ReLU(),
    nn.AdaptiveAvgPool2d(1),
    nn.Flatten(),
    nn.Linear(512, 256),
    nn.ReLU(),
    nn.Dropout(0.5),
    nn.Linear(256, 10)
).cuda()

optimizer = optim.Adam(model.parameters(), lr=0.001)
criterion = nn.CrossEntropyLoss()

print("Starting training loop...")
for epoch in range(100000):
    model.train()
    total_loss = 0
    correct = 0
    total = 0

    for batch_idx, (data, target) in enumerate(train_loader):
        data, target = data.cuda(), target.cuda()
        optimizer.zero_grad()
        output = model(data)
        loss = criterion(output, target)
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        pred = output.argmax(dim=1)
        correct += pred.eq(target).sum().item()
        total += target.size(0)

    accuracy = 100. * correct / total
    avg_loss = total_loss / len(train_loader)
    print(f"Epoch {epoch+1} | Loss: {avg_loss:.4f} | Accuracy: {accuracy:.2f}% | GPU Mem: {torch.cuda.memory_allocated()/1e9:.2f}GB")

print("Training complete!")
`,
    },
}, { provider: k8sProvider, dependsOn: [migTestNamespace] });

// Shared ResourceClaim with four sub-requests + a matchAttributes constraint.
// The constraint binds all four slices to the SAME parent physical GPU —
// the scheduler resolves the parentUUID at allocation time, so this works
// across redeploys without hardcoding any UUID we can't know upfront.
//
// Each demo pod references this single claim by name and picks its
// sub-request via `containers[].resources.claims[].request`:
//   mig-large   -> large training pod
//   mig-medium  -> medium training pod (only on cards with a medium slice)
//   mig-serve-a -> vLLM replica A
//   mig-serve-b -> vLLM replica B
const migRequest = (name: string, profile: string) => ({
    name,
    exactly: {
        deviceClassName: "mig.nvidia.com",
        count: 1,
        selectors: [{
            cel: {
                expression: `device.attributes["gpu.nvidia.com"].type == "mig" && device.attributes["gpu.nvidia.com"].profile == "${profile}"`,
            },
        }],
    },
});

const migRequests = [
    migRequest("mig-large", migProfiles.large),
    ...(migProfiles.medium ? [migRequest("mig-medium", migProfiles.medium)] : []),
    migRequest("mig-serve-a", migProfiles.small),
    migRequest("mig-serve-b", migProfiles.small),
];

const sharedMigClaim = new k8s.resource.v1.ResourceClaim("shared-mig-claim", {
    metadata: {
        name: "shared-mig-claim",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        devices: {
            requests: migRequests,
            constraints: [{
                matchAttribute: "gpu.nvidia.com/parentUUID",
                requests: migRequests.map((r) => r.name),
            }],
        },
    },
}, { provider: k8sProvider, dependsOn: [draDriver] });

const gpuTolerations = [{
    key: "nvidia.com/gpu",
    operator: "Exists",
    effect: "NoSchedule",
}];
const gpuNodeSelector = {
    "node-role": "gpu",
    "nvidia.com/gpu.present": "true",
};

// Training pod on one sub-request of the shared claim
// GPU workloads only become Ready after MIG Manager has rebooted the node and the
// images (~10GB) are pulled — don't hold the update open for that.
const skipAwait = { "pulumi.com/skipAwait": "true" };

const trainingPod = (name: string, request: string, script: string) => new k8s.core.v1.Pod(name, {
    metadata: {
        name: `${name}-pod`,
        namespace: migTestNamespace.metadata.name,
        annotations: skipAwait,
    },
    spec: {
        restartPolicy: "Never",
        tolerations: gpuTolerations,
        nodeSelector: gpuNodeSelector,
        containers: [{
            name: "training",
            image: `nvcr.io/nvidia/pytorch:${versions.pytorch}`,
            command: ["python", `/scripts/${script}`],
            volumeMounts: [{
                name: "scripts",
                mountPath: "/scripts",
                readOnly: true,
            }],
            resources: {
                claims: [{ name: request, request: request }],
            },
        }],
        resourceClaims: [{
            name: request,
            resourceClaimName: "shared-mig-claim",
        }],
        volumes: [{
            name: "scripts",
            configMap: {
                name: fashionMnistScripts.metadata.name,
            },
        }],
    },
}, { provider: k8sProvider, dependsOn: [sharedMigClaim, fashionMnistScripts] });

// Pod for large training workload (3g MIG)
const migLargeTrainingPod = trainingPod("mig-large-training", "mig-large", "large-training-script.py");

// Pod for medium training workload (2g MIG)
const migMediumTrainingPod = migProfiles.medium
    ? trainingPod("mig-medium-training", "mig-medium", "medium-training-script.py")
    : undefined;

// vLLM model servers — one replica per 1g MIG slice, both on the same physical GPU
// as the training pods. Every replica carries the same pool label so the
// InferencePool (and the endpoint picker) can see both.
const vllmPoolLabels = { "app.kubernetes.io/name": "vllm-qwen3" };

// One Deployment per replica: each one is pinned to its own sub-request of the
// shared claim, which a single Deployment template can't express.
// Recreate, never RollingUpdate: a surge pod would land on the same MIG slice.
const vllmReplica = (name: string, request: string) => new k8s.apps.v1.Deployment(name, {
    metadata: {
        name,
        namespace: migTestNamespace.metadata.name,
        labels: vllmPoolLabels,
        annotations: skipAwait,
    },
    spec: {
        replicas: 1,
        strategy: { type: "Recreate" },
        selector: { matchLabels: { ...vllmPoolLabels, "demo.pulumi.com/replica": name } },
        template: {
            metadata: { labels: { ...vllmPoolLabels, "demo.pulumi.com/replica": name } },
            spec: {
                tolerations: gpuTolerations,
                nodeSelector: gpuNodeSelector,
                containers: [{
                    name: "vllm",
                    image: `docker.io/vllm/vllm-openai:${versions.vllm}`,
                    command: ["vllm", "serve"],
                    args: [
                        servedModel,
                        "--port=8000",
                        // A 1g.24gb slice of the RTX PRO 6000 has 23.6GiB. The FP8 weights
                        // take 8.85GiB; at 0.90 that leaves ~10.5GiB of KV cache, about
                        // 76k tokens: 2.3 full 32k-token requests at once per replica.
                        // No --enforce-eager: CUDA graph capture and kernel warmup add
                        // ~2 min to startup but keep the first live requests fast (eager
                        // mode stalled 30-60s on JIT the first time it saw a new batch shape).
                        "--gpu-memory-utilization=0.90",
                        "--max-model-len=32768",
                        "--disable-access-log-for-endpoints=/health,/metrics,/v1/models",
                    ],
                    ports: [{ name: "http", containerPort: 8000 }],
                    resources: {
                        requests: { cpu: "2", memory: "16Gi" },
                        limits: { memory: "32Gi" },
                        claims: [{ name: "mig-serve", request: request }],
                    },
                    // ~9.5GB download, torch.compile, CUDA graph capture: about 5 min
                    // measured; allow 20 min for a slow Hugging Face download.
                    startupProbe: {
                        httpGet: { path: "/health", port: 8000 },
                        periodSeconds: 10,
                        failureThreshold: 120,
                    },
                    readinessProbe: {
                        httpGet: { path: "/health", port: 8000 },
                        periodSeconds: 5,
                        failureThreshold: 3,
                    },
                    volumeMounts: [{ name: "shm", mountPath: "/dev/shm" }],
                }],
                resourceClaims: [{
                    name: "mig-serve",
                    resourceClaimName: "shared-mig-claim",
                }],
                volumes: [{
                    name: "shm",
                    emptyDir: { medium: "Memory", sizeLimit: "2Gi" },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [sharedMigClaim] });

const vllmReplicaA = vllmReplica("vllm-qwen3-a", "mig-serve-a");
const vllmReplicaB = vllmReplica("vllm-qwen3-b", "mig-serve-b");

// Scrape vLLM metrics (TTFT, tokens/s, KV-cache usage) into Prometheus
const vllmPodMonitor = new prometheusOperator.monitoring.v1.PodMonitor("vllm-pod-monitor", {
    metadata: {
        name: "vllm-qwen3",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        selector: { matchLabels: vllmPoolLabels },
        podMetricsEndpoints: [{ port: "http", path: "/metrics", interval: "10s" }],
    },
}, { provider: k8sProvider, dependsOn: [prometheusStack] });

// The Gateway — agentgateway provisions an Envoy-free proxy plus a LoadBalancer
// Service for it.
const inferenceGateway = new gatewayNetworking.gateway.v1.Gateway("llm-d-inference-gateway", {
    metadata: {
        name: "llm-d-inference-gateway",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        gatewayClassName: "agentgateway",
        listeners: [{
            name: "http",
            port: 80,
            protocol: "HTTP",
            allowedRoutes: { namespaces: { from: "Same" } },
        }],
    },
}, { provider: k8sProvider, dependsOn: [agentgateway] });

// llm-d router (gateway mode): creates the InferencePool over the vLLM pods, the
// endpoint picker (EPP) that scores them per request (load + prefix-cache
// affinity), and the HTTPRoute from the Gateway to the pool.
const llmdRouter = new k8s.helm.v3.Release("qwen3-router", {
    name: "qwen3",
    chart: "oci://ghcr.io/llm-d/charts/llm-d-router-gateway",
    namespace: migTestNamespace.metadata.name,
    version: versions.llmdRouter,
    values: {
        provider: { name: "agentgateway" },
        httpRoute: {
            create: true,
            inferenceGatewayName: "llm-d-inference-gateway",
        },
        router: {
            modelServers: {
                type: "vllm",
                matchLabels: vllmPoolLabels,
                targetPorts: [{ number: 8000 }],
            },
            inferencePool: { failureMode: "FailOpen" },
            epp: {
                // Chart defaults (8 CPU / 8Gi) are sized for big fleets; picking
                // between two vLLM replicas needs a fraction of that.
                resources: {
                    requests: { cpu: "250m", memory: "512Mi" },
                    limits: { memory: "1Gi" },
                },
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [inferenceGateway, inferenceExtensionCrds] });

/*
const migInvalidClaimTemplate = new k8s.resource.v1.ResourceClaimTemplate("mig-invalid-template", {
    metadata: {
        name: "mig-invalid-template",
        namespace: migTestNamespace.metadata.name,
    },
    spec: {
        spec: {
            devices: {
                requests: [{
                    name: "invalid-mig",
                    exactly: {
                        deviceClassName: "mig.nvidia.com",
                        count: 1,
                        selectors: [{
                            cel: {
                                expression: 'device.attributes["gpu.nvidia.com"].type == "mig" && device.attributes["gpu.nvidia.com"].profile == "7g.40gb"',
                            },
                        }],
                    },
                }],
            },
        },
    },
}, { provider: k8sProvider, dependsOn: [draDriver] });
*/

// Export outputs
export const kubeconfig = pulumi.secret(cluster.kubeconfig);
export const clusterNameOutput = cluster.eksCluster.name;
export const grafanaPassword = "gpu-monitoring-demo";
export const vpcId = vpc.vpcId;
export const privateSubnetIds = vpc.privateSubnetIds;
export const publicSubnetIds = vpc.publicSubnetIds;
export const servedModelName = servedModel;
export const gatewayAddressCommand = "kubectl get gateway llm-d-inference-gateway -n mig-test -o jsonpath='{.status.addresses[0].value}'";
