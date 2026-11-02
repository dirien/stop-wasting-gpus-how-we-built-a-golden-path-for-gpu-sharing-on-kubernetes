# GPU Partitioning and Sharing on Kubernetes under DRA (state as of 2026-10-31)

Baseline being compared against: EKS + NVIDIA GPU Operator + NVIDIA DRA driver + static MIG (all-balanced on A100) + one shared ResourceClaim referenced by several pods (one physical GPU/MIG slice).

Method note: release dates and versions below come from the GitHub Releases API (`gh api repos/<repo>/releases`) on 2026-10-31, plus primary docs and blogs. Items from secondary sources or from training knowledge are marked as such.

## NVIDIA DRA driver (kubernetes-sigs/dra-driver-nvidia-gpu): features, GPU support, GPU Operator integration

### Takeaway
The driver is now a Kubernetes SIG project on SemVer. The current release is v0.5.1 (2026-10-12), and GPU Operator v26.7.x deploys it through a new `GPUCluster` CR. Every sharing feature beyond static MIG and the shared claim is still Alpha and off by default: DynamicMIG, ConsumableShares, MPS, NVML health taints, passthrough, and Fabric Manager partitioning. Several of these features cannot be enabled together. Static MIG plus a shared ResourceClaim is still the only fully supported, default-on path.

