# Kubernetes-native LLM/ML inference serving and orchestration (state as of Oct 31, 2026)

Context: successor/complement to a customer GPU-sharing platform (EKS + NVIDIA DRA driver + static MIG, workloads = plain PyTorch pods on MIG slices). Talk promise: "run and serve models yourself for latency, cost or control".

Note on dates: several GitHub release pages show only day/month. Years below are inferred from ordering plus the surrounding dated sources (press releases, blog posts) and are marked "(year inferred)" where that applies.

## llm-d: did 1.0 ship, and what is in it?

### Takeaway
Yes. llm-d v1.0.0 shipped on Oct 20, 2026. It is CNCF Sandbox (announced Mar 24, 2026) and is now the reference implementation of the Gateway API Inference Extension. The scheduler (EPP) code has moved into the llm-d repos. 1.0 covers P/D disaggregation via LWS DisaggregatedSet, KV/prefix-cache-aware routing, flow control, router HA and a DRA/DRANET topology guide. It runs on NVIDIA, AMD, Google TPU, Intel XPU and CPU. No source mentions MIG or fractional GPUs.

### Cited Findings
- llm-d 1.0 was announced Oct 20, 2026 by IBM, Red Hat, Google Cloud, CoreWeave and NVIDIA. The project was founded in 2025, is governed by CNCF, and has more than 500 contributors from over 25 organizations. — [IBM Newsroom](https://newsroom.ibm.com/2026-10-20-llm-d-1-0-advances-open,-cost-efficient-ai-inference-for-production-scale)
- New in 1.0: multi-tenant QoS (priority- and fairness-aware flow control), router HA with hot standby, rolling updates, coordinated P/D replica management, a v1 configuration API, a hardened request path, and agent-aware serving (session-aware routing, turn-priority scheduling, native Responses API state). — [IBM Newsroom](https://newsroom.ibm.com/2026-10-20-llm-d-1-0-advances-open,-cost-efficient-ai-inference-for-production-scale)
- Capabilities carried over from earlier releases: prefix-cache and load-aware routing, KV-cache offloading, P/D disaggregation, wide expert parallelism, batch/async inference and hardware heterogeneity. Model servers are vLLM and SGLang. — [IBM Newsroom](https://newsroom.ibm.com/2026-10-20-llm-d-1-0-advances-open,-cost-efficient-ai-inference-for-production-scale)
- Named adopters: JetBrains (production, Junie Lite), DigitalOcean (Serverless Inference, Managed Agents), plus Mistral, Roblox and Cohere. Google Cloud is integrating llm-d 1.0 into GKE for TPU and NVIDIA GPUs. — [IBM Newsroom](https://newsroom.ibm.com/2026-10-20-llm-d-1-0-advances-open,-cost-efficient-ai-inference-for-production-scale)
- Vendor performance claims (unverified): 5–10x cost reduction for context-heavy agentic workloads, 3x output throughput, and IBM Research's 11.5x lower cost with a ~98% prefix-cache hit rate. — [IBM Newsroom](https://newsroom.ibm.com/2026-10-20-llm-d-1-0-advances-open,-cost-efficient-ai-inference-for-production-scale). An independent write-up notes that the release tracker says not every 1.0 goal was met. — [remio.ai](https://www.remio.ai/post/llm-d-1-0-release-brings-kubernetes-inference-into-production-operations)
- Release cadence on GitHub: v1.0.0 on 20 Oct, v0.10.0 on 29 Sep, v0.9.0 on 17 Aug, v0.8.1 on 26 Jun and v0.8.0 on 24 Jun (year inferred 2026). — [GitHub llm-d releases](https://github.com/llm-d/llm-d/releases)
- v1.0.0 components: a `DisaggregatedSet` manages prefill and decode replicas as one unit with lockstep upgrades. `llm-d-router-endpoint-picker` is v1.0.0 (up from v0.11.0), and `llm-d-kv-cache` v1.0.0 has merged into `llm-d-router`. The release bundles GAIE v1.6.2 and LWS v1.0.0, and its vLLM images are v0.31.0. The P/D guide requires LWS ≥ v0.11.1 with `enableDisaggregatedSet=true`. — [GitHub llm-d releases](https://github.com/llm-d/llm-d/releases)
- v1.0.0 includes a topology-aware accelerator guide covering DRA and DRANET. — [GitHub llm-d releases](https://github.com/llm-d/llm-d/releases)
- v1.0.0 image matrix: vLLM on CUDA (NVIDIA), ROCm (AMD), XPU (Intel), TPU and CPU, plus SGLang, TRT-LLM, Atom (AMD), MThreads and RBLN NPU. Gaudi/HPU had an image in v0.8.0 but is missing from the v1.0.0 tables. — [GitHub llm-d releases](https://github.com/llm-d/llm-d/releases)
- CNCF Sandbox announcement dated Mar 24, 2026. llm-d is "a primary implementation of the Kubernetes Gateway API Inference Extension" and uses the EPP for prefix-cache-aware routing. It sits between control planes "like KServe" and engines like vLLM, and it uses LWS for multi-node and wide-EP. Founders (May 2025) were Red Hat, Google Cloud, IBM Research, CoreWeave and NVIDIA. AMD, Cisco, Hugging Face, Intel, Lambda and Mistral AI joined later. The stated vision is "any model, any accelerator, any cloud", and CNCF governance is framed as "a truly neutral standard". — [CNCF blog](https://www.cncf.io/blog/2026/03/24/welcome-llm-d-to-the-cncf-evolving-kubernetes-into-sota-ai-infrastructure/)
- Mistral AI is contributing a DisaggregatedSet operator to LWS. — [CNCF blog](https://www.cncf.io/blog/2026/03/24/welcome-llm-d-to-the-cncf-evolving-kubernetes-into-sota-ai-infrastructure/)

### Inferences
- llm-d is the most vendor-neutral of the "distributed inference" stacks. It has multi-vendor founders, CNCF governance, two engines (vLLM and SGLang) and five or more accelerator families. NVIDIA is a co-founder, so it is not an anti-NVIDIA project.
- Its well-lit paths (P/D disaggregation, wide-EP, KV offload) are tuned for whole GPUs and multi-GPU or multi-node setups. For small and medium models on MIG slices, the parts that matter most are the inference scheduler (prefix/load-aware routing via GAIE/EPP) and flow control. P/D and wide-EP only pay off once whole-GPU or multi-node capacity exists.
- The DRA/DRANET topology guide lines up with the customer's existing DRA investment. It is a natural "next step" on the talk's golden path.

### Gaps
- No source confirms whether llm-d 1.0 has been tested or documented on MIG partitions or fractional GPUs. Nothing says it isn't supported, but there is no "well-lit path" for MIG. Verify in the llm-d guides directory.
- The exact CNCF TOC acceptance date is not stated. The blog post is dated Mar 24, 2026.
- The independent cost and performance claims are unverified, since all figures are vendor-reported.
- I did not read the DRA/DRANET guide itself, so it is unconfirmed whether it covers EKS/AWS (EFA) or only GKE/RoCE.

## KServe: CNCF status, 0.20, LLMInferenceService, managed DRA, relation to llm-d

### Takeaway
KServe is CNCF Incubating (TOC vote announced Nov 11, 2025). v0.20.0 (Aug 6, 2026) makes LLMInferenceService an llm-d-based LLM platform and adds managed DRA via annotations. However, it pins llm-d v0.8.0 and GIE v1.5.0, so it lags llm-d 1.0. LLMInferenceService is still described as alpha and fast-changing.

### Cited Findings
- KServe was accepted as a CNCF incubating project (CNCF blog, Nov 11, 2025). — [CNCF blog](https://www.cncf.io/blog/2025/11/11/kserve-becomes-a-cncf-incubating-project/). One CNCF account says it entered incubation in September 2025, which conflicts slightly with the Nov 2025 announcement date. — [search summary of CNCF/Red Hat sources](https://www.redhat.com/fr/blog/kserve-joins-cncf-incubating-project) (older fact, 2025)
- v0.20.0 was released on Aug 6, 2026. — [KServe 0.20 release blog](https://github.com/kserve/website/blob/main/blog/2026-08-06-KServe-0.20-release.md); [GitHub releases](https://github.com/kserve/kserve/releases)
- LLMInferenceService in 0.20 adds progressive traffic splitting (`group`/`weight` on `GatewayRoutesSpec`), a distributed tracing API, KV-cache offloading for vLLM, Anthropic Messages API routing (`/v1/messages`), LoRA-affinity scoring, a latency-predictor sidecar and stable version-independent URLs. — [KServe 0.20 blog](https://github.com/kserve/website/blob/main/blog/2026-08-06-KServe-0.20-release.md)
- llm-d integration: the dependency is upgraded to llm-d v0.8.0, routing resources now use llm-d.ai CRDs from llm-d-router, and the default P/D and standard configs follow the llm-d optimized baseline. GIE goes to v1.5.0, Gateway API to v1.5.1, and Envoy Gateway and Envoy AI Gateway are upgraded. — [KServe 0.20 blog](https://github.com/kserve/website/blob/main/blog/2026-08-06-KServe-0.20-release.md)
- Managed DRA for LLMInferenceService uses the `serving.kserve.io/dra-device-class` and `serving.kserve.io/dra-gpu-count` annotations. The controller generates ResourceClaimTemplates for single-node and multi-node (LeaderWorkerSet) deployments. — [KServe 0.20 blog](https://github.com/kserve/website/blob/main/blog/2026-08-06-KServe-0.20-release.md). Added in PR #5352, with a separate PR #5828 adding `resourceClaims` for DRA in ServingRuntime. — [GitHub releases](https://github.com/kserve/kserve/releases)
- Docs gap: issue #733 says managed DRA has no documentation beyond the auto-generated CRD reference. — [kserve/website issue #733](https://github.com/kserve/website/issues/733)
- Native OCI ImageVolume model mounting (`oci+native://`) requires Kubernetes ≥1.33. — [KServe 0.20 blog](https://github.com/kserve/website/blob/main/blog/2026-08-06-KServe-0.20-release.md). Third-party sources say 0.20 needs K8s 1.32+ and describe LLMInferenceService as an alpha CRD that is "churning fast". — [cloudnativepulse](https://cloudnativepulse.com/kserve-v0-20-0-the-release-that-turns-model-serving-into-an-llm-inference-platform/); [Kubezilla](https://kubezilla.io/kserve-0-20-tutorial-serving-llms-on-kubernetes-with-autoscaling-and-scale-to-zero/)
- llm-d bridges control planes like KServe and engines like vLLM. — [CNCF blog](https://www.cncf.io/blog/2026/03/24/welcome-llm-d-to-the-cncf-evolving-kubernetes-into-sota-ai-infrastructure/)
- The 0.20 release blog does not mention MIG or fractional GPUs. — [KServe 0.20 blog](https://github.com/kserve/website/blob/main/blog/2026-08-06-KServe-0.20-release.md)

### Inferences
- Convergence: KServe is becoming the control plane and API (InferenceService for predictive/classic models, LLMInferenceService for LLMs), with llm-d as the LLM data plane under it. For an OEM with mixed workloads (vision, perception and other classic models next to LLMs), KServe is the broadest single API.
- The `dra-device-class` annotation should in principle accept a MIG DeviceClass (e.g. `mig.nvidia.com`) from the NVIDIA DRA driver, which would map onto the customer's static-MIG + DRA setup. This is unverified because the docs are missing (issue #733).
- Expect a KServe 0.21 that bumps to llm-d 1.0. Until then, KServe users run a pre-1.0 llm-d.

### Gaps
- Not confirmed: whether managed DRA works with MIG device classes or only full GPUs (`gpu.nvidia.com`).
- No source found on a KServe 0.21 release or roadmap date as of Oct 31, 2026.
- The maturity level (alpha/beta) of the managed DRA feature is not officially stated.

## Gateway API Inference Extension (InferencePool / Endpoint Picker): status and implementations

### Takeaway
InferencePool `inference.networking.k8s.io/v1` is GA (stable since GAIE v1.0.0), and the latest release is v1.6.2 (17 Sep 2026). In v1.6.0 the EPP, BBR and latency predictor moved into the llm-d repository, so the reference scheduler is now llm-d code. Conformant gateways are Istio (≥1.28), Agentgateway, NGINX Gateway Fabric, Higress and Alibaba ACK.

### Cited Findings
- "InferencePool reached v1 and is stable, GA since v1.0.0." Until v1.5.0, `endpointPickerRef` was required. It is now optional, which allows pools without a user-managed EPP. — [GAIE InferencePool docs](https://gateway-api-inference-extension.sigs.k8s.io/api-types/inferencepool/)
- Releases (year inferred 2026): v1.6.2 on 17 Sep (conformance manifest fix, Lightweight EPP fixes), v1.6.1 on 11 Sep, v1.6.0 on 17 Aug, v1.5.0 on 19 Apr (pluggable parser framework, flow control docs, BBR body mutation, pool saturation gauge) and v1.4.0 on 20 Mar (standalone chart, `appProtocol`, `FailOpen`). — [GAIE GitHub releases](https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases)
- v1.6.0: "EPP, BBR, and the latency predictor moved to the llm-d repository". It also introduced Lightweight EPP (lwepp), made `endpointPickerRef` optional and removed several alpha APIs. — [GAIE GitHub releases](https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases)
- Conformant implementations listed: Alibaba ACK Gateway (v1.6.1-apsara.3, passes the v1.5.0 Gateway profile), Istio (v1.28.0+ recommended), Agentgateway (standalone and Kubernetes modes), Higress and NGINX Gateway Fabric. Implementations without a passing report for the current or two previous minors may be delisted. — [GAIE implementations page](https://gateway-api-inference-extension.sigs.k8s.io/implementations/gateways/)
- Docs quickstarts switched to Agentgateway, and kgateway has an updated BBR quickstart section. — [GAIE GitHub releases](https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases)
- vLLM production-stack documents migrating from `inference.networking.x-k8s.io/v1alpha2` to `inference.networking.k8s.io/v1` (pinning GAIE v1.5.0 and Gateway API v1.6.0). — [vLLM production-stack docs](https://docs.vllm.ai/projects/production-stack/en/latest/deployment/gateway-inference-extension.html)
- KServe 0.20 ships Envoy Gateway and Envoy AI Gateway upgrades alongside GIE v1.5.0. — [KServe 0.20 blog](https://github.com/kserve/website/blob/main/blog/2026-08-06-KServe-0.20-release.md)

### Inferences
- GAIE is the de facto standard "inference gateway" API. KServe, llm-d, vLLM production-stack and DigitalOcean all target it. Building on InferencePool keeps the gateway swappable (Istio, Agentgateway, NGINX, Envoy-based) and is the most future-proof routing choice.
- Envoy Gateway, kgateway and GKE Gateway are missing from the current conformant list. They were listed implementations earlier (2025, from training knowledge, unverified here). They may be delisted for missing reports, or the page may simply be incomplete. Flag this as a point to check.
- For AWS/EKS there is no managed GAIE gateway in the sources, so the customer would self-host Istio, Agentgateway or Envoy Gateway.

### Gaps
- The exact v1.0.0 GA release date could not be pulled from the releases page (it is on an older page). From training knowledge it was around Sep 2025, which is unverified.
- No AWS-native (ALB/VPC Lattice) GAIE implementation was found.

## NVIDIA Dynamo, Grove and NIM Operator: openness, DRA, lock-in

### Takeaway
Dynamo v1.6.0 (GA, Oct 21, 2026) is the first release with Dynamo Enterprise Support. Grove v0.2.0-beta1 (Oct 30, 2026) promoted its APIs to v1beta1 but must be upgraded in lockstep with Dynamo. NIM Operator 3.1.x supports the NVIDIA DRA driver with full-GPU and MIG claims, but DRA may still be labelled a technology preview. The stack is open source, but it is engineered around NVIDIA (CUDA, NIM/NGC, enterprise support), so lock-in risk is higher than with llm-d/KServe.

### Cited Findings
- Dynamo v1.6.0 is listed as a GA release (Oct 21, 2026), "first Dynamo Enterprise Support release", with enterprise-suffixed artifacts on NGC that match the OSS build. Backend pins are unchanged from v1.4.0. — [Dynamo v1.6.0 release notes](https://docs.nvidia.com/dynamo/v1.6.0/reference/releases)
- Dynamo v1.5.1 (Oct 6, 2026) was tested with SGLang 0.5.18, TensorRT-LLM 1.3.0rc25 and vLLM 0.28.0 on CUDA 13.0/13.1 with driver ≥580. — [Dynamo compatibility](https://docs.nvidia.com/dynamo/zh-CN/v1.5.1/reference/compatibility). A v1.6.1 docs page exists but its contents could not be confirmed. — [Dynamo v1.6.1 releases](https://docs.nvidia.com/dynamo/v1.6.1/reference/releases)
- The Dynamo install guide maps Dynamo 1.6.x to Grove ≥ v0.1.0-alpha.14 and 1.5.x to alpha.13. It advises upgrading Grove in lockstep with Dynamo "while the Grove APIs remain unstable", and notes that 1.3.x/1.4.x use older ClusterTopology APIs. — [Dynamo install guide](https://docs.nvidia.com/dynamo/v1.6.0/kubernetes/installation/install-dynamo)
- Grove v0.2.0-beta1 (30 Oct, latest) "promotes the Grove APIs to beta". It adds `grove.io/v1beta1` and `operator.config.grove.io/v1beta1` with v1beta1 as the storage version, requires an upgrade guide, bumps Go to 1.26.10 for CVE fixes, and adds a webhook check that PCSG `maxReplicas` ≥ `minReplicas`. — [Grove release v0.2.0-beta1](https://github.com/ai-dynamo/grove/releases/tag/v0.2.0-beta1)
- NIM Operator 3.0.0 added DRA as a technology preview (full GPU, MIG, time-slicing via ResourceClaim/ResourceClaimTemplate). — [NVIDIA blog, NIM Operator 3.0.0](https://developer.nvidia.com/blog/deploy-scalable-ai-inference-with-nvidia-nim-operator-3-0-0/)
- The NIM Operator 3.1.2 docs say it "supports the NVIDIA DRA Driver for GPUs", list full GPU and MIG as supported types ("if using DRA with MIGs, configure MIG Manager") and require K8s ≥1.34. The 3.1.0 docs said only time-slicing was supported as a sharing strategy. — [NIM Operator 3.1.2 DRA](https://docs.nvidia.com/nim-operator/3.1.2/dra.html); [3.1.0 DRA](https://docs.nvidia.com/nim-operator/3.1.0/dra.html)
- The unversioned "latest" DRA page still says DRA support for NIM is "a Technology Preview ... not suitable for deployment in production". This conflicts with the more permissive 3.1.2 wording. — [NIM Operator latest DRA](https://docs.nvidia.com/nim-operator/latest/dra.html)
- NVIDIA is a co-founder of llm-d and says llm-d supports its Vera Rubin platform. — [IBM Newsroom](https://newsroom.ibm.com/2026-10-20-llm-d-1-0-advances-open,-cost-efficient-ai-inference-for-production-scale)

### Inferences
- NIM Operator is the only stack in this research with documented DRA + MIG support (3.1.2). That is a direct fit for the customer's static-MIG + DRA platform, but it ties them to NIM containers and NVIDIA AI Enterprise licensing for production.
- Dynamo/Grove target multi-node, NVLink-scale disaggregated serving (rack-scale PodCliqueSets, topology-aware gang scheduling). They are poor fits for MIG-slice workloads and overkill unless the OEM serves very large models across nodes.
- Grove beta APIs, Dynamo's "unstable APIs" lockstep upgrades and the enterprise support tier all signal a fast-moving, NVIDIA-steered project. It is not foundation-governed.

### Gaps
- Not verified in sources: the Dynamo and Grove licenses (believed Apache-2.0 from training knowledge), and whether Grove depends on the KAI scheduler.
- No source on whether Dynamo itself consumes DRA ResourceClaims or MIG.
- No source found on Dynamo or Grove moving to a foundation (CNCF/LF AI).

## vLLM production-stack, vLLM, SGLang + OME, AIBrix, LWS, KubeRay/Ray Serve, Seldon, BentoML, Triton

### Takeaway
LWS hit v1.0.0 (16 Oct 2026) with DisaggregatedSet and is the shared multi-node primitive under llm-d and KServe. AIBrix (vLLM project) is at v0.7.0 (Jun 2026). No 2026 release evidence was found for vLLM production-stack. OME (SGLang project) exists with a v1beta1 API, but its recent releases are unverified. Several projects could not be verified within the research budget (Ray/KubeRay, Seldon, BentoML, Triton).

### Cited Findings
- LWS releases (year inferred 2026): v1.0.0 on 16 Oct (DisaggregatedSet with fractional rolling-update window, scaling during rollouts KEP-1022, independently scalable sub-roles KEP-960, native PodGroup gang scheduling KEP-666 still alpha/opt-in, `maxGroupRestarts`, config API v1), v0.11.1 on 01 Oct, v0.11.0 on 23 Sep, v0.10.0 on 11 Aug (per-role HPA), v0.9.0 on 17 Jun (DisaggregatedSet first implementation, KEP-766) and v0.8.0 on 26 Jan. — [LWS GitHub releases](https://github.com/kubernetes-sigs/lws/releases)
- llm-d v1.0.0 lists LWS v1.0.0 for DisaggregatedSet. — [llm-d releases](https://github.com/llm-d/llm-d/releases). KServe uses LWS for multi-node LLMInferenceService with DRA. — [KServe 0.20 blog](https://github.com/kserve/website/blob/main/blog/2026-08-06-KServe-0.20-release.md)
- AIBrix v0.7.0: 242 merged PRs over three months, a focus on composability (operational, workload, engine and gateway layers), a web Console, a Batch API, support for vLLM, SGLang and TensorRT-LLM, and P/D disaggregation. — [AIBrix v0.7.0 release](https://github.com/vllm-project/aibrix/releases/tag/v0.7.0). A third-party source dates it Jun 16, 2026, and v0.6.0 to Mar 5, 2026. — [beri.net](https://www.beri.net/learning/aibrix-llm-inference-infrastructure-docs)
- vLLM production-stack was first released in Jan 2025 (older fact). It documents GAIE v1 InferencePool integration. — [LMCache](https://lmcache.ai/en/open-source-llm-inference-cluster-performing-10x-faster-than-sota-oss-solution/); [production-stack docs](https://docs.vllm.ai/projects/production-stack/en/latest/deployment/gateway-inference-extension.html)
- OME is a Kubernetes operator for managing and serving LLMs under sgl-project. It is MIT-licensed with a v1beta1 API and a Helm install, but the listing is ~7 months stale. — [ecosyste.ms listing](https://awesome.ecosyste.ms/projects/github.com%2Fsgl-project%2Fome)
- vLLM in llm-d 1.0 images is v0.31.0. — [llm-d releases](https://github.com/llm-d/llm-d/releases). Dynamo 1.5.1 pins vLLM 0.28.0 and SGLang 0.5.18. — [Dynamo compatibility](https://docs.nvidia.com/dynamo/zh-CN/v1.5.1/reference/compatibility)
- Stack guidance (blog, not official): standalone vLLM fits single-node, single-model setups, and Ray Serve + vLLM via KubeRay RayService fits multi-node, multi-model setups. — [PremAI guide](https://blog.premai.io/deploying-llms-on-kubernetes-vllm-ray-serve-gpu-scheduling-guide-2026)
- A Red Hat/IIT paper (Feb 2026) combines Kueue, the Dynamic Accelerator Slicer and GAIE. It notes that device plugins support only static pre-configured slices, which motivates dynamic slicing. — [arXiv 2602.04900](https://arxiv.org/html/2602.04900)

### Inferences
- AIBrix (ByteDance-originated, under vllm-project) and production-stack overlap heavily with llm-d. With llm-d at 1.0 under CNCF and GAIE's EPP living in llm-d, AIBrix and production-stack look like niche or legacy options for new builds.
- OME is the SGLang-centric analogue to KServe. Its smaller community and single-engine focus make it less future-proof for a vendor-neutral OEM platform.

### Gaps
- Not verified within budget, from training knowledge only: vLLM joined the PyTorch Foundation as a hosted project (May 2025). Ray joined the PyTorch Foundation (Oct 2025, Anyscale-contributed). Seldon Core 2 moved to a Business Source License (2024), which matters for a commercial OEM. Triton Inference Server was rebranded "Dynamo-Triton" under the Dynamo umbrella (2025). Latest KubeRay, Seldon, BentoML and Triton versions and dates were not researched.
- No 2026 release found for vLLM production-stack. Its activity level is unknown.
- OME's latest release and date are unverified.

## MIG / fractional GPU fit: which stacks work on slices, and which assume whole GPUs or NVLink

### Takeaway
A plain vLLM/SGLang/Triton pod requesting a MIG device (via the device plugin or a DRA ResourceClaim) works today and is the natural evolution of the customer's PyTorch-on-MIG pods. Only NIM Operator 3.1.2 documents DRA + MIG explicitly. KServe's managed DRA is plausibly compatible but undocumented. llm-d P/D and wide-EP, Dynamo and Grove assume whole GPUs and often multi-node NVLink or RDMA.

### Cited Findings
- MIG via the GPU Operator: pods request MIG slices (e.g. profile all-1g.10gb), and an A100 80GB fits up to seven 1g.10gb instances. MIG suits multi-tenant production where memory isolation matters. Blog source. — [PremAI guide](https://blog.premai.io/deploying-llms-on-kubernetes-vllm-ray-serve-gpu-scheduling-guide-2026)
- NIM Operator 3.1.2: DRA with full GPU and MIG, with MIG Manager configured. — [NIM Operator 3.1.2 DRA](https://docs.nvidia.com/nim-operator/3.1.2/dra.html)
- KServe managed DRA uses a device-class annotation plus a GPU count, and generates ResourceClaimTemplates. — [KServe 0.20 blog](https://github.com/kserve/website/blob/main/blog/2026-08-06-KServe-0.20-release.md)
- llm-d 1.0 focuses on P/D disaggregation, wide-EP, KV offload and a DRA/DRANET topology guide. MIG is not mentioned. — [llm-d releases](https://github.com/llm-d/llm-d/releases)
- The llm-d CNCF benchmark used 16 NVIDIA H100 GPUs. — [CNCF blog](https://www.cncf.io/blog/2026/03/24/welcome-llm-d-to-the-cncf-evolving-kubernetes-into-sota-ai-infrastructure/)
- Dynamo/Grove target "large-scale distributed environments" with P/D GPU autoscaling and EFA internode transfer (older, 2025). — [NVIDIA Dynamo blog](https://developer.nvidia.com/blog/nvidia-dynamo-adds-gpu-autoscaling-kubernetes-automation-and-networking-optimizations/)

### Inferences
- Fit matrix:
  - **MIG-friendly:** plain vLLM/SGLang Deployments, KServe InferenceService (classic and small LLMs), NIM Operator (DRA+MIG documented), GAIE routing in front of MIG-backed pods. The EPP is agnostic to what GPU backs a pod.
  - **Possible but unverified:** KServe LLMInferenceService with a MIG DeviceClass, and llm-d's inference-scheduler-only path (no P/D) on MIG-backed vLLM.
  - **Whole-GPU / multi-node:** llm-d P/D and wide-EP, Dynamo + Grove, LWS multi-node groups, Ray Serve multi-node tensor parallelism.
- Practical caveat: MIG slices have no NVLink between them and limited memory (10–20 GB per 1g/2g slice on an A100 80GB). Tensor parallelism across slices is not viable, so slices suit ≤~7–13B models (quantized) or classic CV/perception models. That fits much of an automotive OEM's internal inference (RAG assistants, code assistants, perception and quality-inspection models).

### Gaps
- No official vLLM/KServe/llm-d documentation found that validates MIG + DRA end-to-end for LLM serving.
- No benchmark found comparing MIG-slice serving against whole-GPU llm-d routing on cost/latency.

## Most future-proof and vendor-neutral choice; convergence trends; fit for a European automotive OEM

### Takeaway
The stack is converging on three layers: Gateway API Inference Extension (InferencePool + EPP) as the routing standard, llm-d as the CNCF scheduler/data-plane reference, and KServe (CNCF Incubating) as the control-plane API, with LWS v1.0 for multi-node and DRA for devices. That combination is the most vendor-neutral and future-proof. NVIDIA Dynamo/Grove/NIM is the high-performance alternative with more lock-in.

### Cited Findings
- GAIE's EPP, BBR and latency predictor moved into the llm-d repo (GAIE v1.6.0). — [GAIE releases](https://github.com/kubernetes-sigs/gateway-api-inference-extension/releases)
- KServe 0.20 uses llm-d.ai CRDs from llm-d-router and aligns its defaults with the llm-d baseline. — [KServe 0.20 blog](https://github.com/kserve/website/blob/main/blog/2026-08-06-KServe-0.20-release.md)
- llm-d is "a primary implementation" of GAIE, sits under KServe, uses LWS, and is framed as "a truly neutral standard" against vendor lock-in. — [CNCF blog](https://www.cncf.io/blog/2026/03/24/welcome-llm-d-to-the-cncf-evolving-kubernetes-into-sota-ai-infrastructure/)
- Cohere ties llm-d's open architecture to its "sovereign AI commitment", and Roblox values not "tying us to a single inference engine". Mistral (European) is a contributor and deployer. — [IBM Newsroom](https://newsroom.ibm.com/2026-10-20-llm-d-1-0-advances-open,-cost-efficient-ai-inference-for-production-scale); [CNCF blog](https://www.cncf.io/blog/2026/03/24/welcome-llm-d-to-the-cncf-evolving-kubernetes-into-sota-ai-infrastructure/)
- Dynamo now has a commercial Enterprise Support tier on NGC. — [Dynamo v1.6.0 release notes](https://docs.nvidia.com/dynamo/v1.6.0/reference/releases)
- One blog comparison declares "KServe wins on Kubernetes" against llm-d and Ray Serve. Its methodology was not reviewed. — [beri.net](https://www.beri.net/article/llm-d-vs-kserve-vs-ray-serve-kubernetes-llm-serving-2026)

### Inferences
- Recommended successor path for the talk's golden path:
  1. Keep DRA + MIG for small models and classic ML. Wrap the PyTorch pods in KServe InferenceService, and run LLMs on MIG as vLLM behind an InferencePool so they get prefix/load-aware routing.
  2. Add whole-GPU pools (DRA `gpu.nvidia.com` claims) for larger LLMs using KServe LLMInferenceService or llm-d 1.0 directly, with P/D disaggregation via LWS DisaggregatedSet once traffic justifies it.
  3. Use a GAIE-conformant gateway (Istio ≥1.28 or Agentgateway; Envoy Gateway via KServe) so routing stays portable.
- European OEM fit: CNCF/Linux Foundation governance, Apache-style licensing, multi-accelerator support (AMD and Intel hedge GPU supply and price) and European contributors (Mistral) all support data sovereignty and procurement neutrality. NIM requires NVIDIA AI Enterprise licensing and pulls containers from NGC, which is a sovereignty and lock-in concern. Dynamo is OSS but NVIDIA-steered.
- Version-skew risk: KServe 0.20 bundles llm-d v0.8.0 and GIE v1.5.0, while llm-d 1.0 bundles GIE v1.6.2 and LWS v1.0.0. Platform teams must pick one owner of the llm-d version. Using KServe-managed versions is the safer choice for an enterprise golden path, at the cost of lagging features.

### Gaps
- No primary source found from AWS on EKS-specific integration of llm-d 1.0 or GAIE (Google GKE integration is confirmed, AWS is not).
- No European automotive OEM reference deployments found for any of these stacks.
- Seldon, BentoML and Triton positioning as of Oct 2026 was not verified in this pass.
