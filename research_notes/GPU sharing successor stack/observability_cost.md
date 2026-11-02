# GPU Observability, Utilization Measurement and Cost Allocation on Kubernetes (state as of Oct 31, 2026)

Context: customer baseline is NVIDIA DCGM exporter + kube-prometheus-stack + Grafana MIG dashboard on EKS with DRA + static MIG. Target: chargeback per team at a European automotive OEM.

## DCGM exporter: MIG-level metrics, DRA ResourceClaim attribution, latest versions; GPU Operator observability changes

### Takeaway
dcgm-exporter has become DRA-aware during 2025-2026. The latest release, 4.8.4 (18 Sep, inferred 2026), bundles DCGM 4.6.1. It attributes DRA MIG metrics to pods, refreshes allocation metadata when ResourceSlices change, adds an optional `pod_uid` label and adds compute-instance (`GPU_CI_ID`) scoped MIG fields. There are two caveats. Attribution still goes through kubelet pod-resources, so there is no native `resourceclaim` label. And the GPU Operator 26.3.x did not yet expose the DRA ResourceSlice enrichment.

### Cited Findings
- **Release timeline** (the GitHub release list shows day and month only; years are inferred from the sequence, and 4.4.0-4.5.0 shipped with DCGM 4.4/CUDA 13.0 in Aug 2025) — [dcgm-exporter releases](https://github.com/NVIDIA/dcgm-exporter/releases):
  - **4.4.0-4.5.0 (19 Aug 2025):** DCGM 4.4 and CUDA 13.0. Adds Kubernetes UID support and a distroless image target.
  - **4.4.1-4.5.2 (17 Sep 2025):** emits metrics even with no pods when `kubernetes-enable-{dra,virtual-gpus}` is set.
  - **4.4.1-4.6.0 (13 Oct 2025):** pod-label allow list; `hostPID` added to the Helm chart.
  - **4.4.2-4.7.0 (18 Nov 2025):** tracks unallocated GPUs under DRA; fixes an unbounded label cache.
  - **4.5.1-4.8.0 (28 Jan 2026):** DCGM 4.5.1; GPU bind/unbind monitoring with auto reload (beta); distroless becomes the Helm default.
  - **4.5.3-4.8.2 (07 May 2026):** per-process GPU metrics for time-sharing and MIG; PodMapper informer caching; `/debug/pprof` becomes opt-in.
  - **4.6.0-4.8.3 (15 Jul 2026):** DRA ResourceSlice v1 support; expanded handling of DRA v1 + MIG allocations; pod-label collection on MIG devices; YAML config; per-watch polling intervals; cumulative XID and clock-event totals. **Breaking:** the `Hostname` label is renamed to `hostname`, so dashboards and alerts need updating.
  - **4.8.4 (18 Sep 2026):** DCGM 4.6.1 and go-dcgm v1.4611.2. Collects compute-instance-scoped fields from MIG CIs and adds a `GPU_CI_ID` label. Attributes DRA MIG metrics to pods if the MIG device is visible at startup, and refreshes allocation metadata when ResourceSlices change. Adds an optional `pod_uid` label on DRA-attributed metrics. Prefers NVML MIG profile names. Reuses the kubelet pod-resources gRPC connection, which fixes memory growth. Adds opt-in fabric health and power-limit fields. **Caveat:** live Dynamic MIG changes require an exporter restart.
- **Release naming oddity:** the 18 Sep entry is titled "4.8.4" rather than the usual `<DCGM>-<exporter>` format. Verify the exact image tag before citing it — [dcgm-exporter releases](https://github.com/NVIDIA/dcgm-exporter/releases).
- **How pod attribution works:** NVML/DCGM have no notion of pods. Attribution comes from the kubelet pod-resources socket, which must be hostPath-mounted, and it is enabled with `DCGM_EXPORTER_KUBERNETES=true` or `-k`. If the socket is missing, labels stay empty silently while metrics keep flowing — [Netdata guide](https://www.netdata.cloud/guides/nvidia-gpu/nvidia-gpu-dcgm-exporter-kubernetes/).
- **`--kubernetes-enable-dra` flag:** NVIDIA's CLI reference lists it. I could not read its description text — [NVIDIA dcgm-exporter reference](https://docs.nvidia.com/datacenter/dcgm/latest/reference/command-line-reference/dcgm-exporter.html).
- **Kubelet DRA attribution data:** the kubelet `PodResourcesLister` `DynamicResource` message carries the device name and the claim name, so a claim-to-pod mapping is available via gRPC — [k8s DRA observability](https://kubernetes.io/docs/concepts/resource-management/dynamic-resource-allocation/dra-observability/).
- **GPU Operator 26.3.x observability changes** (from preview builds of the release notes, so version attribution is uncertain) — [GPU Operator release notes (preview)](https://nvidia.github.io/cloud-native-docs/review/pr-471/gpu-operator/latest/release-notes.html):
  - `enablePodLabels`, `enablePodUID` and `podLabelAllowlistRegex` options for adding pod metadata while controlling cardinality.
  - `dcgmExporter.serviceMonitor.scrapeTimeout`, DaemonSet annotations, and hostNetwork for all operands.
  - Kubernetes 1.36 support.
  - Bundled component versions shown include exporter 4.5.3-4.8.2 with DCGM 4.6.0-1 in one build, and 4.5.1-4.8.0 with DCGM 4.5.2-1 in another.
  - **Gap:** "DRA resourceSlices enrichment," which the upstream dcgm-exporter Helm chart exposes, is **not supported through the GPU Operator** in that release.

### Inferences
- The customer should run dcgm-exporter 4.6.0-4.8.3 or newer (ideally 4.8.4) to get DRA v1 ResourceSlice handling plus MIG pod attribution. On 1.34+ clusters running DRA v1 APIs, older builds likely produce empty pod labels for MIG devices handed out by DRA.
- If the customer uses the GPU Operator's bundled exporter rather than the standalone chart, they may lose the ResourceSlice enrichment. Deploying the standalone upstream chart is a plausible workaround (inferred, not tested).
- Under static MIG, the Dynamic-MIG restart caveat does not apply.
- For chargeback, `namespace` + `pod` (+ `pod_uid`) on `DCGM_FI_PROF_*` / `DCGM_FI_DEV_FB_USED` per `GPU_I_ID` is enough to join with kube-state-metrics pod labels for team ownership. No claim label is needed.

### Gaps
- I could not confirm whether dcgm-exporter emits a ResourceClaim name or namespace label; the release notes mention only pod/pod_uid.
- I could not confirm the exact year stamps (the GitHub list omits years), the final (non-preview) GPU Operator 26.x release notes, or whether a GPU Operator release after 26.3 enables ResourceSlice enrichment.

## OpenCost and Kubecost (IBM): GPU cost allocation, MIG/fractional GPU, DRA awareness

### Takeaway
OpenCost has been CNCF Incubating since Oct 31, 2024. Its headline 2026 GPU feature is per-model, per-token inference cost tracking for llm-d/vLLM (v1.121.0, Jul 21, 2026). I found no evidence that OpenCost or Kubecost natively allocates MIG slices or DRA ResourceClaims; both key on `nvidia.com/gpu` requests. Kubecost 3.0 (GA Nov 3, 2025) added DCGM-based GPU monitoring. Among commercial tools, Vantage (Oct 1, 2026) and Red Hat Cost Management (Apr 2026) are the only ones I found with explicit MIG cost allocation.

### Cited Findings
- **OpenCost CNCF status:** OpenCost advanced to CNCF Incubation, announced Oct 31, 2024 — [OpenCost blog](https://opencost.io/blog).
- **OpenCost timeline** — [OpenCost blog](https://opencost.io/blog):
  - MCP server available as of v1.118 (Oct 23, 2025).
  - "KubeModel," a next-generation data model, introduced Dec 9, 2025.
  - v1.121.0 released Jul 21, 2026.
- **OpenCost v1.121.0 inference cost tracking** — [CNCF blog, Aug 5, 2026](https://www.cncf.io/blog/2026/08/05/opencost-1-121-0-first-of-a-kind-kubernetes-inference-cost-tracking/); [OpenCost llm-d post](https://opencost.io/blog/opencost-llmd-inference-cost/):
  - Two cost bases. **Allocation-based** cost covers GPU memory reserved for weights plus a share of the gateway and KV cache. **Usage-based** cost covers only active inference compute and credits KV-cache hits.
  - Inputs are vLLM `vllm:prompt_tokens_total` and `vllm:generation_tokens_total` plus OpenCost's allocation engine.
  - Output metrics carry `model_name`, `model_version`, `namespace`, `cost_basis` and `workload_type` labels, exported to Prometheus and the REST API.
  - Shared overhead is split via SharedLabels.
  - The CNCF post gives a worked example: at 25% utilization, real cost is $4.00 per million tokens rather than $1.00.
- **Unverified PoC claim:** a secondary write-up says the feature was validated on a 109-GPU, 30-model cluster — [DEV Community](https://dev.to/leobaniak/opencost-11210-pins-a-dollar-figure-to-every-model-and-token-on-kubernetes-dh5).
- **No MIG/DRA mention:** the OpenCost blog index mentions neither MIG nor DRA in any 2024-2026 post — [OpenCost blog](https://opencost.io/blog).
- **Kubecost GPU method (2.x docs):** Kubecost reads `nvidia.com/gpu` request, falling back to limit, with 0 if neither is set. AWS vGPU is scaled by a coefficient (default 10 vGPUs per physical GPU). The docs say nothing about time-slicing, `nvidia.com/mig-*`, DCGM utilization or DRA — [IBM Kubecost 2.x docs](https://www.ibm.com/docs/en/SSW0JQG_2.x/architecture/gpu-allocation.html).
- **Kubecost 3.0:** GA Nov 3, 2025, with GPU monitoring via DCGM exporter and GPU-aware right-sizing recommendations — [IBM community blog, Oct 10, 2025](https://community.ibm.com/community/user/blogs/janie-carothers/2025/10/10/ibm-kubecost-30-faster-smarter-and-built-for-scale); [SiliconANGLE, Nov 3, 2025](https://siliconangle.com/?p=718884).
- **Vantage MIG cost accounting (Oct 1, 2026)** — [Vantage blog](https://www.vantage.sh/blog/kubernetes-nvidia-mig-gpu-cost-allocation):
  - Each MIG device counts as a fraction of its physical GPU: the ratio of `nvidia.com/gpu.count` (MIG devices) to the physical GPU count from instance pricing.
  - Unused slices appear as `__idle__`.
  - Requires agent ≥1.3.3 (Helm ≥1.10.0) with `agent.gpu.usageMetrics=true`, and nodes using the single MIG strategy with GFD labels. Supported on AWS and Azure, at no extra charge.
  - **The mixed MIG strategy is not supported** and falls back to full-GPU accounting.
  - The post does not mention DRA.
- **Red Hat Cost Management:** added NVIDIA MIG support in April 2026 — [Red Hat docs](https://docs.redhat.com/en/documentation/cost_management_service/1-latest/html/whats_new_in_cost_management/april_2026). Details not verified.

### Inferences
- A DRA + static MIG cluster defeats request-based tools. DRA pods carry no `nvidia.com/gpu` (or `nvidia.com/mig-*`) extended-resource requests, so Kubecost/OpenCost request parsing would likely allocate 0 GPU to them and push GPU node cost into idle. Vantage's method also relies on device-plugin GFD labels and the single strategy, so it likely doesn't fit DRA either. Both points are inferred and should be verified in a PoC.
- Mixed MIG profiles (e.g., 1g.10gb + 3g.40gb) need weighting by profile (compute slices out of 7 and memory slices out of 8). No tool I found does this natively.
- A pragmatic chargeback design today: take dcgm-exporter per-MIG-instance metrics with pod/namespace labels, join them to the team label, weight by MIG profile slice fraction, and multiply by node hourly cost (OpenCost node pricing). This can be done as Prometheus recording rules, or by feeding OpenCost custom costs / FOCUS-formatted output.

### Gaps
- I found no OpenCost or Kubecost documentation on MIG, fractional GPU or DRA ResourceClaim allocation as of Oct 2026, and no Kubecost 3.x GPU docs page.
- The "OpenCost 2026 roadmap: pod-level GPU cost tracking" claim appears only in secondary aggregators (byteiota) and is not verified.
- I could not determine Red Hat's MIG method.

## Kubernetes-native: KEP-4680 resource health, ResourceClaim.status.devices GA in 1.37, kubelet DRA metrics, kube-state-metrics

### Takeaway
Kubernetes 1.36-1.37 made DRA much more observable:
- **Health** (KEP-4680, `ResourceHealthStatus`): beta and on by default in 1.36, GA targeted for 1.37.
- **ResourceClaim `status.devices`** (`DRAResourceClaimDeviceStatus`): stable in 1.37.
- **ResourcePoolStatusRequest** (KEP-5677): alpha in 1.36, giving available/allocated/unavailable counts per pool. Partition summary is alpha in 1.37.
- **Device metadata:** beta in 1.37.

kube-state-metrics support for ResourceClaim/ResourceSlice could not be confirmed.

### Cited Findings
- **KEP-4680 status:** Beta milestone v1.36, Stable target v1.37 (alpha v1.31) — [KEP-4680](https://www.kubernetes.dev/resources/keps/4680). The DRA extension to it was introduced in 1.34 — [k8s blog, Sep 17, 2025](https://v1-34.docs.kubernetes.io/blog/2025/09/17/kubernetes-v1-34-pods-report-dra-resource-health/).
- **Health monitoring mechanics** — [k8s DRA observability](https://kubernetes.io/docs/concepts/resource-management/dynamic-resource-allocation/dra-observability/):
  - The `ResourceHealthStatus` gate is beta and on by default since v1.36.
  - The driver implements the `DRAResourceHealth` gRPC service.
  - The kubelet writes container `allocatedResourcesStatus` with an optional message.
  - Health goes to Unknown after `health_check_timeout_seconds` (default 30s).
  - Health is not updated after the pod terminates.
- **KEP-4680 GA in 1.37 not confirmed:** the docs page still shows beta, so treat GA as unconfirmed — [k8s DRA observability](https://kubernetes.io/docs/concepts/resource-management/dynamic-resource-allocation/dra-observability/).
- **ResourceClaim `status.devices`:** Stable in v1.37 (first available v1.32), gate `DRAResourceClaimDeviceStatus` — [k8s DRA observability](https://kubernetes.io/docs/concepts/resource-management/dynamic-resource-allocation/dra-observability/).
  - Drivers write driver-specific data, including `shareID` and `networkData`.
  - Writing it needs special RBAC.
  - Accuracy is driver-dependent; the docs warn not to rely on it as the sole source.
- **ResourcePoolStatusRequest** (`resource.k8s.io/v1alpha3`; gate `DRAResourcePoolStatus` on apiserver and controller-manager; alpha since v1.36, off by default): reports available/allocated/unavailable per pool — [k8s DRA observability](https://kubernetes.io/docs/concepts/resource-management/dynamic-resource-allocation/dra-observability/). Related KEP: [KEP-5677](https://www.k8s.dev/resources/keps/5677/).
  - **Partition summary:** Alpha since v1.37; needs `DRAPartitionableDevicesType` + `DRAPartitionableDevices`; uses `partitionTypeAttribute`, e.g. `gpu.example.com/profile`.
  - **Device metadata** (`metadata.resource.k8s.io/v1beta1`): Beta in v1.37, enabled driver-side and off by default in the kubelet plugin library.
  - The page was last modified Jul 9, 2026.
- **Kubelet PodResourcesLister:** a gRPC API rather than Prometheus metrics. `DynamicResource` includes the claim name — [k8s DRA observability](https://kubernetes.io/docs/concepts/resource-management/dynamic-resource-allocation/dra-observability/).
- **DRA driver metrics:** the dra-example-driver gained Prometheus metrics such as `dra_example_driver_prepare_claims_total` — [Mirantis blog](https://t0.mirantis.com/dra-driver-prometheus-metrics/).

### Inferences
- With the partition summary, ResourcePoolStatusRequest could show "how many MIG slices of which profile are free" natively. The NVIDIA DRA driver would have to publish a profile attribute, and the feature is alpha, so it is not EKS-ready (EKS doesn't enable alpha gates).
- Health status gives a native signal for "device unhealthy → pod impacted." It complements DCGM XID alerts.
- For chargeback, `ResourceClaim.status.allocation` plus `reservedFor`, joined to pod and namespace, is the authoritative "who holds which device" record. Without a kube-state-metrics exporter, teams likely need kube-state-metrics custom-resource-state config or a small controller to export it (inferred).

### Gaps
- I could not find kube-state-metrics native metrics for ResourceClaim, ResourceSlice or DeviceClass, or any tracking issue. Searches returned nothing.
- I could not find kubelet/scheduler DRA Prometheus metric names; that section of the docs was not retrievable.
- The Kubernetes 1.37 release date and EKS 1.36/1.37 availability are not verified here.

## OpenTelemetry GPU semantic conventions; AMD device-metrics-exporter; Intel XPU Manager

### Takeaway
OpenTelemetry now has a GPU page in the hardware semconv, but it is still in "Development" status. AMD's exporter (v1.4.x) is the most mature non-NVIDIA option and includes partition activity metrics and pod labels. Intel's Kubernetes GPU telemetry (XPU Manager, GPU Base Operator) is beta or stale.

### Cited Findings
- **OTel GPU semconv** (status: Development) — [OTel semconv GPU](https://opentelemetry.io/docs/specs/semconv/hardware/gpu/):
  - `hw.gpu.utilization`: Gauge, unit 1, with attribute `hw.gpu.task` = decoder/encoder/general.
  - `hw.gpu.memory.utilization` and `hw.gpu.memory.usage`.
  - `hw.gpu.power` in watts.
- **OTel hardware metrics page** — [OTel hardware metrics](https://opentelemetry.io/docs/specs/semconv/system/hardware-metrics).
- **Implementation:** OpenLIT GPU Collector implements these conventions — [OpenLIT](https://docs.openlit.io/latest/gpu-collector/metrics).
- **AMD device-metrics-exporter:**
  - v1.4.0 adds MI35x support and masks unsupported fields — [AMD release notes](https://instinct.docs.amd.com/projects/device-metrics-exporter/en/release-v1.3.1/releasenotes.html).
  - The image is at v1.4.1 in the Red Hat catalog (audit Jan 10, 2026) — [Red Hat catalog](https://catalog.redhat.com/en/software/containers/rocm/device-metrics-exporter/675a3548cb32e5eaeea0b66d).
  - GPU Operator v1.3.1 added per-partition activity metrics `GPU_GFX_BUSY_INSTANTANEOUS`, `GPU_VC_BUSY_INSTANTANEOUS` and `GPU_JPEG_BUSY_INSTANTANEOUS` — [AMD GPU Operator notes](https://instinct.docs.amd.com/projects/gpu-operator/en/release-v1.3.1/releasenotes.html).
  - Pod labels are available via the `ExtraPodLabels` configmap (since v1.3.0).
- **Intel:**
  - XPU Manager (`xpumd`) has a Docker image for exporting Prometheus telemetry in Kubernetes — [Intel XPU Manager](https://intel.com/content/www/us/en/software/xpu-manager.htm). The Docker Hub image was last updated about 2 years ago, so it is probably stale — [Docker Hub](https://hub.docker.com/r/intel/xpumanager).
  - Intel GPU Base Operator can deploy XPU Manager plus Prometheus wiring, but is labeled "beta / non-production" — [intel/gpu-base-operator](https://github.com/intel/gpu-base-operator).

### Inferences
- OTel GPU semconv lacks MIG/partition and Kubernetes-attribution attributes in what I saw. It is not yet a substitute for DCGM metric names in dashboards. Use the OTel Collector Prometheus receiver to bridge DCGM into an OTel pipeline if the OEM standardizes on OTel.
- For a vendor-neutral story, NVIDIA (DCGM), AMD and Intel exporters all exist but use incompatible metric names.

### Gaps
- I could not verify the latest AMD exporter version as of Oct 2026, whether it is DRA-aware (AMD has its own DRA driver), or whether the OTel GPU semconv defines MIG/partition attributes.

## Inference-level metrics and GPU utilization evidence ("why share GPUs")

### Takeaway
The freshest headline stat is Cast AI's 2026 State of Kubernetes Optimization report: about 5% average GPU utilization across roughly 23,000 clusters, with GPU data through April 2026, while the best cluster in the dataset sustained 49%. The "NSDI'24 4-48%" figure could not be verified. The commonly cited academic sources are the Microsoft Philly study (USENIX ATC'19), the ICSE'24 study and MuxFlow.

### Cited Findings
- **Cast AI 2026 report** — [Cast AI report](https://cast.ai/reports/state-of-kubernetes-optimization/); [Cast AI blog](https://cast.ai/blog/2026-state-of-kubernetes-resource-optimization-cpu-at-8-memory-at-20-and-getting-worse/); [Data Center Knowledge](https://www.datacenterknowledge.com/infrastructure/ai-demand-surges-as-billions-in-compute-remain-locked); [HPCwire, Apr 21, 2026](https://www.hpcwire.com/aiwire/2026/04/21/companies-are-racing-to-buy-gpus-many-sit-idle):
  - Covers tens of thousands of clusters on AWS, GCP and Azure (about 23,000 per press coverage). CPU and memory data run Jan-Dec 2025; GPU data runs through Apr 2026.
  - GPU utilization averages about 5%. CPU is 8% and memory 20%.
  - Best case: 136 H200s at 49% sustained.
  - About 2% of GPUs run on Spot, and GPU sharing is "nearly absent in practice."
  - Figures are pre-optimization baselines that include night and weekend dips. Cast AI's Laurent Gil calls about 50% achievable.
  - Vendor bias: Cast AI sells optimization software.
- **Microsoft Philly study (USENIX ATC'19, often mis-cited as NSDI):** 96,260 jobs over 75 days. Median per-minute GPU utilization for 16-GPU jobs was about 34-45% — [arXiv 1901.05758](https://arxiv.org/pdf/1901.05758).
- **Microsoft ICSE 2024:** an empirical study of 400 jobs with average GPU utilization ≤50%, finding root causes such as insufficient GPU computation and interruptions from non-GPU tasks — [MSR ICSE'24 paper](https://www.microsoft.com/en-us/research/uploads/prodnew/2024/01/gpu-util-icse2024.pdf).
- **MuxFlow (2023, ByteDance production):** more than 99% of GPUs in an online-inference cluster ran below 60% GPU/SM utilization — [arXiv 2303.13803](https://arxiv.org/pdf/2303.13803).
- **DeepShare (2026 preprint):** a 219-GPU university cluster averaged 19.8% compute utilization over one week — [arXiv 2609.16682](https://arxiv.org/pdf/2609.16682).
- **vLLM metrics:** vLLM exposes Prometheus `/metrics`, including the histogram `vllm:time_to_first_token_seconds` and the token counters `vllm:prompt_tokens_total` and `vllm:generation_tokens_total` — [vLLM metrics design](https://docs.vllm.ai/en/v0.12.0/design/metrics/); [NVIDIA Dynamo vLLM metrics](https://docs.nvidia.com/dynamo/latest/backends/vllm/prometheus.html).
- **llm-d metrics:** the llm-d EPP exports `llm_d_epp_request_ttft_seconds` (router-side TTFT, per flow and priority). llm-d recommends kube-prometheus-stack, ServiceMonitors and pre-built Grafana dashboards — [llm-d model server metrics](https://llm-d.ai/docs/dev/operations/observability/model-server-metrics); [llm-d metrics](https://llm-d.ai/docs/dev/operations/observability/metrics).

### Inferences
- For the talk: replace or augment older stats with "Cast AI 2026: ~5% average GPU utilization; best observed 49%; GPU sharing nearly absent." Pair it with academic corroboration (Philly ATC'19, ICSE'24) and note the vendor bias.
- Inference SLOs (TTFT p95, tokens/s) and GPU util metrics plug straight into the customer's existing kube-prometheus-stack. Combined with OpenCost 1.121, they yield cost per million tokens per team or model.

### Gaps
- I could not locate or verify the "NSDI'24 4-48% utilization" study. The phrase may conflate several papers. Do not cite it without finding the paper.
- I did not find KServe-specific metric documentation, the Cast AI 2025 report's GPU figure, or the exact metric list for the latest vLLM version.

## FinOps FOCUS GPU/AI cost guidance; Cast AI, Vantage, CloudZero GPU features

### Takeaway
FOCUS 1.3 (Dec 2025) added split-cost-allocation columns for shared resources such as Kubernetes pods. This is the standard hook for publishing per-team GPU splits, but I found no GPU-specific columns. Vantage is the only cloud cost vendor found with documented MIG allocation.

### Cited Findings
- **FOCUS 1.3** (FinOps Foundation, Dec 2025) adds contract commitments, split cost allocation columns (exposing how shared resources such as Kubernetes pods are split), and recency/completeness dimensions — [SD Times](https://sdtimes.com/finops/finops-foundation-releases-focus-1-3-to-address-issues-related-to-splitting-shared-resource-costs/); [Linux Foundation press](https://www.linuxfoundation.org/press/finops-foundation-launches-focus-1.3-to-deepen-cloud-and-saas-billing-transparency-announces-expanded-vendor-support-for-focus-1.2); [FinOps.org](https://finops.org/insights/introducing-focus-1-3/).
- **FOCUS v1.4:** a use case page exists for "identify resources with shared cost allocation." The v1.4 status and date are unverified — [FOCUS use case v1.4](https://focus.finops.org/docs/use-cases/v1-4/identify-resources-with-shared-cost-allocation/).
- **Vendor practice guidance:** agree on a finance-signed shared-cost rule for idle GPU time, and publish showback before chargeback, using drivers such as GPU hours — [Finout blog](https://www.finout.io/blog/how-to-allocate-anthropic-openai-and-gpu-spend-to-teams).
- **Vantage MIG allocation (Oct 1, 2026):** single strategy only, AWS and Azure — [Vantage](https://www.vantage.sh/blog/kubernetes-nvidia-mig-gpu-cost-allocation).
- **Cast AI:** markets GPU sharing and optimization products — [Cast AI GPU sharing](https://cast.ai/gpu-sharing/); [Cast AI fractional GPU blog](https://cast.ai/blog/fractional-gpu-kubernetes/). Feature details not verified.

### Inferences
- For a European automotive OEM, chargeback probably needs auditable, finance-approved idle-cost rules. A pragmatic pattern is:
  - Allocate MIG-slice-hours by profile weight.
  - Report idle slices separately as platform overhead or proportional uplift.
  - Export in FOCUS 1.3 split-allocation format to SAP or the corporate FinOps tool.
- Self-hosted OpenCost may suit data-residency preferences better than SaaS tools (Vantage, Cast AI, CloudZero are US SaaS). This is inferred; check each vendor's EU hosting options.

### Gaps
- I did not research CloudZero's GPU features. The FOCUS 1.3 spec text on GPU or AI usage units (e.g., GPU-hours as `ConsumedUnit`) and FOCUS 1.4 release status are not verified.
