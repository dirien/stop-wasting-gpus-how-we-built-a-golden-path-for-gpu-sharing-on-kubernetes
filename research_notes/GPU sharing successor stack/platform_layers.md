# Platform and abstraction layers for AI/GPU workloads on Kubernetes (state as of 2026-10-31)

Baseline being replaced or extended: EKS managed node group on an AWS Capacity Block p4d.24xlarge, NVIDIA GPU Operator, NVIDIA DRA driver, static MIG, Pulumi IaC, and a Pulumi policy pack that guards MIG profiles. The customer is a European automotive OEM.

Research budget note: about 20 search and fetch calls were made. Several vendor products (Cast AI, Spot/NetApp, Rafay, ClearML, Anyscale, SkyPilot, dstack, vCluster, OpenShift AI, OpenShift 4.22, GKE Inference Gateway, Gatekeeper) could not be verified this session. They are listed under Gaps, not presented as facts.

## 1. CNCF Kubernetes AI Conformance (Certified Kubernetes AI Platform)

### Takeaway
The program launched at KubeCon NA in November 2025. It had grown to 31 certified offerings by March 24, 2026 (KubeCon EU, Amsterdam). Checklists exist for v1.35, v1.36 and v1.37, and v1.37 starts hybrid automated verification. DRA is not a hard MUST yet: requirements say to use DRA "once supported" and accept either device plugin or DRA. Gang scheduling, accelerator metrics, accelerator-aware cluster autoscaling, an inference gateway, secure accelerator access and a robust AI operator are all MUST.