### Cited Findings
**Release timeline (GitHub Releases API)**
- v25.12.0, 2026-02-12: last CalVer release. Its highlights include "dynamic MIG device management", labelled a demo. That first release required H100 or newer ("A100 isn't supported") and `DRAPartitionableDevices`, and made DynamicMIG mutually exclusive with MPSSupport, NVMLDeviceHealthCheck and PassthroughSupport. — [v25.12.0 release (via newreleases.io)](https://newreleases.io/project/github/kubernetes-sigs/dra-driver-nvidia-gpu/release/v25.12.0); [GitHub release](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/releases/tag/v25.12.0)
- v0.4.0, 2026-05-15: "first release ... as a part of a Kubernetes SIG community". It switches to SemVer. The repo, Go module (`sigs.k8s.io/dra-driver-nvidia-gpu`), image (`registry.k8s.io/dra-driver-nvidia/dra-driver-nvidia-gpu`) and chart (`oci://registry.k8s.io/dra-driver-nvidia/charts/dra-driver-nvidia-gpu`) all moved, and the chart was renamed from `nvidia-dra-driver-gpu` to `dra-driver-nvidia-gpu`. Upgrades need `--version 0.4.0` and `nameOverride=nvidia-dra-driver-gpu` to keep resource names. — [v0.4.0 release](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/releases/tag/v0.4.0)
- v0.4.0 health-taint change: with `NVMLDeviceHealthCheck` (Alpha, default false), unhealthy GPUs "are now retained in the ResourceSlice with a DeviceTaint attached", replacing the v25.12.0 behaviour of removing them. Non-fatal XIDs surface as informational taints, which need K8s ≥1.35. The feature depends on DRADeviceTaints (KEP-5055). New: `DeviceMetadata` (Alpha), IOMMUFD backend for `PassthroughSupport`, `IMEXDaemonsWithDNSNames` (Beta, default true), leader election for the compute-domain controller. PassthroughSupport and NVMLDeviceHealthCheck are mutually exclusive. — [v0.4.0 release](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/releases/tag/v0.4.0)
- v0.4.1, 2026-06-30 (rc.1 on 2026-06-12). AWS EKS docs pin chart 0.4.1 and describe dynamic MIG and time-slicing as Alpha in the NVIDIA DRA driver. — [GitHub releases](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/releases/tag/v0.4.1); [AWS EKS user guide](https://docs.aws.amazon.com/de_de/eks/latest/userguide/device-management-nvidia-dra-device-plugin.md)
- v0.5.0, 2026-08-19, new features:
  - "Support deployment with the NVIDIA GPU Operator v26.7.0"
  - Host-managed IMEX for ComputeDomains
  - Passthrough on Grace and Blackwell
  - Fabric Manager partitioning
  - "Multi-user MPS support"
  - Standard NUMA attributes
  - "System mediated GPU sharing across namespaces using Consumable Capacity feature in DRA"

  New Alpha gates (all default false): `HostManagedIMEXDaemon`, `FabricManagerPartitioning`, `ConsumableShares`, `DRAListTypeAttributes`. Bug fix: "Stop injecting implicit TimeSlicing and reset on unprepare". — [v0.5.0 release](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/releases/tag/v0.5.0)
- v0.5.1, 2026-10-12, patch release:
  - ComputeDomain controller race fix (IMEX node index reassignment)
  - IMEX DNS flood fix
  - `resources.computeDomains.imex.config` Helm value
  - Fix for "certain MIG profiles do not get the CI profile with the most multiprocessors"
  - Disabled the unimplemented DRA resource-health gRPC service, which caused repeated errors on K8s v1.36

  — [v0.5.1 release](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/releases/tag/v0.5.1)
- Conflict: the NGC catalog lists v0.4.1 as "Latest Tag" but also has v0.5.0 and v0.5.1 container pages. — [NGC catalog](https://catalog.ngc.nvidia.com/orgs/nvidia/-/containers/dra-driver-nvidia-gpu/v0.5.1)
- Governance: NVIDIA announced the donation of the driver to the Kubernetes community/CNCF at KubeCon EU Amsterdam (around 2026-03-24). — [NVIDIA blog](https://blogs.nvidia.com/?p=91716); [Canonical blog](https://ubuntu.com/blog/canonical-nvidia-kubecon-2026)

**MIG (static vs DynamicMIG), current docs**
- Static MIG needs no gate and is on by default. Partitions must exist before the driver starts, and "the driver does not modify the node's MIG configuration". New partitions are discovered only after a kubelet-plugin restart. — [MIG guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/mig/)
- `DynamicMIG` is Alpha with default false. It depends on KEP-4815. On K8s 1.34–1.35, enable `DRAPartitionableDevices` on apiserver and scheduler; on 1.36+ it is on by default. Partitions the driver did not create "are destroyed when the GPU kubelet plugin starts". It is mutually exclusive with `PassthroughSupport`, `NVMLDeviceHealthCheck` and `MPSSupport`. Do not run `mig-parted` or `nvidia-smi mig` while the plugin runs. It is not supported on vGPU guests. — [MIG guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/mig/)
- Ampere caveat in the current docs: "Ampere cannot toggle MIG mode without a GPU reset", so MIG mode must be on before the driver starts. With MIG mode on plus DynamicMIG, only MIG partitions are advertised, and full-GPU claims (including monitoring and validation claims) cannot land on that GPU. "Hopper and later architectures enable MIG mode on demand." — [MIG guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/mig/)
- "TimeSlicing has no effect on MIG devices". Sharing a MIG device points to MPS, but MPS is incompatible with DynamicMIG. — [MIG guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/mig/)

**ConsumableShares (consumable capacity, KEP-5075)**
- Alpha gate `ConsumableShares` plus Helm `consumableShares` mode: `memory` | `unlimited` | integer N shares | `disabled`. It republishes devices with `allowMultipleAllocations: true`. It needs K8s ≥1.34 with `DRAConsumableCapacity` on all components on 1.34/1.35; on 1.36+ that gate is on by default. It supports the `gpu.nvidia.com` and `mig.nvidia.com` classes, full GPUs and static or dynamic MIG, and not VFIO. — [Consumable capacity guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/consumable-capacity/)
- "Capacity is scheduling accounting, not runtime isolation". A memory request does not cap CUDA memory. MPS is rejected while consumable-capacity mode is active. Claims on an already-prepared shared device must use a matching `GpuConfig`/`MigDeviceConfig`. — [Consumable capacity guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/consumable-capacity/)
- This differs from the customer's model: with time-slicing or MPS, "multiple containers reference a single allocation". With consumable capacity, *independent* claims share a device, so claims can live in different namespaces. — [Consumable capacity guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/consumable-capacity/); [v0.5.0 release](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/releases/tag/v0.5.0)

**GPU Operator integration**
- GPU Operator releases: v26.3.1 (2026-04-18), v26.3.2 (2026-05-29), v26.3.3 (2026-06-25), v26.7.0 (2026-08-21), v26.7.1 (2026-09-23), v26.7.2 (2026-10-14). — [GitHub releases](https://github.com/NVIDIA/gpu-operator/releases)
- v26.7.0 bundles the DRA driver v0.5.0, deployed and managed via a new `GPUCluster` resource that also covers ComputeDomain/MNNVL, DCGM, DCGM Exporter and a DRA validation workload. It requires K8s ≥ v1.34.2, GPU driver ≥580 and a CDI runtime. "A cluster cannot use `GPUCluster` and `ClusterPolicy` at the same time." Under this workflow, workloads "allocate full GPUs and preconfigured MIG devices" through ResourceClaims. v26.7.2 bundles DRA driver v0.5.1 and fixes MPS daemon service-account issues on OpenShift. MIG Manager is v0.15.0 in 26.7.0 and v0.15.1 in 26.7.1. Kubernetes 1.37 is listed as supported in 26.7 post-release docs, and 1.36 was added in 26.3.2. — [GPU Operator 26.7 release notes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.7/release-notes.html)
- v26.3.0 added MIG Manager v0.14.0 with "dynamic MIG config generation" (per-node ConfigMaps), which is a mig-parted feature, not DRA DynamicMIG. It also added GB200 NVL4 support. v26.7.1 has a known issue: an H100 driver upgrade from 595.91.07 to 615.71.09 without a reboot can break MIG reconfiguration. — [GPU Operator 26.7 release notes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.7/release-notes.html)

### Inferences
- The customer's design (static MIG on A100 plus a shared ResourceClaim) is the most conservative supported path and is GA-backed on the upstream side. Moving to ConsumableShares would allow independent, cross-namespace claims on the same MIG slice, but it is Alpha and gives no isolation inside the slice. MIG still provides the hardware isolation.
- The `GPUCluster` CR is a new, mutually exclusive install mode. Migrating from `ClusterPolicy` plus a separately Helm-installed DRA driver to GPU Operator 26.7 `GPUCluster` is a real migration project, not an upgrade.
- DynamicMIG on A100 has conflicting signals. The v25.12.0 notes said A100 was not supported, while the current docs describe Ampere behaviour under DynamicMIG (MIG mode pre-enabled, no full-GPU claims). It may be partly supported in v0.5.x, with caveats. Even if it works, A100 needs MIG mode set before the plugin starts, and the driver destroys foreign partitions, so a node switching from static to dynamic MIG must be drained.
- DynamicMIG excludes the NVML health taints and MPS, so a node can have dynamic MIG or health-taint auto-remediation, not both (as of v0.5.1).

### Gaps
- No official per-gate status table was retrieved for `TimeSlicingSettings` and `MPSSupport`. Training knowledge: both have been Alpha since the 2025 releases; AWS docs call time-slicing Alpha. The "Feature gates" docs page was not fetched.
- No explicit per-GPU matrix (H100/H200/B200/GB200/B300) for DynamicMIG was found in the docs. The docs only say "Ampere or newer" and that Hopper+ toggles MIG mode on demand.
- Exact GA or 1.0 plans for the NVIDIA DRA driver were not found.
- The GPU Operator release notes page is about 212k characters. Only the first 100k were analysed, so EKS-specific notes may be missing.

## Upstream Kubernetes DRA primitives for sharing (1.34–1.37, plans for 1.38)

### Takeaway
Core sharing primitives are on a clear GA track. Partitionable devices (KEP-4815) and consumable capacity (KEP-5075) are Beta and on by default since 1.36, and both target Stable in v1.38. Device taints, extended-resource mapping and prioritized list are already GA (1.37, 1.37 and 1.36). Shared consumable capacity (KEP-5941) and device compatibility groups (KEP-5963, for example MIG vs vGPU on one GPU) are new Alpha features aimed at 1.38 and 1.37.

### Cited Findings
| KEP | Feature gate | Alpha | Beta | Stable | Source |
|---|---|---|---|---|---|
| 4815 Partitionable Devices | DRAPartitionableDevices | v1.33 | v1.36 | v1.38 (target; status implementable) | [kep.yaml](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/4815-dra-partitionable-devices/kep.yaml) |
| 5075 Consumable Capacity | DRAConsumableCapacity | v1.34 | v1.36 | v1.38 (target) | [kep.yaml](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/5075-dra-consumable-capacity/kep.yaml) |
| 5941 Shared Consumable Capacity | DRASharedConsumableCapacity | v1.38 (target) | v1.39 | v1.40 | [kep.yaml](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/5941-dra-shared-consumable-capacity/kep.yaml) |
| 5055 Device taints/tolerations | DRADeviceTaints, DRADeviceTaintRules | v1.33 | v1.36 | v1.37 (implemented) | [kep.yaml](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/5055-dra-device-taints-and-tolerations/kep.yaml) |
| 5004 Extended Resource mapping | DRAExtendedResource | v1.34 (kep.yaml) | v1.36 | v1.37 (implemented) | [kep.yaml](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/5004-dra-extended-resource/kep.yaml) |
| 4816 Prioritized List | DRAPrioritizedList | v1.33 | v1.34 | v1.36 | [kep.yaml](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/4816-dra-prioritized-list/kep.yaml) |
| 5729 ResourceClaims for Workloads | DRAWorkloadResourceClaims | v1.36 | v1.37 (Beta, **default off**) | n/a | [kep.yaml](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/5729-resourceclaim-support-for-workloads/kep.yaml) |
| 5963 Device Compatibility Groups | DRADeviceCompatibilityGroups | v1.37 | v1.38 (target) | v1.39 | [kep.yaml](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/5963-device-compatibility-groups/kep.yaml) |

- Conflict on KEP-5004: the 1.37 blog says "Alpha landed in 1.35, Beta in 1.36", but kep.yaml lists alpha as v1.34. — [1.37 DRA blog](https://kubernetes.io/blog/2026/09/03/kubernetes-v1-37-dra-updates/) vs [kep.yaml](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/5004-dra-extended-resource/kep.yaml)
- Kubernetes 1.37 shipped on 2026-08-26 per secondary sources, and the DRA blog post is dated 2026-09-03. GA in 1.37: DRA Extended Resource (an extended resource name on a DeviceClass lets Pods request `example.com/gpu` "with no ResourceClaim needed"), device taints/tolerations with DeviceTaintRule and eviction, ResourceClaim `.status.devices` (KEP-4817), and the standard `resource.kubernetes.io/numaNode` attribute. Beta: DRAWorkloadResourceClaims (default disabled; Workloads/PodGroups can reference claims, removing the 256-pod per-claim reservation cap), Device Attributes Downward API (KEP-5304), and `DRAFractionalCapacityRange` (fractional values in CapacityRequestPolicyRange). Alpha: list-type attributes (2nd alpha), node allocatable resources (KEP-5517), ResourcePoolStatusRequest (KEP-5677), optional node operations (KEP-5945), Derived Attributes via CEL (KEP-6080), Device Compatibility Groups (KEP-5963: "MIG vs vGPU profiles on the same GPU ... scheduler rejects incompatible combinations up front"), PreQueueingHints (KEP-6132). — [Kubernetes v1.37: DRA Updates](https://kubernetes.io/blog/2026/09/03/kubernetes-v1-37-dra-updates/); [Fairwinds](https://www.fairwinds.com/blog/kubernetes-1.37-is-here-pod-rightsizing-dra-and-gang-scheduling); [Qovery](https://www.qovery.com/blog/kubernetes-1-37-eks-dra-device-taints-metrics-api-ga-upgrade-order)
- 1.36 (blog dated 2026-05-07): Prioritized list GA. Beta: extended resource, partitionable devices, device taints, binding conditions, resource health status. New Alpha: ResourceClaims for workloads/PodGroups, node allocatable resources, resource pool status, list-type attributes, deterministic device selection, device metadata. — [Kubernetes v1.36 DRA blog](https://kubernetes.io/blog/2026/05/07/kubernetes-v1-36-dra-136-updates/) (source: [website repo markdown](https://github.com/kubernetes/website/blob/main/content/en/blog/_posts/2026/dra-136-update.md))
- KEP-5941 adds an optional `requestPolicy` to `SharedCounter`, `valueFrom.capacityName` on `ConsumeCounter`, and persisted `consumedCounters` on allocation results, so "related devices can draw request-sized amounts from a shared parent pool". It requires DRAPartitionableDevices and DRAConsumableCapacity. Its motivating examples are SR-IOV VF bandwidth and CPU/memory per package, not GPUs. Alpha was retargeted to v1.38, with an implementation history entry dated 2026-07-21. — [KEP-5941 README](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/5941-dra-shared-consumable-capacity/README.md)
- The 1.37 blog's only statement on 1.38 is: "Expect another ambitious set of DRA features in Kubernetes 1.38." — [1.37 DRA blog](https://kubernetes.io/blog/2026/09/03/kubernetes-v1-37-dra-updates/)

### Inferences
- The customer's "one shared ResourceClaim across several pods" pattern runs into the per-claim reservation limit (256 pods), which KEP-5729 lifts for PodGroups. That is irrelevant at the customer's current scale, but it is the upstream direction for gang-scheduled training.
- Extended-resource mapping going GA (1.37) gives a no-code migration path: legacy `nvidia.com/gpu` pod specs can be served by the DRA driver without the device plugin. That matters for an OEM with many legacy manifests. EKS availability of 1.37 should be checked by the EKS-focused researcher.
- KEP-5941 is a generic accounting primitive. A GPU use, such as MIG-like slices drawing request-sized memory from a parent GPU, is plausible but not stated in the KEP.

### Gaps
- No official Kubernetes v1.38 release date or confirmed 1.38 feature list was found. The kep.yaml "stable: v1.38" values are targets, not shipped facts.
- The partitionable devices and consumable capacity stages in 1.37 were not confirmed in the 1.37 blog, which is silent on them. They are presumably still Beta.

## HAMi

### Takeaway
HAMi became a CNCF **Incubating** project in July 2026; it was previously Sandbox. It remains the broadest multi-vendor *software* GPU-slicing layer, covering NVIDIA, Ascend, Cambricon, Biren, AMD MI300X and others. Its DRA story is fragmented: v2.10.0 (2026-08-21) removed DRA from the main chart and points to a separate Ascend DRA driver. Its core value is still the device-plugin plus scheduler-extender plus HAMi-core (CUDA interception) model.

### Cited Findings
- The CNCF blog of 2026-07-15 says the TOC voted to accept HAMi as Incubating. Maintainers come from dynamia.ai, NVIDIA and independents. The project had 16 releases, with v2.9.0 current at the time. A third-party blog dates acceptance to 2026-07-02 (unconfirmed). — [CNCF blog](https://www.cncf.io/blog/2026/07/15/hami-becomes-a-cncf-incubating-project/); [API Evangelist](https://blogs.apievangelist.com/blogs/hami-2026-07-02-hami-moves-to-cncf-incubating-stage/)
- Releases: v2.8.0 (2026-01-20), v2.8.1–2.8.3 (April–May), v2.9.0 (2026-05-19), v2.10.0 (2026-08-21). — [GitHub releases](https://github.com/Project-HAMi/HAMi/releases)
- v2.10.0:
  - "Remove DRA components from HAMi main chart" (#2038)
  - DRA section points to [Project-HAMi/ascend-dra-driver](https://github.com/Project-HAMi/ascend-dra-driver)
  - "Flexible Mig": MIG instance dynamic allocation and deallocation (#2378)
  - mutex scheduling policy
  - PodGroup/gang support adapting to K8s 1.36+ gang-scheduling gates
  - NUMA-aware vGPU replicas
  - Biren support
  - "AMD Mi300x series: support amd vgpu" (#2290)
  - Ascend 910C vNPU templates
  - HAMi-core built on ubi8

  — [HAMi v2.10.0 release](https://github.com/Project-HAMi/HAMi/releases/tag/v2.10.0)

### Inferences
- HAMi provides what the NVIDIA DRA driver does not: per-container GPU memory caps and compute limits via HAMi-core, on any GPU including A100 without MIG. It does this outside DRA semantics, through device plugin plus scheduler extender. Choosing it today means choosing a non-DRA control plane for slicing, which cuts against the customer's DRA direction.
- Removing DRA from the main chart suggests HAMi's DRA mode is being re-scoped into per-vendor drivers rather than maturing in-tree.

### Gaps
- No verified current status of a HAMi NVIDIA DRA driver ("HAMi-DRA") was found.
- No adoption numbers, such as production users or OEM references, were retrieved.
- Cambricon, Hygon and other vendor coverage is not re-verified for v2.10. Training knowledge lists Cambricon MLU, Hygon DCU, Iluvatar, Moore Threads, Ascend and MetaX.

## Other sharing approaches (vGPU, MPS, Run:ai, KAI, Volcano, gpushare)

### Takeaway
Outside DRA, the NVIDIA ecosystem offers MPS (multi-user MPS since DRA driver v0.5.0) and time-slicing, both Alpha in DRA. KAI Scheduler offers annotation-based fractional GPUs that do not enforce memory in open source. vGPU is a VM-level technology. Few fresh primary sources were found for Run:ai memory swap, Volcano vGPU or aliyun gpushare.

### Cited Findings
- NVIDIA DRA driver v0.5.0 added "Multi-user MPS support" and fixed implicit TimeSlicing injection. GPU Operator v26.7.2 fixed MPS with DRA on OpenShift, and the MPS control daemon now reloads on sharing-config change. — [DRA v0.5.0](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/releases/tag/v0.5.0); [GPU Operator 26.7 notes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.7/release-notes.html)
- KAI Scheduler is very active. Releases v0.18.4–v0.18.6 and v0.16.12–v0.16.14 all shipped in October 2026, and the repo now lives at the `kai-scheduler/KAI-Scheduler` GitHub org (moved from NVIDIA/KAI-Scheduler). — [GitHub releases](https://github.com/kai-scheduler/KAI-Scheduler/releases)
- KAI fractional GPUs use pod annotations (`gpu-fraction` or `gpu-memory` in MiB). The open-source version reportedly does not enforce memory limits; hard isolation is a commercial Run:ai feature. Because the requests sit in annotations, autoscalers cannot see them. — secondary only: [ZenML](https://zenml.io/blog/kai-scheduler-vs-runai), [AWS Builder Center](https://builder.aws.com/content/2zsUDYed1Df7zHHZFc11MRctb6M/fractional-gpu-sharing-on-amazon-eks-using-nvidia-kai-scheduler-and-accelerated-ec2-instances)
- GPU Operator v26.7.0 bundles a vGPU Device Manager config (for example a B300X profile), and the DRA driver's DynamicMIG "is not supported on vGPU guests". — [GPU Operator notes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.7/release-notes.html); [MIG guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/mig/)

### Inferences
- KAI fractional sharing is not DRA-native and has no memory enforcement. HAMi enforces memory but is also not DRA-native. NVIDIA's DRA ConsumableShares does scheduler accounting only. For hard isolation under DRA, MIG is still the only option.
- vGPU is irrelevant on EKS bare-metal-style GPU instances. It needs NVIDIA AI Enterprise licensing and a hypervisor, and EC2 does not expose vGPU to guests for user partitioning.

### Gaps
- Not verified with 2026 primary sources: Run:ai GPU memory swap status, KAI DRA integration details (whether KAI schedules DRA claims natively and how its fractions map to claims), Volcano vGPU (which is based on HAMi-core per training knowledge), and the maintenance status of Alibaba gpushare (largely inactive per training knowledge, unverified).

## Non-NVIDIA DRA drivers (AMD, Intel, Google TPU, AWS Neuron, DRANET/EFA)

### Takeaway
DRA is now multi-vendor in practice. AMD shipped a GA-labelled v1.0.0 DRA driver (2026-05-20) with partition-aware allocation, and its docs describe a dynamic CPX/NPS auto-partition mode. Intel ships separate GPU and Gaudi DRA drivers. Google donated a TPU DRA driver at KubeCon EU 2026. AWS shipped an EFA DRA driver on EKS (2026-05-01), built on DRANET.

### Cited Findings
- AMD `ROCm/k8s-gpu-dra-driver` v1.0.0 (2026-05-20) is the "first official release". It publishes the `gpu.amd.com` DeviceClass and serves `resource.k8s.io/v1` (also v1beta1/v1beta2). It exposes a compute partition profile attribute, and "non-partitionable GPUs (e.g. MI210)" do not advertise one. It needs K8s 1.32+ and the `amdgpu` kernel driver. It has a `deviceClass.create` flag for co-install with the AMD gpu-operator, and the "alpha/experimental flag has been removed". v1.0.1 (2026-07-22) adds a `--feature-gates` mechanism ("No gates ship enabled in this release") and is a required upgrade for amdgpu ≥6.19.14 / release 31.40, where GPUs were not advertised. — [v1.0.0](https://github.com/ROCm/k8s-gpu-dra-driver/releases/tag/v1.0.0); [v1.0.1](https://github.com/ROCm/k8s-gpu-dra-driver/releases/tag/v1.0.1)
- AMD driver attributes doc (main branch): pre-partitioned devices expose `partitionProfile` (for example `spx_nps1`). An `AutoPartition` gate (K8s 1.36+) "decides the partition layout dynamically at claim-prepare time and reconfigures the hardware via `amd-smi`", using `computePartition` spx/dpx/cpx, `memoryPartition` nps1/nps2/nps4, a per-GPU mutex shared counter, and consumable `partitions` capacity (1 for SPX, 2 for DPX, 8 for CPX). Memory-mode conflicts get a `NoExecute` taint `gpu.amd.com/memory-partition-conflict`. The Device Config Manager must not run on those nodes. — [driver-attributes.md](https://github.com/ROCm/k8s-gpu-dra-driver/blob/main/docs/driver-attributes.md)
- HAMi v2.10.0 also added AMD MI300X vGPU support. — [HAMi v2.10.0](https://github.com/Project-HAMi/HAMi/releases/tag/v2.10.0)
- Intel `intel-resource-drivers-for-kubernetes` releases:
  - GPU: gpu-v0.10.1 (2026-04-30), gpu-v0.11.0 (2026-06-10), gpu-v0.12.0 (2026-09-10; image and chart moved to `ghcr.io/intel/intel-gpu-resource-driver`; adds survivability mode and new attributes), gpu-v0.12.1 (2026-09-29)
  - Gaudi: gaudi-v0.7.2 (2026-06-10)
  - QAT: qat-v0.4.3 (2026-04-30)

  — [GitHub releases](https://github.com/intel/intel-resource-drivers-for-kubernetes/releases)
- At KubeCon EU 2026, Google donated the DRA driver for TPUs to the Kubernetes community, alongside NVIDIA's GPU driver donation. Only the Google Cloud blog states this directly. — [Google Cloud blog](https://cloud.google.com/blog/products/containers-kubernetes/kubernetes-device-management-with-dra-dynamic-resource-allocation)
- The AWS EFA DRA driver for EKS was announced 2026-05-01. It is built on upstream DRANET, with topology-aware EFA–accelerator pairing (same PCIe root) and EFA interface sharing across workloads. It is recommended for new deployments on K8s ≥1.34 with managed or self-managed node groups. The EFA device plugin is still recommended with Karpenter and EKS Auto Mode. — [AWS What's New](https://aws.amazon.com/about-aws/whats-new/2026/05/kubernetes-dra-elastic-fabric-adapter/)
- `google/dranet` releases: v1.0.0 (2025-10-24, older fact) and v1.0.1 (2025-12-03); no newer release on GitHub. — [GitHub releases](https://github.com/google/dranet/releases)

### Inferences
- AMD's AutoPartition design (shared counters, consumable capacity and taints for mode conflicts) is the clearest public example of dynamic partitioning built purely on upstream DRA primitives, which makes it architecturally vendor-neutral. It appears on main and may not be in a tagged release yet, because v1.0.1 shipped no gates enabled.
- The EFA DRA driver is directly relevant to multi-node training on EKS (p4d/p5). The Karpenter caveat matters if the OEM uses Karpenter.

### Gaps
- No primary source was found for an AWS Neuron (Trainium/Inferentia) DRA driver.
- Intel Gaudi DRA partitioning or sharing capabilities were not verified. Intel GPU DRA sharing features (for example SR-IOV VFs) were not verified for v0.12.
- The TPU driver's repo location and version were not verified.
- It was not verified whether AMD AutoPartition and MI300X CPX/NPS dynamic support are in a tagged release.

## Future-proofing, vendor neutrality and known gotchas

### Takeaway
The most future-proof, vendor-neutral path is to standardise on upstream DRA primitives: DeviceClasses with CEL selectors, prioritized list, extended-resource mapping, device taints, and partitionable/consumable capacity once they are GA in 1.38. Vendor drivers should be treated as pluggable. For the customer on A100, static MIG plus DRA stays the safe production baseline. Dynamic MIG and consumable shares are opt-in Alpha features to pilot on H100 and newer.

### Cited Findings
- Partitionable devices and consumable capacity are Beta and default-on since 1.36, targeting Stable in 1.38. Taints, extended resources and prioritized list are GA. — [KEP 4815](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/4815-dra-partitionable-devices/kep.yaml); [KEP 5075](https://github.com/kubernetes/enhancements/blob/master/keps/sig-scheduling/5075-dra-consumable-capacity/kep.yaml); [1.37 blog](https://kubernetes.io/blog/2026/09/03/kubernetes-v1-37-dra-updates/)
- Gotchas from primary docs:
  - (a) Ampere/A100 cannot toggle MIG mode without a GPU reset. — [MIG guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/mig/)
  - (b) DynamicMIG destroys partitions it did not create when the plugin starts. — [MIG guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/mig/)
  - (c) Static MIG changes are not seen until the plugin restarts. — [MIG guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/mig/)
  - (d) Do not run mig-parted or nvidia-smi mig on dynamic-MIG nodes. — [MIG guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/mig/)
  - (e) TimeSlicing has no effect on MIG devices. — [MIG guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/mig/)
  - (f) DynamicMIG excludes MPS, NVML health checks and passthrough. — [MIG guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/mig/)
  - (g) Consumable capacity is accounting only, with no isolation, and excludes MPS. — [Consumable capacity guide](https://dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/consumable-capacity/)
  - (h) `GPUCluster` and `ClusterPolicy` cannot coexist. — [GPU Operator notes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.7/release-notes.html)
  - (i) The v0.4.0 chart rename and SemVer change require `--version` and `nameOverride` on upgrade. — [v0.4.0](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/releases/tag/v0.4.0)
  - (j) Before v0.4.0, a reboot could cause "device cannot be reprepared", which needs manual checkpoint removal. — [v0.4.0](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/releases/tag/v0.4.0)
  - (k) Changing IMEX mode with active ComputeDomains needs a drain. — [v0.5.0](https://github.com/kubernetes-sigs/dra-driver-nvidia-gpu/releases/tag/v0.5.0)
  - (l) An H100 driver upgrade without a reboot can break MIG reconfiguration. — [GPU Operator 26.7.1 notes](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/26.7/release-notes.html)
- KEP-5963 (Alpha in 1.37) exists because mixing MIG and vGPU-style partitions on one GPU used to fail late, at node prepare. — [1.37 blog](https://kubernetes.io/blog/2026/09/03/kubernetes-v1-37-dra-updates/)

### Inferences
- **Fit for a European automotive OEM (training plus inference).**
  - Training needs whole GPUs or ComputeDomains, prioritized list across GPU generations, and EFA DRA for multi-node.
  - Inference benefits from MIG slices; an A100 40GB all-balanced layout gives 2×1g.5gb, 1×2g.10gb and 1×3g.20gb per GPU (training knowledge). Consumable shares can pack more inference replicas per slice where isolation is less critical.
  - Regulated or safety-relevant workloads (ISO 26262/TISAX contexts) favour hardware isolation (MIG) over software sharing (time-slicing, MPS, HAMi, KAI fractions). This is an inference, not a cited compliance requirement.
- **Vendor neutrality ranking:**
  1. Upstream DRA APIs plus vendor DRA drivers: NVIDIA (now kubernetes-sigs governed), AMD v1.0, Intel, TPU. This is the most neutral option.
  2. HAMi: CNCF Incubating and multi-vendor, but not DRA-native.
  3. KAI and Run:ai: NVIDIA-centric, with annotation-based fractions.
- **Rough migration path:**
  1. Keep static MIG and the shared claim.
  2. Upgrade to K8s 1.36+ so partitionable and consumable capacity are on by default.
  3. Adopt the DRA driver v0.5.x, optionally via GPU Operator 26.7 `GPUCluster`.
  4. Pilot ConsumableShares for independent inference claims.
  5. Pilot DynamicMIG only on H100/H200/B200 node pools.
  6. Revisit after 1.38 GA of KEP-4815 and KEP-5075.

### Gaps
- No vendor-published guidance was found on MIG reconfiguration without node drain under the DRA driver. The docs imply a plugin restart and destroyed foreign partitions, but no formal drain procedure was found.
- No primary source was found comparing performance or overhead (MIG vs MPS vs HAMi-core) in 2026.
