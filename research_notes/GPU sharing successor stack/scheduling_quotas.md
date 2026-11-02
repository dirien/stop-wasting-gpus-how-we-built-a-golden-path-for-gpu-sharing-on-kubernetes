# Kubernetes batch/AI scheduling, admission and quota options (state as of 2026-10-31)

Context: the customer runs DRA + static MIG on EKS with the default kube-scheduler. The deck pitches NVIDIA KAI Scheduler as the next step. Release dates below come from the GitHub Releases API (`gh api repos/<repo>/releases`), queried 2026-10-31.

## Upstream Kubernetes: Workload API, native gang scheduling, DRA for workloads, topology-aware scheduling

### Takeaway
Kubernetes v1.37 (released 2026-08-26) moved Workload/PodGroup APIs, gang scheduling, workload-aware preemption and PodGroup-shared DRA ResourceClaims (`DRAWorkloadResourceClaims`) to **Beta**. All of them are **disabled by default**. Topology-aware workload scheduling, CompositePodGroup and Job integration are Alpha. GA for Workload/PodGroup is targeted for v1.38. Upstream is absorbing the gang, topology and DRA-per-group primitives that third-party schedulers built themselves. Quota and queueing stay out of kube-scheduler and are explicitly left to Kueue.

### Cited Findings
- Timeline of the series: "Kubernetes v1.35: Introducing Workload Aware Scheduling" (2025-12-29), "v1.36: Advancing Workload-Aware Scheduling" (2026-05-13), "v1.37 Sneak Peek" (2026-07-31), v1.37 "Garhwal" release (2026-08-26), and the v1.37 WAS post (2026-09-08). Authors are from Google and Microsoft. — [K8s blog v1.37 WAS](https://kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/); [v1.37 release](https://kubernetes.io/blog/2026/08/26/kubernetes-v1-37-release/)
- Verbatim: "Kubernetes v1.37 delivers a major milestone: Workload / PodGroup APIs and gang scheduling are officially graduating to Beta." Also: "the core Workload and PodGroup APIs—enabling gang scheduling—along with Workload-Aware Preemption (WAP) and shared DRA ResourceClaims for PodGroups, all graduate to Beta." — [K8s blog v1.37 WAS](https://kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/)
- Verbatim: "In Kubernetes v1.37, the `DRAWorkloadResourceClaims` feature gate graduated to Beta" (KEP-5729, DRA ResourceClaim Support for Workloads). A ResourceClaim can be declared on a PodGroup (`spec.resourceClaims` with `resourceClaimTemplateName`) and shared by all member pods instead of being replicated per pod. Behaviour change: with the gate disabled, a pod referencing a PodGroup-matching claim template now gets no claim at all, which prevents DRA resource exhaustion. — [K8s blog v1.37 WAS](https://kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/)
- Verbatim: "Both Beta and Alpha features here are disabled by default and require manual enablement." The `GenericWorkload` gate (which now folds in the former GangScheduling and WorkloadAwarePreemption gates) is Beta and off by default on kube-apiserver, kube-controller-manager and kube-scheduler. — [K8s blog v1.37 WAS](https://kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/)
- APIs are now `scheduling.k8s.io/v1beta1`. v1alpha2 was replaced by v1alpha3, with breaking `disruptionMode` changes: `PodGroup`→`all`, `Pod`→`single`. Early adopters must delete all v1alpha2 objects before upgrading. `minCount` is now mutable, which allows elastic gangs. Only the top-level PodGroup is queued. — [K8s blog v1.37 WAS](https://kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/); [search summary of Fairwinds/others](https://www.fairwinds.com/blog/kubernetes-1.37-is-here-pod-rightsizing-dra-and-gang-scheduling)
- Workload-Aware Preemption (KEP-5710, Beta): v1.37 runs the scheduling algorithm once per preemption attempt instead of re-running it for each victim reprieval. Single-pod preemption now respects the PodGroup `disruptionMode`. The new `preemptionPolicy` on PodGroup (gate `PodGroupPreemptionPolicy`) is Alpha. — [K8s blog v1.37 WAS](https://kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/)
- Alpha in v1.37: CompositePodGroup (KEP-6012, multi-level gang, aimed at JobSet/LWS and disaggregated inference), multi-level Topology-Aware Workload Scheduling (KEP-5732, gate `TopologyAwareWorkloadScheduling`, resolved top-down, e.g. zone then rack), Job controller integration (KEP-5547, gate `WorkloadWithJob`, new `Job.spec.scheduling` that includes `resourceClaims`), and controller integration APIs plus a `workloadbuilder` Go library (KEP-6089). — [K8s blog v1.37 WAS](https://kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/)
- Plan for v1.38: Workload/PodGroup to GA, TAS and CompositePodGroup to Beta, deeper JobSet integration. On Kueue, the post says the near term is to make Kueue "fully WAS-aware" and that "long term, Kueue could use WAS as its engine for gang scheduling and topology-aware placement". KAI and Volcano are not mentioned. — [K8s blog v1.37 WAS](https://kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/)
- Search summaries flagged a conflict: one sentence was read as saying "GA". The full post text (fetched) says Beta, with GA targeted for v1.38. **Treat Beta as correct.** — [K8s blog v1.37 WAS](https://kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/)
- Ecosystem already targets the upstream API. JobSet v0.13.0 (2026-10-12) adds alpha WAS integration behind `JobSetWorkloadAwareSchedulingAPI`, creates an owned Workload/PodGroups, supports shared DRA claims via `spec.scheduling.replicatedJobs[].job.resourceClaims`, and does not implement composite hierarchies yet. LWS v1.0.0 (2026-10-16) fixes native PodGroup gang scheduling with the `kubernetes` scheduler provider, which "remains alpha and opt-in". — [JobSet v0.13.0](https://github.com/kubernetes-sigs/jobset/releases/tag/v0.13.0); [LWS v1.0.0](https://github.com/kubernetes-sigs/lws/releases/tag/v1.0.0)
- DRA core GA date conflict. One tutorial says DRA went stable in v1.34 (2025-08-27). The kubernetes.io page summary in search said "Stable since v1.35". Several 2026 articles tie "DRA GA" to KubeCon EU 2026 (March 2026, Amsterdam), which is probably a Microsoft/NVIDIA announcement framing, not a K8s release. — [dra-tutorial](https://github.com/cloudnativeessentials/dra-tutorial); [K8s DRA docs](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation); [dev.to Microsoft KubeCon 2026](https://dev.to/manoit/microsoft-at-kubecon-2026-dra-ga-ai-runway-and-kubernetes-as-ai-infrastructure-os-1djb)

### Inferences
- On EKS, these Beta/Alpha gates matter only once EKS offers 1.37 and lets users enable non-default gates on the control plane. Managed control planes historically do not expose off-by-default Beta gates, so native gang scheduling is realistically a 1.38+ (GA) story on EKS. (Not verified for EKS specifically.)
- Upstream now covers gang scheduling, group-level preemption, group-shared DRA claims and topology. It does **not** cover multi-tenant quota, borrowing, fair share or queueing. That gap is where Kueue sits, and upstream explicitly positions Kueue as the layer above. Third-party *schedulers* (KAI, Volcano, YuniKorn) compete more directly with upstream than Kueue does.
- Third-party schedulers will be pressured to consume `scheduling.k8s.io` Workload/PodGroup objects. Otherwise JobSet, LWS and Job, which now emit native Workloads, will need per-scheduler adapters again.

### Gaps
- No primary source found for a specific "scheduler preemption of DRA-allocated devices" KEP beyond WAP and KEP-5729. It is unclear whether kube-scheduler preemption can now reclaim DRA devices from lower-priority pods in all cases.
- EKS 1.37 availability date and feature-gate policy were not researched.

## KAI Scheduler (NVIDIA)

### Takeaway
KAI is a CNCF **Sandbox** project (the sandbox vote passed; the issue closed 2026-02-08). It is fast-moving and pre-1.0: the current LTS line is **v0.18.x** (v0.18.0 on 2026-09-23, latest v0.18.6 on 2026-10-15), and v0.16.x LTS gets patches (v0.16.14 on 2026-10-26). It is the richest option for GPU-specific policy: hierarchical queues, DRF, time-based fair share, fractional GPU sharing with HAMi-core isolation, hierarchical topology-aware gangs, and consolidation. DRA support is real but disabled by default and still hardening. It has no shipped integration with the upstream Workload API or with Kueue.

### Cited Findings
- Releases (GitHub API): v0.17.0 2026-08-03, v0.17.1 2026-09-02, v0.17.2 2026-09-16, v0.18.0 2026-09-23, v0.18.1 2026-09-28, v0.18.2 2026-10-01, v0.18.3 2026-10-06, v0.18.4/0.18.5 2026-10-11, v0.18.6 2026-10-15. The v0.16.x LTS line is still patched (v0.16.14 2026-10-26). About 1,624 GitHub stars. — [KAI releases](https://github.com/kai-scheduler/KAI-Scheduler/releases)
- Support policy: even versions are LTS with 1-year support, odd versions are standard releases. v0.18 is LTS (Sep 2026 to Sep 2027, Active), v0.16 LTS is in Maintenance until Jun 2027, v0.14 until Mar 2027, v0.12 until Dec 2026. — [KAI SUPPORT.md](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/SUPPORT.md)
- CNCF status: the README says it is a CNCF sandbox project. cncf/sandbox issue #372 was created 2025-05-08 and closed 2026-02-08 with label `gitvote/passed`. Secondary sources conflict on the date (one says December 2025, others tie it to KubeCon EU March 2026). The GitHub vote record (passed, closed Feb 2026) is the most reliable signal. — [KAI README](https://github.com/kai-scheduler/KAI-Scheduler); [cncf/sandbox #372](https://github.com/cncf/sandbox/issues/372); [kubernetes.ae comparison](https://kubernetes.ae/kueue-vs-volcano-vs-kai-scheduler/)
- Background: KAI is NVIDIA's open-sourced core of the Run:ai scheduler. At KubeCon EU 2026, NVIDIA also donated its GPU DRA driver to CNCF and open-sourced Grove. — [rawkode.academy](https://rawkode.academy/news/nvidia-donates-gpu-dra-driver-to-cncf); [Help Net Security](https://www.helpnetsecurity.com/2026/03/24/nvidia-kubernetes-gpu-driver-community/embed/)
- README feature list: gang scheduling, bin-pack/spread, hierarchical queues with quotas/limits/priorities/over-quota weights, DRF and reclaim, time-based fair share, min-guaranteed runtime, consolidation, elastic workloads, Topology-Aware Scheduling including hierarchical PodGroups (Grove/Dynamo), DRA via ResourceClaims (NVIDIA and AMD GPUs, GB200/GB300 ComputeDomains), GPU sharing, works with Karpenter. KubeRay integration. — [KAI README](https://github.com/kai-scheduler/KAI-Scheduler)
- DRA mechanics: DRA is handled through KAI's Binder controller via a `BindRequest` CR that carries `resourceClaimAllocations`. "DRA is disabled by default", and you enable it with `--feature-gates=DynamicResourceAllocation=true` on both scheduler and binder. The documented example is IMEX/ComputeDomain (GB200 MNNVL). — [KAI docs/dra](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/dra/README.md)
- DRA hardening in recent releases. v0.17.0 adds DRA-backed extended resources (KEP-5004) and fixes an int64 overflow in queue GPU accounting for oversized ResourceClaims. v0.18.0 makes the DRA allocator honour the `PartitionableDevices`/`ConsumableCapacity` gates instead of hardcoded empty features, fixes negative idle GPUs when one DRA claim is shared by several pods, and fails fast when API discovery fails "instead of silently disabling dynamic resource allocation". — [v0.17.0](https://github.com/kai-scheduler/KAI-Scheduler/releases/tag/v0.17.0); [v0.18.0](https://github.com/kai-scheduler/KAI-Scheduler/releases/tag/v0.18.0)
- Other v0.17/v0.18 features: preemption delay (gives the autoscaler a window before evicting), topology level aliases, Karta-based declarative podgrouper, semi-preemptible mode (alpha), and deployment pods grouped into one PodGroup by default (v0.18). — [v0.17.0](https://github.com/kai-scheduler/KAI-Scheduler/releases/tag/v0.17.0); [v0.18.0](https://github.com/kai-scheduler/KAI-Scheduler/releases/tag/v0.18.0)
- GPU sharing modes: `NonMemoryEnforced` (default, no memory isolation), `HamiCore` (CUDA memory isolation via HAMi-core and `kai-resource-isolator`), and `NvFractions` (CDI/NRI). These use annotations (`gpu-fraction`, `gpu-memory`), not DRA. A pod cannot combine a fractional request with a whole `nvidia.com/gpu`. — [KAI gpu-sharing README](https://github.com/kai-scheduler/KAI-Scheduler/blob/main/docs/gpu-sharing/README.md)
- Upstream Workload API support is tracked in KAI issue #1343 (map `workloadRef`/`gang.minCount` to the KAI PodGroup). It is open and labelled blocked/stale. Kueue integration is only a research item (kai-scheduler#68). — [KAI #1343](https://github.com/kai-scheduler/KAI-Scheduler/issues/1343); [search summary](https://github.com/kai-scheduler/KAI-scheduler/releases)

### Inferences
- KAI fits the customer's GPU-sharing story well because it offers quota per team, fair share, and fractional GPUs on top of or alongside MIG. Fractional sharing is annotation-based and separate from the DRA/MIG path, so the deck should not imply KAI fractions are "DRA slices".
- It is pre-1.0, Sandbox-level, ships weekly patches, and has had API churn (BindRequest is `scheduling.run.ai/v1alpha2`, Topology is v1alpha1). An OEM should pin to an LTS line (v0.18) and budget for upgrades.
- KAI replaces kube-scheduler for the pods it manages (`schedulerName`). It overlaps with upstream WAS and does not yet consume the native Workload API.

### Gaps
- No public, verifiable adopter list was retrieved (ADOPTERS.md not fetched).
- Whether KAI queue quota counts MIG DRA devices by counters/profile, or only by device count, was not confirmed.

## Kueue (kubernetes-sigs)

### Takeaway
Kueue is the upstream-aligned admission and quota layer. It does not replace kube-scheduler. The latest release is **v0.20.4** (2026-10-29). v0.20.0 (2026-09-30) required migrating to the **v1beta2** API, and v0.19.x is still patched (v0.19.11, 2026-10-29). Its DRA quota support is the most explicit of any project: ResourceClaimTemplates and DRA-backed extended resources work, MIG-friendly counter-based quota is Beta, and **direct ResourceClaims are not supported**. It has broad integrations (Job, JobSet, LWS, Ray, Kubeflow Trainer, Spark, MultiKueue). Red Hat ships a supported build.

### Cited Findings
- Releases: v0.20.4 and v0.19.11 (both 2026-10-29), v0.20.3/v0.19.10 (2026-10-22), v0.20.0 (2026-09-30), v0.19.0 (2026-07-22). — [Kueue releases](https://github.com/kubernetes-sigs/kueue/releases)
- v0.20.0 breaking change: "Update manifests and API clients to v1beta2 before upgrading. Run the migration script…" — [Kueue v0.20.0](https://github.com/kubernetes-sigs/kueue/releases/tag/v0.20.0)
- DRA requirements: Kubernetes ≥1.34 with `resource.k8s.io/v1`. `KueueDRAIntegration` (renamed from `DynamicResourceAllocation`) has been Beta on the ResourceClaimTemplate path since v0.18. `KueueDRAIntegrationExtendedResource` and `KueueDRAIntegrationPartitionableDevices` have been Beta and on by default since v0.19. `ConsumableCapacity` and `PrioritizedList` (firstAvailable) are Alpha. `KueueDRADeviceFeasibility` has been Alpha since v0.20, and `KueueDRAIntegrationDeviceTaints` is Alpha. — [Kueue DRA docs](https://kueue.sigs.k8s.io/docs/concepts/dynamic_resource_allocation/); [v0.19.0](https://github.com/kubernetes-sigs/kueue/releases/tag/v0.19.0)
- Quota model: `deviceClassMappings` map a DeviceClass to a logical quota resource. Counter-based quota charges `consumesCounters` and is recommended for hardware-partitioned GPUs such as MIG. Capacity-based quota is for time-slicing/MPS. — [Kueue DRA docs](https://kueue.sigs.k8s.io/docs/concepts/dynamic_resource_allocation/)
- Verbatim limitation: "Direct `ResourceClaim` references in the Pod spec are not supported and will result in inadmissible workloads." Others: "Only the `ExactCount` allocation mode is supported"; "No device constraints or config: Device `constraints` (MatchAttribute) and per-request `config` are not supported"; "Device taints do not change quota". firstAvailable is "experimental; do not enable it in production". (The docs still list "No AdminAccess", but v0.20.0 notes say adminAccess requests are now accepted without quota charge, so the docs and release notes are slightly inconsistent.) — [Kueue DRA docs](https://kueue.sigs.k8s.io/docs/concepts/dynamic_resource_allocation/); [v0.20.0](https://github.com/kubernetes-sigs/kueue/releases/tag/v0.20.0)
- TAS + DRA: "TAS may place a Pod on a node without the devices its `ResourceClaimTemplate` requests" unless the alpha `KueueDRADeviceFeasibility` gate is on. That gate requires TAS + `TASNodeFeasibilityForAllLevels` and has limits such as one pod per node and no release on preemption. — [Kueue DRA docs](https://kueue.sigs.k8s.io/docs/concepts/dynamic_resource_allocation/)
- MultiKueue + DRA: supported except firstAvailable. ResourceClaimTemplates and DeviceClasses are not synced to workers. v0.19 added ordered spillover across clusters (e.g. on-prem before cloud). — [Kueue DRA docs](https://kueue.sigs.k8s.io/docs/concepts/dynamic_resource_allocation/); [v0.19.0](https://github.com/kubernetes-sigs/kueue/releases/tag/v0.19.0)
- v0.20 also brings DRA quota fixes (pod overhead, init containers), DeviceTaintRule support, LWS group size immutable while managed (`LWSImmutableGroupSize`, Beta), RayService zero-downtime upgrade via elastic WorkloadSlices, alpha `PreemptionConfig`, `FairSharingRefill`, `DynamicQuotaOrchestration`, and TAS level mutability. — [Kueue v0.20.0](https://github.com/kubernetes-sigs/kueue/releases/tag/v0.20.0)
- Red Hat: Red Hat build of Kueue 1.4.1 is GA, supported on OCP ≥4.18, and based on Kueue 0.18. A Red Hat Developer article from 2026-10-02 describes DRA quota enforcement (borrowing, preemption, fair sharing), mapping DeviceClass to an `nvidia-gpu` quota resource, auto-detecting `DRAPartitionableDevices` for counter (GPU memory) charging, and calls it "production-ready" (vendor claim). — [Red Hat Developer 2026-10-02](https://developers.redhat.com/articles/2026/10/02/smarter-gpu-sharing-how-red-hat-build-of-kueue-works-with-dynamic-resource-allocation); [OCP 4.22 docs](https://docs.redhat.com/en/documentation/openshift_container_platform/4.22/html/ai_workloads/red-hat-build-of-kueue)
- Upstream positions Kueue as the WAS-aware queueing layer, and long term it could use WAS as its gang/TAS engine. — [K8s blog v1.37 WAS](https://kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/)

### Inferences
- Kueue is a drop-in for the customer's current stack because it keeps the default kube-scheduler, so DRA allocation stays upstream. The customer must use ResourceClaimTemplates or DRA extended resources, not pre-created ResourceClaims. If the golden path uses shared direct claims (e.g. one MIG slice shared by pods), that is a blocker.
- Counter-based quota (Beta) can express "team A gets N × 1g.10gb-equivalents" on static MIG. This is the closest match to the existing design.
- Kueue lacks fractional-GPU sharing and GPU-aware bin-packing/consolidation. Those would come from DRA drivers or a separate scheduler.

### Gaps
- KServe-specific Kueue integration status was not verified in this pass.
- EKS-specific Kueue guidance (AWS) was not researched.

## Volcano (CNCF)

### Takeaway
Volcano is still a CNCF **Incubating** project (since April 2022). I found no graduation announcement. The latest release is **v1.16.0** (2026-10-14), which supports Kubernetes 1.36 and adds DRA scoring, a standalone HyperNode topology controller, NamespaceQueues and PodGroup topology anti-affinity. It has a design for DRA DeviceClass quota in the capacity plugin, covering both direct claims and templates, plus vGPU, HAMi and dynamic MIG support.

### Cited Findings
- Releases: v1.16.0 2026-10-14. v1.15.3, v1.14.6 and v1.13.5 were all patched 2026-09-30 (multiple maintained lines). About 6,051 stars. — [Volcano releases](https://github.com/volcano-sh/volcano/releases)
- v1.16.0 highlights: an "independently deployable HyperNode controller" that other schedulers can reuse, PodGroup topology anti-affinity across HyperNode tiers, Unschedulable Job Cache and event-driven wakeups (including DRA events), "Kubernetes 1.36 support, DRA scoring, queue-level quotas per nodegroup", and NamespaceQueues for tenant-local queues. Member pods must use `schedulerName: volcano`. — [Volcano v1.16.0](https://github.com/volcano-sh/volcano/releases/tag/v1.16.0)
- DRA quota design: the capacity plugin reuses Queue `capability/deserved/guarantee` for DRA devices, with whole-device and consumable-capacity quota, and supports "both direct `ResourceClaim` and `ResourceClaimTemplate` usage". This is a design doc; implementation maturity was not verified. — [capacity-dra-support.md](https://github.com/volcano-sh/volcano/blob/master/docs/design/capacity-dra-support.md)
- There is also a `dynamic-mig.md` design. vGPU scheduling and isolation dates back to v1.8.2 (older fact). HAMi integrates with Volcano. — [Volcano design dir](https://github.com/volcano-sh/volcano/tree/master/docs/design); [Volcano v1.8.2](https://volcano.sh/blog/Volcano-1.8.2-release); [CNCF status report](https://castrojo.github.io/jorgepilot/reports/cncf/cncf-project-moving-levels-status)
- CNCF incubation in April 2022. — [CNCF blog 2022](https://cncf.io/blog/2022/04/07/cloud-native-batch-system-volcano-moves-to-the-cncf-incubator)

### Inferences
- Volcano has a better DRA quota story than KAI on paper (it covers direct claims) and is more mature in CNCF terms. It is a full scheduler replacement with its own Job CRD and PodGroup, so it diverges more from upstream WAS. Its community is China-centred (Huawei origins), which may matter for an EU OEM's support or sovereignty preferences (an opinion, not sourced).
- Its official support target is K8s 1.36, so it lags 1.37.

### Gaps
- Whether DRA capacity-plugin quota shipped (and in which version) was not confirmed.
- No 2026 graduation application or status found.

## Apache YuniKorn

### Takeaway
YuniKorn is an active Apache top-level project. v1.10.0 shipped 2026-10-06 with Kubernetes 1.36 support. I found **no documented DRA feature**. Its k8shim embeds the kube-scheduler framework and references ResourceClaim in code, so basic DRA may pass through the framework plugins, but there is no DRA quota accounting I could verify.

### Cited Findings
- Core releases: v1.10.0 2026-10-06, v1.9.0 2026-07-29, v1.8.0 2026-02-04. — [yunikorn-core releases](https://github.com/apache/yunikorn-core/releases)
- 1.10.0 highlight: "Apache YuniKorn 1.10.0 adds support for Kubernetes 1.36" (YUNIKORN-3295). 1.9.0 supported 1.35. — [YuniKorn 1.10.0 announcement](https://github.com/apache/yunikorn-site/blob/master/src/pages/release-announce/1.10.0.md)
- GitHub code search finds `ResourceClaim` in `pkg/cache/context.go` and the plugin framework handle of yunikorn-k8shim. No DRA mention appears in the 1.9/1.10 release highlights. — [yunikorn-k8shim](https://github.com/apache/yunikorn-k8shim)

### Inferences
- YuniKorn is a weak fit: it is Spark/data-centric, has no GPU-sharing or DRA-quota story, and has no WAS alignment.

### Gaps
- No primary YuniKorn DRA documentation was found. Its DRA behaviour is unverified.

## Others: Slurm on K8s, scheduler-plugins, JobSet, Kubeflow Trainer v2, LWS

### Takeaway
These are mostly complements. JobSet, LWS and Trainer v2 are workload APIs that emit pods/PodGroups and integrate with Kueue and now upstream WAS. scheduler-plugins coscheduling is the legacy gang option. Slinky (SchedMD, which a 2026 source says is "now part of NVIDIA") and CoreWeave SUNK are for HPC teams that want Slurm semantics.

### Cited Findings
- JobSet v0.13.0 (2026-10-12): alpha native WAS integration with shared DRA claims (details above). It also adds a TPU multi-slice guide with Kueue. — [JobSet v0.13.0](https://github.com/kubernetes-sigs/jobset/releases/tag/v0.13.0)
- LWS v1.0.0 (2026-10-16) is the first 1.0. It adds DisaggregatedSet sub-roles (disaggregated inference) and native gang scheduling with the `kubernetes` provider, which is still alpha/opt-in. — [LWS v1.0.0](https://github.com/kubernetes-sigs/lws/releases/tag/v1.0.0)
- Kubeflow Trainer v2.3.0 (2026-08-07) is built on JobSet (bumped to v0.12.0), honours `managedBy` (the MultiKueue pattern), and depends on scheduler-plugins. v1.9.4 (2026-08-18) maintains the legacy v1 line. — [Trainer v2.3.0](https://github.com/kubeflow/trainer/releases/tag/v2.3.0)
- scheduler-plugins (coscheduling etc.): v0.35.7 (2026-09-08) tracks K8s 1.35. v0.34.7 (2026-04-20). — [scheduler-plugins releases](https://github.com/kubernetes-sigs/scheduler-plugins/releases)
- Slinky: slurm-operator and slurm-bridge. v1.2.0 was announced July 2026, and the latest tags are v1.2.4 and v1.3.0-rc1 (repo active 2026-10-30). The July 2026 announcement calls SchedMD "now part of NVIDIA". SchedMD's CUG 2026 deck says its products continue with NVIDIA support. — [slurm-users Slinky 1.2.0](https://groups.google.com/g/slurm-users/c/k03FWLE-0g4); [Slurm CUG 2026](https://slurm.schedmd.com/MISC26/Slurm_CUG_2026.pdf); [slurm-operator](https://github.com/SlinkyProject/slurm-operator)
- SUNK is CoreWeave's Slurm-on-Kubernetes, where each slurmd runs as a pod. It is deployed via a CoreWeave representative on CKS. "SUNK Anywhere" was announced with CoreWeave's 2026-08-11 results (secondary source). — [CoreWeave SUNK docs](https://docs.coreweave.com/products/sunk.md); [latent.space wiki](https://latent.space/wiki/coreweave/)
- Run:ai remains NVIDIA's commercial product. KAI is its open-sourced scheduler core. — [rawkode.academy](https://rawkode.academy/news/nvidia-donates-gpu-dra-driver-to-cncf)

### Inferences
- With SchedMD (Slinky) and Run:ai/KAI both under NVIDIA, NVIDIA controls two of the main non-upstream scheduling paths. That is a vendor-concentration consideration for an OEM.
- SUNK is CoreWeave-only, so it is irrelevant on EKS.

### Gaps
- KubeCon EU 2026 / NA 2026 session-level data on scheduler adoption was not collected (NA 2026 is after the cutoff for most recordings).
- Whether SUNK was ever open-sourced is unverified.

## Most future-proof choice; conflicts when running several schedulers

### Takeaway
The most convergence-proof path for an EU OEM on EKS is **default kube-scheduler (with DRA + upstream WAS as it reaches GA in ~1.38) plus Kueue** for multi-team quota, fair share, borrowing and MultiKueue. KAI is worth it if the customer needs GPU-specific capabilities now (fractional GPUs with isolation, time-based fair share, consolidation, hierarchical topology gangs for Dynamo/Grove). Its costs are Sandbox maturity, no Workload API integration yet, and only a researched (not shipped) Kueue integration. Running several schedulers on one cluster is risky unless they own disjoint node pools.

### Cited Findings
- Upstream explicitly plans Kueue as the WAS-aware layer, potentially using WAS as its engine. KAI and Volcano are not part of the upstream roadmap text. — [K8s blog v1.37 WAS](https://kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/)
- A 2026 comparison notes that "every scheduler … is mid-migration from device plugins to DRA — treat DRA paths as supported but still hardening" and that Kueue + KAI is still an open integration. — [kubernetes.ae comparison](https://kubernetes.ae/kueue-vs-volcano-vs-kai-scheduler/) (secondary source)
- KAI's own fixes show multi-writer hazards: a PodGroup was skipped as "not assigned to current scheduler" after another writer modified it, and a negative idle GPU count appeared with shared DRA claims. — [KAI v0.18.0](https://github.com/kai-scheduler/KAI-Scheduler/releases/tag/v0.18.0)
- Kueue's TAS can place pods on nodes lacking DRA devices unless the alpha feasibility gate is on. Its quota is separate from where kube-scheduler actually allocates. — [Kueue DRA docs](https://kueue.sigs.k8s.io/docs/concepts/dynamic_resource_allocation/)

### Inferences
- Conflict points when mixing schedulers:
  - Each scheduler keeps its own cache of DRA allocations and node capacity. Two schedulers allocating from the same ResourceSlices or MIG devices can race, causing double-booking or bind failures. Mitigate with dedicated node pools and taints per scheduler.
  - There are two gang/PodGroup models (upstream `scheduling.k8s.io` vs KAI `scheduling.run.ai` vs Volcano `scheduling.volcano.sh`), and the workload controllers (JobSet, LWS, Job) increasingly emit the upstream one.
  - Quota is double-counted or bypassed if both Kueue and KAI/Volcano queues are active without an integration.
  - Preemption decisions by one scheduler are invisible to the other.
- Recommended framing for the deck: "DRA + MIG today → Kueue for team quota (counter-based MIG quota, Beta) → adopt upstream gang/TAS when GA. Evaluate KAI for GPU-fractioning and fairness, pinned to an LTS release (v0.18), on a dedicated node pool." If the deck keeps "KAI as next step", it should disclose the Sandbox status, the pre-1.0 versioning, and the lack of Workload API/Kueue integration.
- For an EU OEM, the Red Hat build of Kueue (or upstream Kueue) is the option with a commercial support path outside a single GPU vendor. KAI's and Slinky's support paths run through NVIDIA.

### Gaps
- No benchmark or production case study comparing Kueue+kube-scheduler with KAI on MIG/DRA was found.
- No EU automotive OEM public references for any of these schedulers were found.