### Cited Findings
- The program launched at KubeCon + CloudNativeCon NA 2025. A platform must already be Certified Kubernetes (conformant) before it can be AI-conformant — [PR Newswire / CNCF launch](https://www.prnewswire.com/news-releases/cncf-launches-certified-kubernetes-ai-conformance-program-to-standardize-ai-workloads-on-kubernetes-302611517.html); [Layer5 summary](https://layer5.io/company/news/kubecon-2025-cncf-to-standardize-ai-workloads)
- Initial certified participants included Amazon EKS, Google GKE, Microsoft Azure (AKS), Oracle OCI, VMware vSphere Kubernetes Service, CoreWeave, Red Hat OpenShift, Akamai and others — [The New Stack](https://thenewstack.io/kubernetes-gets-an-ai-conformance-program-and-vmware-is-already-on-board/); [Forbes, 2025-11-18](https://www.forbes.com/sites/janakirammsv/2025/11/18/cncf-establishes-standards-for-running-ai-workloads-on-kubernetes/)
- On 2026-03-24 (KubeCon EU Amsterdam) the program went from 18 to 31 certified platforms. Named new additions were **OVHcloud** (the only EU sovereign provider named), SpectroCloud, JD Cloud and China Unicom Cloud. The same update made v1.35 alignment mandatory (including stable In-Place Pod Resize and Workload-Aware Scheduling primitives), added KAR-10 High-Performance Pod-to-Pod Communication, KAR-11 Advanced Inference Ingress and KAR-41 Disaggregated Inference Support, and added agentic-workload validation — [CNCF press release 2026-03-24](https://www.cncf.io/announcements/2026/03/24/cncf-nearly-doubles-certified-kubernetes-ai-platforms/)
- Roadmap: move from self-assessment to automated testing with a "Verify Conformance Bot", and add **Sovereign AI standards** (sandboxing, data privacy) later in 2026 — [CNCF press release](https://www.cncf.io/announcements/2026/03/24/cncf-nearly-doubles-certified-kubernetes-ai-platforms/). No source confirmed a firm date for the bot — [Cloud Native Now](https://cloudnativenow.com/kubecon-cloudnativecon-europe-2026/cncf-nearly-doubles-certified-kubernetes-ai-platforms-adds-agentic-workflow-validation/)
- The GitHub repo cncf/ai-conformance links checklists `AIConformance-1.37.yaml` (latest), `1.36.yaml` and `1.35.yaml`, plus certified-platform directories v1.33 through v1.36. Hybrid (automated plus self-assessed) verification starts with v1.37, with automated tests named for "Secure Accelerator Access" and "Gang Scheduling". Certifications are valid for one year and must be renewed, and CNCF review takes up to about 10 business days — [github.com/cncf/ai-conformance](https://github.com/cncf/ai-conformance)
- The WG AI Conformance is transitioning to a SIG Architecture subproject — [sig-architecture mailing list](https://groups.google.com/a/kubernetes.io/g/sig-architecture/c/11EQ4tkAyz0)
- **v1.36 checklist requirements** — [AIConformance-1.36.yaml](https://raw.githubusercontent.com/cncf/ai-conformance/main/docs/AIConformance-1.36.yaml):
  - MUST: `ai_inference` (Gateway API implementation with weighted splitting and header routing), `gang_scheduling` (e.g. Kueue, Volcano), `cluster_autoscaling` (scale accelerator-typed node groups from pending pods), `pod_autoscaling` (HPA on accelerator pods with custom metrics), `accelerator_metrics` (per-accelerator utilization and memory through a standard endpoint, OTel-aligned), `ai_service_metrics` (Prometheus-format discovery), `secure_accelerator_access` (isolation through device plugin **or DRA** plus runtime), `robust_controller` (a complex AI operator such as Ray or Kubeflow with webhooks and reconciliation)
  - SHOULD: `driver_runtime_management` ("use DRA for verification once supported"), `gpu_sharing` (at least one sharing strategy; hardware partitions schedulable), `virtualized_accelerator` (vGPU, DRA once supported), `advanced_inference_ingress` (Gateway API Inference Extension, LLM-aware routing), `high_performance_networking` (DRA such as DRANET, multi-interface), `disaggregated_inference` (prefill and decode scaling separately)
- Mirantis k0s and k0rdent were certified at v1.35, announced 2026-07-22 — [Mirantis press](https://www.mirantis.com/company/press-center/company-news/mirantis-k0s-and-k0rdent-achieve-cncf-certified-kubernetes-ai-conformance-validating-enterprise-ready-ai-infrastructure-from-cluster-to-fleet/)
- Nutanix NKP 2.18 claims to meet "all twelve requirements". The page shows two dates (2026-02-25 and 2026-08-26), so the timing is unclear — [Nutanix blog](https://www.nutanix.com/blog/nutanix-kubernetes-platform-achieves-cncf-kubernetes-ai-conformance)

### Inferences
- MIG falls under `gpu_sharing`, which is only a SHOULD. So conformance guarantees gang scheduling, metrics and secure access, but not MIG or DRA portability. The customer still has to choose DRA-capable providers on purpose.
- The program is the best vendor-neutral checklist for "is this cloud a viable successor target". EU-relevant certified platforms named in sources: OVHcloud, plus AKS, GKE, EKS, OpenShift, Mirantis, Nutanix and SpectroCloud, which can run on sovereign infrastructure.
- Requirement counts conflict: Nutanix says "twelve" and the v1.36 YAML lists 14 IDs. The count changes by version.

### Gaps
- No full per-version list of certified vendors as of 2026-10-31. The repo directories hold it, but they were not enumerated. STACKIT, Scaleway, IONOS and T-Systems/OTC certification status is unknown.
- The contents of the v1.37 checklist (for example, whether DRA becomes a MUST) were not read.
- No KubeCon NA 2026 (November) announcements were found. That event falls after or around the as-of date, and its coverage was not indexed.
- The "Sovereign AI standards" track has no published requirements yet.

## 2. Managed Kubernetes DRA and GPU support

### Takeaway
DRA core went GA in Kubernetes 1.34. AWS, Azure, Google and Red Hat all support the NVIDIA DRA driver on standard or managed node pools, and none support it on their "fully managed" modes (EKS Auto Mode, GKE Autopilot). On EKS, **static MIG through DRA is the recommended mode** and dynamic MIG is still alpha, which matches the customer's current design. EU sovereign clouds offer GPUs plus managed Kubernetes, but none has documented DRA support.

### Cited Findings
**Upstream and driver**
- The NVIDIA DRA driver moved to **kubernetes-sigs/dra-driver-nvidia-gpu** with semantic versioning starting v0.4.0. The current docs reference v0.4.1 — [NVIDIA GPU Operator docs](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.10/dra-intro-install.html); [DRA driver docs](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/)
- NVIDIA donated the GPU DRA driver and Google donated the TPU DRA driver to the Kubernetes community at KubeCon EU (week of 2026-03-25) — [Google Cloud blog](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-device-management-with-dra-dynamic-resource-allocation)
- Kubernetes v1.37 ("Garhwal") was released 2026-08-26, and the DRA update blog was published 2026-09-03. DRA Extended Resource went alpha in 1.35, beta in 1.36 and **GA in 1.37** — [Kubernetes blog v1.37 DRA](https://kubernetes.io/blog/2026/09/03/kubernetes-v1-37-dra-updates/)

**EKS**
- AWS recommends the NVIDIA DRA driver for new deployments on K8s ≥1.34 on managed node groups, self-managed nodes or Karpenter. It is **not supported on EKS Auto Mode**. Requires AL2023 NVIDIA or Bottlerocket AMIs. Bottlerocket ≥1.63.0 needed to disable the built-in device plugin — [EKS docs: NVIDIA DRA vs device plugin](https://docs.aws.amazon.com/eks/latest/userguide/device-management-nvidia-dra-device-plugin.html)
- In AWS's comparison table, GPU sharing through DRA (dynamic MIG, MPS, time-slicing) is **alpha**, while static MIG, MPS and time-slicing through the device plugin are GA. For MIG, AWS recommends "static configuration with the DRA driver or the device plugin". Feature gates are `DynamicMIG` (cannot combine with `PassthroughSupport`, `NVMLDeviceHealthCheck` or `MPSSupport`) and `TimeSlicingSettings` — [EKS docs](https://docs.aws.amazon.com/eks/latest/userguide/device-management-nvidia-dra-device-plugin.html)
- DRA ComputeDomains (multi-node NVLink) are used for P6e-GB200 UltraServers — [EKS docs](https://docs.aws.amazon.com/eks/latest/userguide/device-management-nvidia-dra-device-plugin.html)
- AWS warns against running the DRA driver and the device plugin on the same node, because that risks silent oversubscription — [EKS device management](https://docs.aws.amazon.com/eks/latest/userguide/device-management.html)
- **EFA DRA driver** was announced in May 2026 and requires K8s ≥1.34. It enables topology-aware GPU and EFA co-allocation — [AWS What's New 2026-05](https://aws.amazon.com/about-aws/whats-new/2026/05/kubernetes-dra-elastic-fabric-adapter/); [EKS EFA docs](https://docs.aws.amazon.com/eks/latest/userguide/device-management-efa.html)

**GKE**
- DRA is supported on Standard GPU and TPU node pools. You disable automatic driver install and the device plugin. **No Autopilot, no node auto-provisioning**, and some sharing (time-sharing) is unavailable — [GKE set-up DRA](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/set-up-dra?authuser=0)
- GKE doc examples still use `resource.k8s.io/v1beta1` and `v1beta2`, and no "GA" label was found for GKE DRA — [GKE deploy DRA workloads](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/deploy-dra-workloads). Unverified.

**AKS**
- The 2026-03-03 AKS blog "Multi-instance GPU with DRA on AKS" uses the GPU Operator (pinned 25.8.1) to configure MIG plus the NVIDIA DRA driver on NDm_A100_v4, with a DeviceClass for MIG devices. Related AKS posts cover DRA for vGPU (A10) and DRANET/RDMA — [AKS blog](https://blog.aks.azure.com/2026/03/03/multi-instance-gpu-with-dra-on-aks); [AKS GPU tag](https://blog.aks.azure.com/tags/gpu)

**OpenShift**
- DRA is **GA in OpenShift 4.21** (based on K8s 1.34), per a Red Hat article dated 2026-03-25. The v1 API is served by default and the feature gate is in the default set. GA capabilities: attribute-based allocation including MIG-slice targeting, prioritized alternatives with fallback, and namespace-controlled admin access. The NVIDIA driver creates `gpu.nvidia.com` and `mig.nvidia.com` DeviceClasses — [Red Hat Developer](https://developers.redhat.com/articles/2026/03/25/dynamic-resource-allocation-goes-ga-red-hat-openshift-421-smarter-gpu)

**EU sovereign clouds**
- Scaleway Kapsule runs GPU nodes through the NVIDIA GPU Operator (L4, L40S, H100, B300). OVHcloud MKS offers H200, H100, A100, L40S, L4 and others. STACKIT SKE sits next to H100, A100 and L40S instances and holds BSI C5 Type 2 and ISO 27001. For IONOS, GPU-backed managed Kubernetes node pools are reportedly **not documented** — [Qovery comparison (secondary, vendor blog)](https://www.qovery.com/blog/migrate-gpu-inference-european-sovereign-cloud-playbook); [Qovery STACKIT/IONOS/OTC](https://www.qovery.com/blog/kubernetes-platform-stackit-ionos-open-telekom-cloud-comparison)
- OVHcloud is CNCF AI-conformance certified (March 2026) — [CNCF](https://www.cncf.io/announcements/2026/03/24/cncf-nearly-doubles-certified-kubernetes-ai-platforms/)
- The AWS European Sovereign Cloud launched in January 2026 (first region in Brandenburg, Germany, with Local Zones planned for BE, NL and PT) — [Business Wire 2026-01-14](https://www.businesswire.com/news/home/20260114444935/en/AWS-Launches-AWS-European-Sovereign-Cloud-and-Announces-Expansion-Across-Europe). The only confirmed GPU family there is **G6 (NVIDIA L4)**, from 2026-05-07 — [AWS What's New](https://aws.amazon.com/about-aws/whats-new/2026/05/amazon-ec2-g6-aws-european-sovereign-cloud/). No evidence of P4d, P5 or Capacity Blocks in the sovereign region.

### Inferences
- The customer's design (managed node group, static MIG through the DRA driver) lines up with AWS's own recommended path. Moving to dynamic MIG would mean adopting an alpha feature.
- L4 GPUs do not support MIG. A move to the AWS European Sovereign Cloud today would therefore lose MIG and need time-slicing or MPS instead. This is a hardware fact from background knowledge, not verified this session.
- Every hyperscaler excludes its most-managed mode (Auto Mode, Autopilot) from DRA. A portable design should assume self-managed GPU node pools plus the upstream kubernetes-sigs driver.
- The upstream `gpu.nvidia.com` and `mig.nvidia.com` DeviceClasses behave the same on EKS, AKS and OpenShift. That makes DeviceClass and ResourceClaimTemplate the portable contract, rather than cloud-specific node labels.

### Gaps
- OpenShift 4.22 DRA changes were not found.
- GKE Inference Gateway GA status and version were not verified.
- Current EKS-supported K8s versions as of Oct 2026 were not verified. Presumably 1.33 to 1.37 standard support, but that is unverified.
- STACKIT, OVHcloud, Scaleway, IONOS and T-Systems/OTC (CCE): no source documents DRA support or K8s ≥1.34 GPU node pools. Ask the vendors directly.
- Whether EKS (with GPU nodes) and Capacity Blocks are available in the AWS European Sovereign Cloud was not confirmed.

## 3. Autoscaling and provisioning with DRA

### Takeaway
Karpenter has **alpha** DRA support (NVIDIA GPU and EFA drivers) behind `settings.enableDRA`. AWS says dynamic provisioning works from Karpenter v1.15 with feature gates, while other sources tie DRA to v1.14 or to static capacity only. Cluster Autoscaler 1.36 added DRA partitionable-device support. For a Capacity Block p4d setup, static node groups avoid this complexity entirely.

### Cited Findings
- Karpenter DRA is **Alpha**. Enable it with `settings.enableDRA: true`, which turns on the `DRANVIDIAGPU` and `DRAEFA` gates and sets `ignoreDRARequests=false`. It needs K8s ≥1.34, and GPU time-slicing through consumable capacity needs ≥1.36. Limitations: no ComputeDomain provisioning; Karpenter only knows DRA metadata for instance types listed in its release; claims can only select pre-launch-known attributes; pods using `nvidia.com/gpu` extended resources are not treated as DRA; `--reuse-values` upgrades can fail. The page does not mention MIG or partitionable devices — [karpenter.sh DRA task](https://karpenter.sh/docs/tasks/dra/)
- AWS: "Karpenter supports DRA with both dynamic and static capacity provisioning as of Karpenter version 1.15, though dynamic provisioning requires enabling Karpenter feature gates" — [EKS docs](https://docs.aws.amazon.com/eks/latest/userguide/device-management-nvidia-dra-device-plugin.html)
- Conflicting: PerfectScale dates Karpenter v1.14 (2026-07-11) as adding DRA (not GA) — [PerfectScale](https://www.perfectscale.io/blog/karpenter-v114-whats-new-how-to-upgrade). An independent EKS analysis says DRA is limited to static capacity with Karpenter — [Konishi blog](https://hidekazu-konishi.com/entry/gang_scheduling_and_dynamic_resource_allocation_on_amazon_eks.html). The AWS doc (v1.15, dynamic plus gates) is the most authoritative and newest.
- endoflife.date lists Karpenter v1.14 as supporting K8s 1.29 to 1.36 — [endoflife.date](https://endoflife.date/karpenter)
- Cluster Autoscaler 1.36.0 added DRA partitionable-devices support (#8559), a `dra_node_template_resources_mismatch` metric, and CapacityQuota CRD support — [kubernetes/autoscaler release](https://github.com/kubernetes/autoscaler/releases/tag/cluster-autoscaler-1.36.0)
- GKE node auto-provisioning does not support DRA — [GKE docs](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/set-up-dra?authuser=0)
- Cast AI positions itself as an extension of the Karpenter ecosystem (vendor blog) — [Cast AI blog](https://cast.ai/blog/karpenter-ecosystem-tools/)

### Inferences
- With Capacity Blocks (fixed, pre-purchased capacity), autoscaler DRA maturity matters little. A static managed node group stays the right choice. DRA-aware autoscaling only becomes relevant for on-demand or spot elastic pools.
- Karpenter is AWS-centric (with an Azure provider). Cluster Autoscaler is the more cloud-portable option and now models partitionable devices, which matters for MIG-on-demand.

### Gaps
- Cast AI and Spot (Spot by NetApp is now owned by Flexera, per background knowledge, unverified) DRA support was not verified.
- Cluster Autoscaler DRA maturity label (alpha or beta) was not found in sources.

## 4. Commercial and OSS AI platforms

### Takeaway
The biggest 2026 shift: on **2026-10-13 NVIDIA open-sourced the full Run:ai platform** (UI, CLI, API, dashboards, scheduler). KAI Scheduler has been Apache-2.0 since April 2025 and is a CNCF Sandbox project. Kubeflow (CNCF incubating) shipped Trainer v2.2 in March 2026 and moved to calendar versioning (26.03).

### Cited Findings
- NVIDIA open-sourced the complete Run:ai platform (UI, CLI, API, dashboards, workload orchestration) in October 2026. The source lives in NVIDIA's DSX AI Factory GitHub org, with an NGC "Community Product" Helm chart — [HPCwire/AIwire 2026-10-13](https://www.hpcwire.com/aiwire/2026/10/13/nvidia-open-sources-full-runai-platform-for-gpu-orchestration/) (page returned 403 on fetch; details from search snippet); [Techstrong.ai](https://techstrong.ai/articles/nvidia-hands-runai-to-the-open-source-community/)
- Components: KAI Scheduler, GPU Fractioning Operator, KAI Resource Management, Workload Map — [Techstrong.ai](https://techstrong.ai/articles/nvidia-hands-runai-to-the-open-source-community/)
- KAI Scheduler has been open source under Apache 2.0 since April 2025 and is a CNCF Sandbox project. Go module listings show v0.9.18 and v0.6.22 published 2026-05-11, and a v0.13.0-rc0 exists — [pkg.go.dev KAI](https://pkg.go.dev/github.com/NVIDIA/KAI-scheduler@v0.13.0-rc0); [Nebius blog](https://nebius.com/blog/posts/nvidia-run-ai-open-source-nebius-applications)
- Nebius is a launch partner hosting open-source Run:ai. Lambda plans first-class support on Lambda Kubernetes Service — [Nebius](https://nebius.com/blog/posts/nvidia-run-ai-open-source-nebius-applications); [Unite.ai](https://www.unite.ai/lambda-readies-open-source-run-ai-scheduler-for-kubernetes-service/)
- vCluster documents a KAI Scheduler integration, which enables per-tenant virtual clusters sharing GPU scheduling — [vCluster docs](https://www.vcluster.com/docs/vcluster/third-party-integrations/scheduler/kai-scheduler)
- Kubeflow Trainer v2.2.0 (changelog dated 2026-03-19, GA announced 2026-03-24) adds JAX and XGBoost runtimes, Flux for HPC, and TrainJob progress and metrics — [Kubeflow blog](https://blog.kubeflow.org/kubeflow-trainer-v2.2-release/); [CHANGELOG](https://github.com/kubeflow/trainer/blob/master/CHANGELOG.md)
- Kubeflow AI Reference Platform 1.11 was released 2025-12-15 with Trainer v2.1 (older fact) — [kubeflow.org 1.11](https://www.kubeflow.org/docs/kubeflow-platform/releases/kubeflow-1.11). A "Kubeflow 26.03" release on 2026-03-22 is listed on [Wikipedia](https://en.wikipedia.org/wiki/Kubeflow) (secondary).
- Kubeflow has been a CNCF incubating project since 2023. A claim that it applied for graduation is **unverified** — [Google OSS blog 2023](https://opensource.googleblog.com/2023/07/kubeflow-joins-cncf-family.html); [byteiota (unverified)](https://byteiota.com/kubeflow-1-11-mlops-gets-a-pip-install-moment/)
- Volcano has an open issue to support DRA extended resources (KEP-5004) in its scheduler, so Volcano's DRA support is incomplete — [volcano-sh/volcano #6193](https://github.com/volcano-sh/volcano/issues/6193)

### Inferences
- Open-source Run:ai removes the main lock-in and licensing objection to Run:ai-style fractional GPU and quota management. However, its GPU Fractioning Operator is a software-sharing alternative that overlaps with MIG and DRA. Check whether it consumes DRA ResourceClaims or bypasses them before adopting it.
- For gang scheduling, which the conformance program requires as a MUST, Kueue (SIG-Scheduling, works with DRA through kube-scheduler) is the most vendor-neutral choice. KAI is the NVIDIA-ecosystem choice.

### Gaps
- Run:ai license per component, DRA compatibility and enterprise support terms after open-sourcing were not verified (the HPCwire fetch was blocked).
- Red Hat OpenShift AI (version and DRA/Kueue integration), Rafay, ClearML, Anyscale, SkyPilot, dstack and vCluster GPU features were **not researched this session**.
- Kubeflow Pipelines and Model Registry 2026 versions were not verified.

## 5. Policy and guardrails for DRA (guarding MIG profiles)

### Takeaway
No source documents ready-made Kyverno or Gatekeeper policies for `ResourceClaim` or MIG. The robust pattern is in-cluster: admin-owned **DeviceClasses** as the allowed MIG catalog, plus CEL-based **ValidatingAdmissionPolicy** on `resource.k8s.io` ResourceClaims and ResourceClaimTemplates, and DRA quota. IaC policy packs such as Pulumi CrossGuard should be a shift-left complement, not the only guard.

### Cited Findings
- The NVIDIA DRA driver auto-creates `gpu.nvidia.com` (full GPU) and `mig.nvidia.com` (MIG slice) DeviceClasses, and DRA supports CEL selection on attributes including MIG profile — [Red Hat Developer](https://developers.redhat.com/articles/2026/03/25/dynamic-resource-allocation-goes-ga-red-hat-openshift-421-smarter-gpu)
- On AKS, the admin-defined DeviceClass pattern is used to constrain MIG requests — [AKS blog](https://blog.aks.azure.com/2026/03/03/multi-instance-gpu-with-dra-on-aks)
- DRA admin access to in-use devices is namespace-controlled (namespace opt-in), which is a built-in guard — [Red Hat Developer](https://developers.redhat.com/articles/2026/03/25/dynamic-resource-allocation-goes-ga-red-hat-openshift-421-smarter-gpu)
- Kyverno can generate ValidatingAdmissionPolicies from ClusterPolicies, test VAPs with its CLI, and report on VAP results. The Kyverno docs found contain no DRA- or ResourceClaim-specific examples — [Kyverno VAP reports](https://kyverno.io/docs/policy-reports/validatingadmissionpolicy-reports/); [Kyverno generate VAPs](https://release-1-11-0.kyverno.io/docs/validatingadmissionpolicy/generate-validating-admission-policies/)
- On EKS, `nvidia.com/mig.config` labels reflect the last *requested* layout, not live GPU state. AWS advises treating Allocatable and nvidia-smi as truth — [EKS docs](https://docs.aws.amazon.com/eks/latest/userguide/device-management-nvidia-dra-device-plugin.html)

### Inferences
- A Pulumi CrossGuard pack only sees resources deployed through Pulumi. ResourceClaims created by users, Kubeflow, KAI or Kueue at runtime bypass it. Admission-time policy (VAP is built in and needs no extra dependency, with Kyverno for reporting and mutation) catches every path. Recommended layering:
  1. Pulumi CrossGuard validates node-group MIG layouts (`mig.config`) and DeviceClass definitions at deploy time.
  2. In-cluster VAP restricts ResourceClaims to approved DeviceClasses and profile attributes per namespace.
  3. ResourceQuota on device classes caps usage.
  4. Kyverno PolicyReports provide audit evidence.
- The facts that VAP has been GA since K8s 1.30 and that ResourceQuota supports per-DeviceClass counts come from background knowledge and were not verified this session.
- With dynamic MIG (alpha), MIG layouts move from node config (IaC-visible) to claim time (runtime-only). That makes in-cluster admission policy mandatory in the future. Static-MIG IaC guards become less relevant.

### Gaps
- No published Kyverno, Gatekeeper or VAP library policies for ResourceClaims or MIG were found.
- The OPA Gatekeeper DRA position was not researched.

## 6. Most future-proof and portable combination

### Takeaway (synthesis, inference-heavy)
The most portable combination targets upstream APIs instead of vendor products:
- K8s ≥1.35 on a CNCF AI-conformant platform (EKS, AKS, GKE, OpenShift, or OVHcloud for EU sovereignty)
- The kubernetes-sigs NVIDIA DRA driver, with the GPU Operator kept for drivers and toolkit
- Static MIG today, with dynamic MIG once it leaves alpha
- Kueue for gang scheduling and quota (or open-source Run:ai/KAI if fractional GPUs and a UI are wanted)
- Cluster Autoscaler or Karpenter only for elastic pools, Capacity-Block or static pools otherwise
- Gateway API Inference Extension for serving
- DCGM exporter plus Prometheus/OTel for metrics
- In-cluster VAP and Kyverno policy on ResourceClaims and DeviceClasses, layered with Pulumi CrossGuard

### Cited Findings
- DRA core is GA (1.34) and the drivers are donated upstream (NVIDIA GPU, Google TPU) — [Google Cloud blog](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-device-management-with-dra-dynamic-resource-allocation); [NVIDIA docs](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/25.10/dra-intro-install.html)
- The conformance MUST list (gang scheduling, accelerator metrics, inference gateway, secure accelerator access, AI operator) defines the portable baseline — [AIConformance-1.36.yaml](https://raw.githubusercontent.com/cncf/ai-conformance/main/docs/AIConformance-1.36.yaml)
- All three hyperscalers plus OpenShift support DRA with the NVIDIA driver on standard node pools, not on Auto Mode or Autopilot — [EKS](https://docs.aws.amazon.com/eks/latest/userguide/device-management-nvidia-dra-device-plugin.html); [GKE](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/set-up-dra?authuser=0); [AKS](https://blog.aks.azure.com/2026/03/03/multi-instance-gpu-with-dra-on-aks); [OpenShift](https://developers.redhat.com/articles/2026/03/25/dynamic-resource-allocation-goes-ga-red-hat-openshift-421-smarter-gpu)

### Inferences
- The customer's current stack is already close to this target. The main gaps are an in-cluster admission guard, a gang-scheduling and quota layer, and an EU-sovereign fallback.
- For data sovereignty, OVHcloud (AI-conformant, H100 and A100 available) and STACKIT (BSI C5) are the most credible EU targets. Both need direct confirmation of K8s ≥1.34 and DRA-driver compatibility. The AWS European Sovereign Cloud currently offers only L4 (G6), which has no MIG.

### Gaps
- No primary-source comparison of sovereign-cloud DRA support exists. Vendor confirmation is needed.
