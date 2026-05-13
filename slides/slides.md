---
theme: "@pulumi/slidev-theme"
title: "Stop Wasting GPUs: How We Built a Golden Path for GPU Sharing on Kubernetes"
info: |
  Stop Wasting GPUs: How We Built a Golden Path for GPU Sharing on Kubernetes.
  Engin Diri — Pulumi.

  KCD Texas, May 15 2026.

  Repo: https://github.com/dirien/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes
transition: slide-left
mdc: true
canvasWidth: 1920
aspectRatio: 16/9
highlighter: shiki
lineNumbers: false
colorSchema: dark
layout: cover
defaults:
  layout: default
---

<div class="absolute inset-0 flex flex-col justify-center items-start px-20">
  <h1 class="!text-[5.5rem] !leading-[1.02] !font-semibold !tracking-tight !mb-6 !max-w-[95%]">
    Stop Wasting GPUs
  </h1>
  <p class="!mt-1 !text-[2.4rem] text-[var(--p-fg-muted)] !m-0 !leading-relaxed !max-w-[90%]">
    How we built a golden path for GPU sharing on Kubernetes.
  </p>
  <p class="!mt-10 !text-[1.8rem] text-[var(--p-fg-muted)] !m-0 !leading-relaxed">
    Engin Diri · Sr. Solutions Architect, Pulumi<br/>
    KCD Texas · May 15, 2026
  </p>
</div>

<!--
30s. Read the title. Don't sell. The talk has one protagonist: an automotive
customer in Europe with a GPU bill they hated. We follow their story, the
audience walks out with the repo, and on Monday they have a blueprint.
-->

---
class: soul-slide
---

# SOUL.md

<div class="h-[50px]"></div>

<<< @/snippets/soul.md md

<!--
20s. Land the meta-joke: I introduce myself the way an AI agent introduces
itself — because this whole talk is about treating AI workloads as
first-class citizens of a platform. Don't read the whole file aloud.
Highlight "Most Active Speaker. Three years running. That is either a
flex or a cry for help."
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[7rem] !leading-tight !font-semibold !tracking-tight !m-0 text-[var(--p-primary)] !max-w-[95%]">A customer called.</h1>
</div>

<!--
5s. Beat 1 opens. Let the title land. Don't talk over it. Walk straight
into the customer story on the next slide.
-->

---
class: 'meme-slide'
---

<div class="meme-frame">
  <img src="/patrick-on-phone.png" alt="Patrick Star answering the phone — sleepy expression, polka-dot phone." />
</div>

<!--
~5s. Meme slide. No words. The customer literally calling — let the
laugh land, then click into the actual story.
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[6rem] !leading-tight !font-semibold !tracking-tight !m-0 !max-w-[95%]">
    Actually it was more like <span class="text-[var(--p-primary)]">this:</span>
  </h1>
</div>

<!--
~5s. Pivot divider after the Patrick laugh. Drops the joke, lifts the
room into the real story. Click straight into the WhatsApp screenshot.
-->

---
class: 'meme-slide'
---

<div class="meme-frame">
  <img src="/fauxtalks-customer-call.png" alt="WhatsApp chat: the customer asking Engin to build them something now, then saying 'bring your whole gang. This is big.'" />
</div>

<!--
~20s. The real customer call. Let the chat land — the audience reads
it themselves. Pace the click; don't read aloud. The line that does
the work is "bring your whole gang. This is big." That's the brief.
-->

---
class: 'meme-slide'
---

<div class="meme-frame">
  <img src="/cringe-reaction.png" alt="A man looking at his phone with a disgusted, cringing expression — the reaction shot." />
</div>

<!--
~5s. The reaction shot. No words. The audience just saw the customer's
chat — this is the face. Let the laugh land, then click into the real
peers slide.
-->

---

# A customer called.

<div class="zoom-content">

<p class="!mt-2 !text-[1.5rem] !leading-relaxed !max-w-[90%]">
A European automotive OEM. They asked us to help build an internal AI platform
for training, fine-tuning, and serving the models they own.
</p>

<p class="!mt-4 !text-[1.25rem] !leading-relaxed !max-w-[90%] text-[var(--p-fg-muted)]">
The pattern is industry-wide. Their peers have been shipping versions of this for years:
</p>

<div class="grid grid-cols-3 gap-6 mt-6">
<div class="gpu-card" v-click>
<div class="gpu-caption">BMW Group</div>
<p class="!mt-3 !text-[1.1rem] !leading-snug">Connected AI platform on Kubernetes (AWS EKS). <strong>230 PB</strong> usable storage, <strong>240M km</strong> of test data simulated for autonomous-driving model training.</p>
<p class="!mt-3 !text-[0.95rem] text-[var(--p-fg-muted)]">Red Hat OpenShift &middot; DXC</p>
</div>
<div class="gpu-card" v-click>
<div class="gpu-caption">Volkswagen Group</div>
<p class="!mt-3 !text-[1.1rem] !leading-snug">Generative-AI pipeline for brand-compliant vehicle assets. SageMaker, <code>ml.g5.2xlarge</code> async inference. Live in 2025.</p>
<p class="!mt-3 !text-[0.95rem] text-[var(--p-fg-muted)]">AWS &middot; Amazon Nova Lite for prompt optimization</p>
</div>
<div class="gpu-card" v-click>
<div class="gpu-caption">Continental</div>
<p class="!mt-3 !text-[1.1rem] !leading-snug">Distributed AI infrastructure with NVIDIA DGX clusters and IBM Elastic Storage. Training time dropped <strong>from weeks to days</strong>.</p>
<p class="!mt-3 !text-[0.95rem] text-[var(--p-fg-muted)]">Equinix &middot; NVIDIA &middot; IBM</p>
</div>
</div>

</div>

<style scoped>
.zoom-content { zoom: 1.1; }
</style>

<!--
90s. Reset the customer story so it's honest. They're not a noob with a
wasted EC2 invoice. They're a European automotive OEM that asked us to
sit on their side of the table and build an AI platform with them.

Three named peers, all public:
- BMW: 230 PB storage, 240M km simulated. Red Hat / DXC case study.
  (redhat.com/en/success-stories/bmwgroup)
- Volkswagen Group 2025: generative-AI pipeline for brand assets on
  SageMaker, g5.2xlarge async, Nova Lite for prompt optimization.
  (quantumzeitgeist.com/volkswagen-builds-generative-pipeline)
- Continental: distributed DGX clusters via Equinix, IBM storage, training
  time weeks-to-days. (blog.equinix.com 3 AI use cases advancing automotive)

The audience walks out with the shape: every European OEM is building
some version of this. We were the team building the next one. The next
slide is why their K8s admin couldn't close the gap on their own.

Don't quote NSDI / Cast AI here anymore. Those numbers belong on the
"the bill" beat where the cost wound lands harder.
-->

---
class: 'meme-slide'
---

<div class="meme-frame">
  <img src="/limited-by-technology.png" alt="Howard Stark: 'I'm limited by the technology of my time.'" />
</div>

<!--
~10s. No words. Let the image land, wait for the laugh, click. This is
the bridge from "every OEM is building one" to "and here's what was
stopping their admin." Don't explain the meme.
-->

---

# Platform engineers had two knobs.

<div class="grid grid-cols-2 gap-10 mt-4">

<div v-click class="gpu-card gpu-card--muted">
<div class="gpu-caption gpu-caption--muted">Knob 1 &middot; Classic device plugin</div>
<p class="!mt-4 !text-[1.2rem] !leading-snug">
<code>nvidia.com/gpu: 1</code>. A count, not an attribute. The pod gets the whole GPU or nothing.
</p>
<p class="!mt-4 !text-[1.05rem] !leading-snug text-[var(--p-fg-muted)]">
An 80GB A100 serving a 12GB quantized LLM: <strong>the GPU runs at ~30% compute utilization.</strong>
</p>
</div>

<div v-click class="gpu-card gpu-card--muted">
<div class="gpu-caption gpu-caption--muted">Knob 2 &middot; Time-slicing</div>
<p class="!mt-4 !text-[1.05rem] !leading-snug">Lie to the scheduler: advertise N replicas of one GPU.</p>

```yaml
# ClusterPolicy → device plugin
sharing:
  timeSlicing:
    resources:
    - name: nvidia.com/gpu
      replicas: 4
```

<p class="!mt-2 !text-[1.0rem] !leading-snug">Three things break the moment you turn it on:</p>
<ul class="!mt-1 !text-[0.95rem] !leading-snug space-y-1 list-disc pl-5">
<li>No memory or fault isolation between workloads on the same GPU</li>
<li>No guaranteed compute share. A noisy neighbor starves the rest</li>
<li>Per-pod GPU metrics go dark in DCGM-Exporter</li>
</ul>
</div>

</div>

<p v-click class="!mt-10 !text-[2.3rem] !leading-relaxed text-[var(--p-primary)] !font-semibold text-center">
The only knob left was buying more hardware. We've all been there.
</p>


<!--
75s. This slide is the audience-recognition beat. The room has lived this.
Walk down the two knobs platform engineers had before DRA:

Left panel: the device plugin. nvidia.com/gpu: 1 — a count, not an attribute.
Pod gets the whole GPU. The 12GB-on-80GB number is concrete: the audience
sees their own bill in that line.

Right panel: time-slicing. Walk the three sharp edges in our own words —
no memory or fault isolation, no guaranteed compute share, and per-pod GPU
metrics go dark in DCGM-Exporter the moment you turn it on. The metrics
blind spot is the one most teams don't see coming until Prometheus stops
answering questions.

Closing line: "the only knob left was buying more hardware. We've all
been there." Pause. The audience is nodding. That's the wound.

Fact-check:
- "Trades memory and fault-isolation..." → docs.nvidia.com/datacenter/cloud-native/gpu-operator (gpu-sharing.html)
- "Does not guarantee proportional GPU compute power" → same source
- "DCGM-Exporter does not support associating metrics..." → same source
- "12GB on 80GB A100, ~30% compute utilization" → CIO 2025
  (cio.com/article/4152554)
- NSDI '24 → already in project memory
-->

---
class: 'meme-slide'
---

<div class="meme-frame-light">
  <img src="/wojak-gpu-2020-2026.png" alt="2020: 'Wow GPU so expensive, I guess I'll wait until price goes down.' 2026: (haggard)." />
</div>

<!--
~10s. No words. The audience will read it themselves and snort. Wait for
the laugh. This is the payoff for the "buy more hardware" wound on the
previous slide — we waited for prices to come down, they never did. Click
into the pivot.
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[7rem] !leading-tight !font-semibold !tracking-tight !m-0 !max-w-[95%]">
    Then things <span class="text-[var(--p-primary)]">changed.</span>
  </h1>
</div>

<!--
15s. Divider. Read it. Pause. That's the day Kubernetes 1.34 shipped, and
with it two things that turned the customer's problem from "unsolvable"
into "solvable on a Tuesday." Walk into the next slide.
-->

---

# Change one: the scheduler can now read GPU attributes.

<p v-click class="!mt-25 !text-[1.35rem] !leading-relaxed !max-w-[92%]">
Dynamic Resource Allocation went GA in Kubernetes 1.34. For the first time,
the scheduler can read what's <em>inside</em> a GPU, not just an integer count of devices.
</p>

<div class="grid grid-cols-2 gap-10 mt-2">

<div v-click class="gpu-card">
<div class="gpu-caption">What "attributes" actually means</div>
<p class="!mt-3 !text-[1.05rem] !leading-snug text-[var(--p-fg-muted)]">What the NVIDIA DRA driver publishes per device:</p>
<ul class="!mt-3 !text-[1.05rem] !leading-snug space-y-1.5 list-disc pl-5">
<li><code>memory</code>: <code>80Gi</code>, <code>40Gi</code>, &hellip;</li>
<li><code>productName</code>: <code>NVIDIA A100</code>, <code>NVIDIA H100</code>, <code>NVIDIA L4</code>, &hellip;</li>
<li><code>architecture</code>: <code>Hopper</code>, <code>Ampere</code>, <code>Ada Lovelace</code>, <code>Blackwell</code></li>
<li><code>profile</code> (MIG-mode cards only): <code>3g.20gb</code>, <code>1g.5gb</code>, &hellip;</li>
<li>plus the usual metadata: <code>cudaComputeCapability</code>, <code>driverVersion</code>, <code>pcieBusID</code>, <code>uuid</code></li>
</ul>
</div>

<div v-click class="gpu-card gpu-card--primary">
<div class="gpu-caption gpu-caption--accent">The pattern is borrowed</div>
<p class="!mt-3 !text-[1.0rem] !leading-snug italic text-[var(--p-fg-muted)]">
"This enhancement took inspiration from dynamic provisioning for storage volumes."
<br/>&mdash; Kubernetes 1.34 release blog
</p>
<div class="!mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[1.0rem] !leading-snug">
<div class="!font-semibold text-[var(--p-fg-muted)]">Storage (since 2017)</div>
<div class="!font-semibold text-[var(--p-primary)]">DRA (GA 2025)</div>
<div><code>StorageClass</code></div>
<div><code>DeviceClass</code></div>
<div><code>PersistentVolume</code></div>
<div><code>ResourceSlice</code></div>
<div><code>PersistentVolumeClaim</code></div>
<div><code>ResourceClaim</code></div>
<div><code>volumeClaimTemplates</code></div>
<div><code>ResourceClaimTemplate</code></div>
</div>
</div>

</div>

<!--
75s. This is the slide where DRA becomes legible. Don't define DRA in
the abstract. Show what changed by anchoring it to something the audience
already knows: PVCs.

Left card: the concrete attributes the driver publishes. VRAM, MIG
profile, architecture, topology, NVLink. Audience members who run mixed
fleets immediately get the value: "I want a 40GB Hopper card on this
NUMA node" is now a sentence the scheduler can parse.

Right card: the storage analogy. The quote is verbatim from the K8s
1.34 release blog — DRA was modeled on dynamic volume provisioning. The
four-row mapping makes it explicit. Every name in the right column has
a 1:1 equivalent in the left column the audience has been using since
2017.

Closing line: "If you've ever written a PVC, you already know how to
ask for a GPU." That's the takeaway. The new API isn't strange; it's
the storage pattern, ported.

Sources:
- K8s 1.34 release blog (storage-inspiration quote, verbatim)
- NVIDIA DRA driver schema for gpu.nvidia.com: memory, productName,
  architecture, profile (MIG), cudaComputeCapability, driverVersion,
  pcieBusID, uuid. Cross-checked against this repo's own
  infra/index.ts:550 (profile/type) and the Cast AI + GKE DRA setup
  guides (memory + productName + architecture).
- Do NOT claim NVLink or NUMA on this slide — those are not published
  as device attributes by the current GPU DRA driver. NVLink-aware
  scheduling is what Grove + ComputeDomains start to address; mention
  on the "what's next" slide if at all.
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[6rem] !leading-tight !font-semibold !tracking-tight !m-0 !max-w-[95%]">
    If you've ever written a <span class="text-[var(--p-primary)]">PVC</span>,<br/>
    you already know how to ask for a <span class="text-[var(--p-primary)]">GPU</span>.
  </h1>
</div>

<!--
10s. Divider. Let the analogy land before walking through the four
API kinds. Pause, then click into "The cluster side."
-->

---

# The cluster side.


<div class="zoom-wrap">
<p v-click class="!mt-2 !text-[1.2rem] !leading-relaxed text-[var(--p-fg-muted)] !max-w-[92%]">
The DRA driver and your platform team create these. App teams never write them by hand.
</p>



<div class="grid grid-cols-2 gap-6 mt-5">

<div v-click class="gpu-card">

<div class="gpu-caption">DeviceClass</div>
<p class="!mt-2 !text-[1.0rem] !leading-snug">An admin-defined filter that workloads reference by name. Same shape as <code>StorageClass</code>.</p>

```yaml
apiVersion: resource.k8s.io/v1
kind: DeviceClass
metadata:
  name: large-gpu
spec:
  selectors:
  - cel:
      expression: |
        device.driver == "gpu.nvidia.com" &&
        device.capacity["memory"]
          .isGreaterThan(quantity("40Gi"))
```

</div>

<div v-click class="gpu-card">

<div class="gpu-caption">ResourceSlice</div>
<p class="!mt-2 !text-[1.0rem] !leading-snug">The driver's auto-published inventory. One slice per node, listing every device with its attributes and capacity.</p>

```yaml
# Published by the DRA driver.
apiVersion: resource.k8s.io/v1
kind: ResourceSlice
spec:
  driver: gpu.nvidia.com
  nodeName: gpu-node-1
  pool:
    name: gpu-node-1
    generation: 1
  devices:
  - name: gpu-0
    attributes:
      productName: { string: "NVIDIA A100-SXM4-40GB" }
      architecture: { string: "Ampere" }
    capacity:
      memory: { value: "40Gi" }
```

</div>

</div>

</div>

<style scoped>
.zoom-wrap { zoom: 1.3; }
</style>

<!--
60s. These are the two objects you can usually ignore: the DRA driver
creates the ResourceSlice for you on each GPU node; your platform team
(or the driver Helm chart) creates the DeviceClass.

Left card: DeviceClass. Show the CEL syntax — workloads reference this
by name to ask for "any device matching this expression." Same role as
StorageClass.

Right card: ResourceSlice. Tell the audience the YAML is illustrative —
the driver writes it, they read it via `kubectl get resourceslice`. The
field shape (typed attribute wrappers, capacity values) follows the v1
API but isn't the kind of YAML they'll ever paste into a file.

Sources:
- K8s docs: kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation
- DeviceClass CEL example with isGreaterThan: DoIt blog
- Resource API kinds verified GA in resource.k8s.io/v1 (1.34 release blog)
-->

---

# The workload side.

<div class="zoom-wrap">

<p v-click class="!mt-8 !text-[1.2rem] !leading-relaxed text-[var(--p-fg-muted)] !max-w-[92%]">
These are what app teams actually write (or not, use Kro!). A one-off claim, or a template that stamps one out per workload.
</p>


<div class="grid grid-cols-2 gap-6 mt-5">

<div v-click class="gpu-card">

<div class="gpu-caption">ResourceClaim</div>
<p class="!mt-2 !text-[1.0rem] !leading-snug">A direct request. The pod references it from its <code>resourceClaims</code> field. Same shape as <code>PersistentVolumeClaim</code>.</p>

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaim
metadata:
  name: shared-gpu
  namespace: default
spec:
  devices:
    requests:
    - name: gpu
      exactly:
        deviceClassName: gpu.nvidia.com
        count: 1
```

</div>

<div v-click class="gpu-card gpu-card--primary">

<div class="gpu-caption gpu-caption--accent">ResourceClaimTemplate</div>
<p class="!mt-2 !text-[1.0rem] !leading-snug">Stamps out a fresh ResourceClaim per pod. Same shape as <code>volumeClaimTemplates</code> in a StatefulSet.</p>

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaimTemplate
metadata:
  name: mig-large-template
  namespace: mig-test
spec:
  spec:
    devices:
      requests:
      - name: mig-large
        exactly:
          deviceClassName: mig.nvidia.com
          count: 1
          selectors:
          - cel:
              expression: |
                device.attributes["gpu.nvidia.com"]
                  .profile == "3g.20gb"
```

</div>

</div>

</div>

<style scoped>
.zoom-wrap { zoom: 1.3; }
</style>

<!--
75s. This is the slide app teams care about. Walk the left card first
(ResourceClaim — the one-off form), then the right card (the template
form, which is what shared workloads actually use).

Left: ResourceClaim. The .exactly wrapper is real in v1 — it discriminates
against .firstAvailable (an ordered fallback list). For a baseline
"give me one GPU", you nest deviceClassName + count under .exactly.

Right: ResourceClaimTemplate. This YAML is verbatim from the customer's
repo (infra/index.ts:534-558). Notice spec.spec: the outer spec is the
template metadata, the inner spec is the claim spec that gets stamped
out. The CEL selector pins the request to a specific MIG profile.

Sources:
- ResourceClaimTemplate YAML lifted from this deck's own
  infra/index.ts:534-558 — proven to run on EKS 1.34 with the NVIDIA
  DRA driver v25.8.x.
- ResourceClaim v1 schema (.exactly wrapper, .selectors[].cel.expression)
  per K8s 1.34 release blog and resource.k8s.io/v1 API reference.
-->

---

# Change two: the GPU itself can be carved.

<p class="!mt-2 !text-[1.25rem] !leading-relaxed !max-w-[92%]">
The scheduler learned to read attributes. But it can only carve a GPU if
the silicon will let it.
</p>

<p class="!mt-3 !text-[1.25rem] !leading-relaxed !max-w-[92%]">
NVIDIA's Multi-Instance GPU does exactly that: splits a single physical card
into partitions with their own SMs, memory, L2 cache, and memory bandwidth.
Hardware-enforced.
</p>

<div class="diagram-row">

<div class="diagram-box">
  <div class="diagram-title">MPS</div>
  <div class="stack">
    <div class="wkld">Process</div>
    <div class="connector"></div>
    <div class="wkld">Process</div>
    <div class="connector"></div>
    <div class="wkld">Process</div>
    <div class="connector"></div>
    <div class="wkld">CUDA Context</div>
    <div class="connector"></div>
    <div class="gpu">GPU</div>
  </div>
</div>

<div class="diagram-box">
  <div class="diagram-title">Time-Slicing</div>
  <div class="stack">
    <div class="wkld">Workload 1</div>
    <div class="connector"></div>
    <div class="wkld">Workload 2</div>
    <div class="connector"></div>
    <div class="wkld">Workload 3</div>
    <div class="connector dashed"></div>
    <div class="gpu">GPU</div>
  </div>
</div>

<div class="diagram-box">
  <div class="diagram-title">MIG</div>
  <div class="stack">
    <div class="wkld">GPU Instance</div>
    <div class="connector"></div>
    <div class="wkld">GPU Instance</div>
    <div class="connector"></div>
    <div class="wkld">GPU Instance</div>
    <div class="connector"></div>
    <div class="wkld">GPU Instance</div>
    <div class="connector"></div>
    <div class="gpu">GPU</div>
  </div>
</div>

</div>

<style scoped>
.diagram-row {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  align-items: stretch;
}
.diagram-box {
  background: #15132c;
  border: 1.5px solid #5b4cd6;
  border-radius: 12px;
  padding: 1rem 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 8px 24px rgba(126, 107, 255, 0.18);
}
.diagram-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #e9e7ff;
  margin-bottom: 0.9rem;
  letter-spacing: 0.02em;
}
.stack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 80%;
}
.wkld, .gpu {
  border-radius: 10px;
  text-align: center;
  font-weight: 600;
  font-size: 1.1rem;
  padding: 0.6rem 0.8rem;
  line-height: 1.15;
}
.wkld {
  background: #1f3a2a;
  border: 1.5px solid #7ad99c;
  color: #e5fbec;
}
.gpu {
  background: #4a2222;
  border: 2px solid #e07b7b;
  color: #ffe0e0;
}
.connector {
  width: 2px;
  height: 0.55rem;
  background: #9b8cff;
  align-self: center;
}
.connector.dashed {
  background: transparent;
  border-left: 2px dashed #9b8cff;
  width: 0;
}
</style>

<!--
75s. The hardware half of the story. DRA gave the scheduler the words.
Now we show the silicon, and we show it next to the alternatives so the
audience sees why MIG is different.

Walk the diagram left to right:

- MPS: every process is a tenant, but they all funnel through one shared
  CUDA context. One context, one GPU. Soft isolation at best.
- Time-Slicing: the workloads sit on top of the same GPU, taking turns.
  Dashed lines because there's no static binding — the runtime
  multiplexes them.
- MIG: each GPU Instance is a hardware partition that talks directly
  to the silicon. Solid lines, no shared layer.

The takeaway is the topology, not the labels: solid + direct means
hardware-isolated. Anything that funnels through a single shared layer
isn't isolation, it's coordination.

Diagram inspired by @sunzoomass on Medium, "How Kubernetes evolved to
tame the GPU beast — 2025 edition," redrawn in mermaid with this deck's
palette. Sourced facts:
- MPS shares a CUDA context across processes — NVIDIA MPS docs.
- Time-slicing has no memory or fault isolation — NVIDIA GPU Operator
  docs (cited on the "two knobs" slide).
- MIG "partitions a GPU into hardware-isolated slices, each with its
  own memory, cache, and compute cores" — Medium @sunzoomass, verbatim.
-->

---

# The road to GPU multi-tenancy is hard...

<div class="grid grid-cols-3 gap-6 mt-6 items-start">
  <div v-click class="gpu-card gpu-card--muted">
    <div class="gpu-caption gpu-caption--muted">MPS</div>
    <ul class="!mt-3 !text-[1.1rem] !leading-snug space-y-2">
      <li>One shared CUDA context</li>
      <li>Concurrent kernels</li>
      <li>Shared memory space</li>
      <li>No fault isolation</li>
    </ul>
  </div>
  <div v-click class="gpu-card gpu-card--muted">
    <div class="gpu-caption gpu-caption--muted">Time-slicing</div>
    <ul class="!mt-3 !text-[1.1rem] !leading-snug space-y-2">
      <li>Pods take turns on the whole GPU</li>
      <li>Context-switch tax</li>
      <li>No memory or fault isolation</li>
      <li>A noisy neighbor starves the rest</li>
    </ul>
  </div>
  <div v-click>
    <div class="gpu-card gpu-card--primary">
      <div class="gpu-caption gpu-caption--accent">MIG</div>
      <ul class="!mt-3 !text-[1.1rem] !leading-snug space-y-2">
        <li>Hardware partitioning</li>
        <li>Dedicated SMs, memory, and cache</li>
        <li>Fault isolation between slices</li>
        <li>Up to seven slices per card</li>
      </ul>
    </div>
    <p class="!mt-3 !text-[0.95rem] !leading-snug text-[var(--p-fg-muted)]">
      MIG support is GPU-specific: A100, A30, H100, H200. A10G and consumer cards: no MIG.
    </p>
  </div>
</div>

<p v-click class="!mt-8 !text-[1.25rem] !leading-relaxed !max-w-[95%]">
Our own scars from time-slicing. The same story from every peer we talked to.
A rack of GPUs that already supported MIG.
We decided to implement MIG.
</p>

<!--
60s. The comparison slide. Walk the three cards left to right. The story:
the first two columns are what we had before the audience's customers
demanded better. The third column is what we have now.

Don't dwell on time-slicing or MPS — the audience already lived this
on the "two knobs" slide. The new content here is the right column:
hardware-enforced partitioning that the scheduler can pin a pod to.

Honest scope: MIG works on data-center cards only (A100, A30, H100,
H200). The footnote acknowledges this so nobody assumes their gaming
cluster qualifies. If someone asks about NVLink-aware multi-card
scheduling or non-MIG GPUs, route them to the closing "what's next"
slide.

Sources:
- Time-slicing tradeoffs: NVIDIA GPU Operator docs (already cited on
  the "two knobs" slide).
- MPS shared context, no fault isolation: NVIDIA MPS docs.
- 7 slices per card: NVIDIA MIG User Guide (A100/H100 max 7 instances).
- "Hardware-isolated slices, each with its own memory, cache, and
  compute cores": Medium @sunzoomass, How Kubernetes evolved to tame
  the GPU beast (2025 edition).
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[7rem] !leading-tight !font-semibold !tracking-tight !m-0 text-[var(--p-primary)] !max-w-[95%]">So we built it.</h1>
</div>

<!--
5s. Beat 3 divider. Walk straight into the architecture.
-->

---

# What we shipped them, in one picture (simplified).

<div class="arch">
<div class="arch-region">
<div class="arch-region-label">AWS · eu-central-1 · VPC + private subnets</div>
<div class="arch-row">
<div class="arch-cluster">
<div class="arch-cluster-label">EKS 1.34 · gpu-dra-cluster · IRSA · Pod Identity</div>
<div class="arch-cluster-pools">
<div class="tile tile-pool tile-stacked">
<div class="tile-title">system pool</div>
<div class="tile-sub">m6i.large × 2</div>
<div class="tile-meta">CoreDNS · EBS CSI · DRA controller</div>
</div>
<div class="tile tile-pool tile-stacked">
<div class="tile-title">gpu pool</div>
<div class="tile-sub">p4d.24xlarge × N</div>
<div class="tile-meta">8× A100 40GB · MIG all-balanced</div>
</div>
</div>
</div>
<div class="arch-services">
<div class="tile tile-svc">
<div class="tile-title">NVIDIA GPU Operator</div>
<div class="tile-meta">MIG Manager · DCGM</div>
</div>
<div class="tile tile-svc tile-svc-accent">
<div class="tile-title">NVIDIA DRA Driver</div>
<div class="tile-meta">v25.8.1</div>
</div>
<div class="tile tile-svc">
<div class="tile-title">Prometheus + Grafana</div>
<div class="tile-meta">DCGM MIG dashboard</div>
</div>
<div class="tile tile-svc">
<div class="tile-title">Karpenter</div>
<div class="tile-meta">GPU node autoscaling</div>
</div>
<div class="tile tile-svc">
<div class="tile-title">cert-manager</div>
<div class="tile-meta">TLS for webhooks</div>
</div>
<div class="tile tile-svc">
<div class="tile-title">Argo CD</div>
<div class="tile-meta">GitOps · app sync</div>
</div>
<div class="tile tile-svc">
<div class="tile-title">External Secrets</div>
<div class="tile-meta">Pulumi ESC · AWS SM</div>
</div>
<div class="tile tile-svc">
<div class="tile-title">KEDA</div>
<div class="tile-meta">queue-based scaling</div>
</div>
<div class="tile tile-svc">
<div class="tile-title">Loki + Tempo</div>
<div class="tile-meta">logs · traces</div>
</div>
</div>
</div>
<div class="arch-side">
<div class="badge">ECR</div>
<div class="badge">S3 · state</div>
<div class="badge">CloudWatch</div>
<div class="badge">Route 53</div>
</div>
</div>
<div class="arch-flow">
<span class="arch-flow-label">ResourceClaim ↑</span>
<span class="arch-flow-divider"></span>
<span class="arch-flow-label">↓ carves MIG slice</span>
</div>
<div class="arch-region">
<div class="arch-region-label">mig-test namespace · tenant workloads</div>
<div class="arch-workloads">
<div class="tile tile-wkld tile-stacked">
<div class="tile-title">large</div>
<div class="tile-sub">3g.20gb</div>
<div class="tile-meta">ResNet-18 training</div>
</div>
<div class="tile tile-wkld tile-stacked">
<div class="tile-title">medium</div>
<div class="tile-sub">2g.10gb</div>
<div class="tile-meta">custom CNN</div>
</div>
<div class="tile tile-wkld tile-stacked">
<div class="tile-title">small</div>
<div class="tile-sub">1g.5gb</div>
<div class="tile-meta">MLP inference</div>
</div>
<div class="tile tile-wkld tile-stacked">
<div class="tile-title">batch</div>
<div class="tile-sub">1g.5gb</div>
<div class="tile-meta">eval jobs</div>
</div>
</div>
</div>
</div>


<style scoped>
.arch {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.arch-region {
  border: 1.5px solid #5b4cd6;
  border-radius: 12px;
  padding: 0.9rem 1rem 1rem;
  background: rgba(21, 19, 44, 0.6);
}
.arch-region-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: #9b8cff;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 0.7rem;
}
.arch-row {
  display: grid;
  grid-template-columns: 1.1fr 1.6fr;
  gap: 1rem;
}
.arch-cluster {
  border: 1.5px dashed #7e6bff;
  border-radius: 10px;
  padding: 0.6rem 0.75rem 0.75rem;
  background: rgba(31, 29, 58, 0.5);
}
.arch-cluster-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #c8c0ff;
  margin-bottom: 0.5rem;
}
.arch-cluster-pools {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}
.arch-services {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.55rem;
  align-content: start;
}
.arch-side {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.65rem;
  justify-content: flex-end;
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: rgba(91, 76, 214, 0.18);
  border: 1px solid #5b4cd6;
  color: #c8c0ff;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.arch-workloads {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.65rem;
}
.tile {
  position: relative;
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  border: 1.5px solid transparent;
  text-align: center;
}
.tile-title {
  font-weight: 700;
  font-size: 0.95rem;
  line-height: 1.2;
  position: relative;
  z-index: 1;
}
.tile-sub {
  font-size: 0.82rem;
  margin-top: 0.1rem;
  opacity: 0.9;
  position: relative;
  z-index: 1;
}
.tile-meta {
  font-size: 0.74rem;
  margin-top: 0.2rem;
  opacity: 0.75;
  position: relative;
  z-index: 1;
}
.tile-pool {
  background: #2a2456;
  border-color: #7e6bff;
  color: #f3f1ff;
}
.tile-svc {
  background: #1a2c4a;
  border-color: #5db0ff;
  color: #e6f1ff;
}
.tile-svc-accent {
  background: #2b1a4a;
  border-color: #c77bff;
}
.tile-wkld {
  background: #3a1f4a;
  border-color: #c77bff;
  color: #f7e9ff;
}
.tile-stacked::before,
.tile-stacked::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 10px;
  border: 1.5px solid;
  border-color: inherit;
  background: inherit;
  z-index: 0;
}
.tile-stacked::before {
  transform: translate(6px, 6px);
  opacity: 0.55;
}
.tile-stacked::after {
  transform: translate(3px, 3px);
  opacity: 0.8;
}
.arch-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  font-size: 0.95rem;
  color: #9b8cff;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.arch-flow-label {
  white-space: nowrap;
}
.arch-flow-divider {
  height: 1px;
  width: 40%;
  background: linear-gradient(to right, transparent, #5b4cd6, transparent);
}
</style>

<!--
75s. The architecture. Don't read every box. Walk left to right: AWS,
EKS 1.34, two node pools, the GPU pool is the protagonist. GPU Operator
installs the driver and MIG Manager; DRA driver publishes ResourceSlices;
DCGM scrapes metrics into Prometheus; Grafana lights up the dashboard.
Three pods in mig-test each ask for a different MIG profile via a
ResourceClaim. That's the whole show. Source: infra/index.ts.
-->

---
class: 'meme-slide'
---

<div class="meme-frame">
  <img src="/feels-good.png" alt="Wojak with hands clasped, eyes closed in satisfaction." />
  <div class="meme-overlay">
    <p class="meme-overlay-line">And all done in Pulumi!</p>
    <p class="meme-overlay-hearts">❤️ ❤️ ❤️</p>
  </div>
</div>

<style scoped>
.meme-overlay {
  position: absolute;
  left: 6%;
  top: 50%;
  transform: translateY(-50%);
  color: #ffffff;
  text-align: left;
  z-index: 10;
  max-width: 38%;
}
.meme-overlay-line {
  font-size: 4.2rem;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0;
}
.meme-overlay-hearts {
  font-size: 5rem;
  line-height: 1;
  margin: 1.5rem 0 0;
  letter-spacing: 0.2em;
}
</style>

<!--
~8s. No words. Wait for the room to laugh. This is the moment after the
architecture lands and before the live terminal — the engineer's small
satisfaction of "and it all works." Click into the demo.
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[7rem] !leading-tight !font-semibold !tracking-tight !m-0 !max-w-[95%]">
    Live: <span class="text-[var(--p-primary)]">one GPU</span>, three pods.
  </h1>
</div>

<!--
~10s. Divider. Read it slowly. Let the room land on "one GPU, three pods"
before clicking into the terminal on the next slide.
-->

---

<div class="zoom-content">

```bash
# One GPU node. Kubernetes 1.35 with DRA v1 (GA).
$ kubectl get nodes -l node-role=gpu
NAME                                         STATUS   VERSION
ip-10-0-108-169.us-west-2.compute.internal   Ready    v1.35.4-eks

# Three pods, three MIG profiles, all running.
$ kubectl get pods -n mig-test
NAME                      READY   STATUS    AGE
mig-large-training-pod    1/1     Running   8m
mig-medium-training-pod   1/1     Running   8m
mig-small-inference-pod   1/1     Running   8m

# One shared ResourceClaim with a matchAttribute constraint —
# the scheduler picked a GPU that had all three slices available.
$ kubectl get resourceclaim -n mig-test
NAME               STATE                AGE
shared-mig-claim   allocated,reserved   8m

# Three pods. Same physical GPU. Different MIG UUIDs.
$ for p in mig-large-training mig-medium-training mig-small-inference; do
>   kubectl exec ${p}-pod -n mig-test -- nvidia-smi -L
> done
GPU 0: NVIDIA A100-SXM4-40GB (UUID: GPU-9bd75b6b-cd91-ef22-...)
  MIG 3g.20gb     Device  0: (UUID: MIG-744060a1-c779-54b8-...)
GPU 0: NVIDIA A100-SXM4-40GB (UUID: GPU-9bd75b6b-cd91-ef22-...)
  MIG 2g.10gb     Device  0: (UUID: MIG-7d17cad5-cb54-53b8-...)
GPU 0: NVIDIA A100-SXM4-40GB (UUID: GPU-9bd75b6b-cd91-ef22-...)
  MIG 1g.5gb      Device  0: (UUID: MIG-37b7fdd7-f1cc-51f3-...)
```

</div>

<style scoped>
.zoom-content { zoom: 0.95; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.zoom-content pre { font-size: 1.05rem !important; line-height: 1.45 !important; }
</style>

<!--
3 minutes if it's live. The keeper moment is the last command: same GPU
UUID at the top, three different MIG UUIDs underneath. Let the audience
see it. If something is wrong, fall back to the recorded screencap at
/Users/dirien/Tools/repos/.../slides/public/demo-fallback.png (TODO).
-->

---
class: 'meme-slide'
---

<img src="/grafana-mig-climbing.png"
     alt="Grafana NVIDIA DCGM MIG dashboard showing three MIG slices on GPU 4 — climbing memory, temperature, and power lines"
     class="absolute inset-0 w-full h-full object-cover" />

<div class="absolute top-8 left-12 right-12 z-10">
  <h1 class="!text-[3.4rem] !leading-tight !font-semibold !tracking-tight !m-0 text-white"
      style="text-shadow: 0 2px 16px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,1);">
    Live: <span class="text-[var(--p-primary)]">three workloads</span>, climbing.
  </h1>
</div>

<!--
60s. Switch to Grafana in the browser. Three slices, three colored lines
climbing as the pods warm up. Stay quiet for ten seconds while the
dashboard does the talking. Then: "That's what 4 to 48 percent becomes
when the scheduler can see." Walk into the next slide.

TODO: place a fallback screenshot at slides/public/grafana-mig-climbing.png
before the talk. If the live dashboard fails, drop in the image.
-->

---
class: 'meme-slide'
---

<div class="meme-frame">
  <video controls loop muted playsinline preload="auto"
         aria-label="Recorded terminal session: kubectl commands showing one GPU node sliced into three MIG profiles."
         poster="/demo.gif">
    <source src="/demo.webm" type="video/webm" />
    <source src="/demo.mp4"  type="video/mp4" />
    <!-- Fallback for browsers without video support -->
    <img src="/demo.gif" alt="Demo recording (animated GIF fallback)." />
  </video>
</div>

<style scoped>
/* Override the global meme-frame background to match the Catppuccin
 * Macchiato palette of the recorded terminal — letterbox blends in. */
.meme-frame { background: #1e1e2e; }
</style>

<!--
~25s. The recorded fallback. If the live demo went green on slide 16,
this is the rerun for emphasis — let the audience watch the four
commands again at a calm pace. If the live demo broke, this slide is
the demo. Either way: stay quiet during the keeper command (the
for-loop). The same parent GPU UUID across three pods is the visual.

Recorded via Charm VHS (slides/demo.tape) against the live cluster.
Re-render: `pulumi env run ediri/pulumi-idp/auth -- env KUBECONFIG=/tmp/kubeconfig vhs slides/demo.tape`
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-start px-32 zoom-content">

  <div class="gpu-caption gpu-caption--muted">Day 1</div>
  <ul class="!mt-3 !text-[1.8rem] !leading-relaxed space-y-3 list-disc pl-8">
    <li>Three pods land on three slices.</li>
    <li>One engineer. Three workloads. Beautiful.</li>
  </ul>

  <div v-click>
    <div class="gpu-caption gpu-caption--muted" style="margin-top:3rem">Day 30</div>
    <ul class="!mt-3 !text-[1.8rem] !leading-relaxed space-y-3 list-disc pl-8">
      <li>Fifty engineers want slices.</li>
      <li>Training jobs queue. Inference pods compete for the same slices.</li>
      <li><span class="text-[var(--p-primary)] font-semibold">Whose workload runs first?</span></li>
    </ul>
  </div>

</div>

<style scoped>
.zoom-content { zoom: 1.6; }
</style>

<!--
~25s. Ask both questions out loud. Pause after each. Let the room answer
the second one in their head. The Day 1 framing in muted type is the
recognition beat ("we've all had this"). The Day 30 question is the wound
this next slide will close. Don't answer it yet. Click into KAI + Grove.
-->

---

# Our next steps after MIG and DRA: KAI + Grove.

<div class="zoom-content">

<div class="grid grid-cols-2 gap-8 mt-2">
  <div class="gpu-card gpu-card--accent">
    <div class="gpu-caption gpu-caption--accent">KAI Scheduler</div>
    <p class="!mt-2 !text-[1.0rem] !leading-snug text-[var(--p-fg-muted)]">The scheduler &mdash; training and inference. CNCF sandbox, Apache-2.0.</p>
    <ul class="!mt-3 !text-[1.15rem] !leading-snug space-y-3">
      <li>Gang scheduling for multi-pod jobs (pods land together or none do).</li>
      <li>Queues, fair-share, preemption.</li>
      <li>Reads your <code>ResourceClaim</code>. Runs next to <code>kube-scheduler</code>.</li>
    </ul>
  </div>

  <div class="gpu-card gpu-card--accent">
    <div class="gpu-caption gpu-caption--accent">NVIDIA Grove</div>
    <p class="!mt-2 !text-[1.0rem] !leading-snug text-[var(--p-fg-muted)]">The inference API. Alpha, Apache-2.0.</p>
    <ul class="!mt-3 !text-[1.15rem] !leading-snug space-y-3">
      <li>Whole inference system as one CR (prefill, decode, router).</li>
      <li>Startup ordering between leader and worker pods.</li>
      <li>Topology-aware placement inside NVLink domains.</li>
    </ul>
  </div>
</div>

<p class="!mt-5 !text-[1.25rem] !leading-relaxed text-[var(--p-primary)] !font-semibold text-center">
  DRA picks the slice. KAI schedules. Grove orchestrates the topology.
</p>

</div>

<style scoped>
.zoom-content { zoom: 1.3; }
</style>

<!--
90s. After MIG and DRA, there are two more pieces worth knowing about for
the platform you'll keep building. Frame the stack top-down before reading
either card:

  DRA is the LANGUAGE — a pod says "give me a 3g.20gb MIG slice".
  KAI is the SCHEDULER — gang scheduling, queues, fairness, preemption.
                          Works for both training jobs AND inference serving.
  Grove is the WORKLOAD API — describes a multi-pod inference topology
                              (prefill / decode / router) as a single CR.
                              Generates the PodGangs that KAI then schedules.

KAI is CNCF sandbox, v0.14.2 — production-leaning. Grove is alpha
(v0.1.0-alpha.8, April 2026) — bleeding edge; mention it as the next floor.

Close on the tagline: "DRA picks the slice. KAI schedules. Grove
orchestrates the topology." That's the whole stack on one line.

Sources:
- github.com/NVIDIA/KAI-Scheduler
- github.com/NVIDIA/grove
- blogs.nvidia.com/blog/nvidia-at-kubecon-2026/
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[6.5rem] !leading-tight !font-semibold !tracking-tight !m-0 text-[var(--p-primary)] !max-w-[95%]">The blueprint for your Monday.</h1>
</div>

<!--
5s. Beat 4 divider. The customer's story is over. Pivot the room: now
it's your story. Walk into the platform-engineering slide.
-->

---

# You're either already here, or about to be.

<div class="zoom-content">

<div class="grid grid-cols-2 gap-12 mt-4">
  <div v-click>
    <div class="gpu-caption gpu-caption--muted">Platform engineering, 2025</div>
    <ul class="!mt-4 !text-[1.3rem] !leading-relaxed space-y-3">
      <li><strong>75%</strong> of platform teams are hosting or preparing AI workloads</li>
      <li><strong>40%</strong> have already extended Kubernetes to support GPU and AI</li>
      <li><strong>39%</strong> say platform engineering owns AI in their org</li>
    </ul>
    <p class="!mt-6 !text-[1.05rem] text-[var(--p-fg-muted)]">Source: Vultr <em>2025 State of Platform Engineering</em>.</p>
  </div>
  <div v-click>
    <div class="gpu-card gpu-card--primary">
      <p class="!text-[1.45rem] !leading-snug">Our customer was in the 40 percent.</p>
      <p class="!mt-4 !text-[1.45rem] !leading-snug !font-semibold text-[var(--p-primary)]">You probably are too. Or your CFO is about to ask why you're not.</p>
    </div>
  </div>
</div>

</div>

<style scoped>
.zoom-content { zoom: 1.15; }
</style>

<!--
60s. Turn the room into the customer. The stats earn their place because
they put the audience inside the same demographic the customer was in.
Source check: Vultr blog "How AI is reshaping platform engineering"
(Dec 2025). Numbers come from their 2025 survey.
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[6rem] !leading-tight !font-semibold !tracking-tight !m-0 !max-w-[95%]">
    In 2026, we also need<br/>
    <span class="text-[var(--p-primary)]">new touchpoints</span> for our IDP.
  </h1>
</div>

<!--
~10s. Divider between "you're already in this demographic" and the
self-service slide that follows. Read it slowly. The new touchpoints
are MCP tools and Claude Skills — the next slide shows them. Don't
preview the answer here; let the line land first.
-->

---

# Self-service: an MCP or CLI tool, called from a skill.

<div class="self-service-wrap">

<div class="grid grid-cols-2 gap-10 !mt-[5rem]">
<div>

<div v-click class="big-code">

```python
@mcp.tool()
async def request_mig_slice(profile: str, hours: int) -> str:
    """Request a MIG GPU slice for a workload."""
    if profile not in {"1g.5gb", "2g.10gb", "3g.20gb"}:
        return f"invalid profile {profile!r}"
    manifest = render_claim(profile, hours)
    return f"PR opened: {await open_pr(manifest)}"
```

</div>

<div v-click class="big-code !mt-4">

```go
var requestSliceCmd = &cobra.Command{
    Use:   "request-slice",
    Short: "Request a MIG GPU slice for a workload.",
    RunE: func(cmd *cobra.Command, _ []string) error {
        profile, _ := cmd.Flags().GetString("profile")
        // omit for brevity: validate profile, render manifest, open PR...
        return nil
    },
}
```

</div>

</div>
<div v-click>

<div class="big-code">

```markdown
---
name: gpu-platform-idp
description: Request and manage GPU MIG slices on
  the cluster. Use when the user wants to launch
  a training job, deploy an inference service,
  ask "what slices do I have", or troubleshoot
  a pending pod. Default lease 4 hours.
---

# GPU Platform IDP

Workflow for any slice request:

1. Confirm profile (1g.5gb / 2g.10gb / 3g.20gb)
   and lease duration.
2. Submit the request via the available platform
   tool, e.g. `gpuctl request-slice
   --profile <p> --hours <h>`.
3. Surface the printed PR URL to the user.
```

</div>

</div>
</div>

<p v-click class="self-service-tagline !-mt-[30px] !text-[1.82rem] !leading-relaxed text-[var(--p-primary)] !font-semibold text-left">
  Dev: "I need a 2g.10gb slice." &rarr; Skill triggers &rarr; Tool runs &rarr; PR appears.
</p>

</div>

<style scoped>
.self-service-wrap {
  position: relative;
}
.self-service-tagline {
  position: relative;
  z-index: 30;
}
</style>

<!--
90s. One backend, two surfaces, one skill that doesn't care which one:

LEFT TOP — MCP tool (Python). The surface for LLM agents — Claude
Desktop, Cursor, in-IDE agents. Typed args, docstring used by the LLM
for parameter inference. Validates the profile, renders the manifest,
opens a GitOps PR.

LEFT BOTTOM — CLI tool (Go + Cobra). The surface for humans and CI
pipelines. `gpuctl request-slice --profile 2g.10gb --hours 4`.
Different language, different process, but it hits the same platform
API behind the scenes — so the user experience is identical.

RIGHT — Claude Skill. Frontmatter is the trigger; body is a 3-step
playbook. The body deliberately names only the CLI command and leaves
the rest to the agent ("the available platform tool") — keeps the
skill stable as new surfaces (MCP, future ones) come and go.

Tagline at the bottom is the dev's mental model — they don't care which
surface ran. They get a PR URL.

Sources:
- modelcontextprotocol.io/docs/develop/build-server (MCP pattern)
- github.com/anthropics/skills (SKILL.md frontmatter)
- github.com/spf13/cobra (Go CLI pattern)
-->


---

# Guardrails: bad slices die in preview.

<div class="zoom-shrink !mt-8">
<div class="big-code">

```ts
// infra/mig-policy/index.ts

// A100 40GB cluster — only the small profiles exist.
const allowedMigProfiles = ["1g.5gb", "2g.10gb", "3g.20gb"];
const blockedMigProfiles = [
    "1g.10gb", "2g.20gb", "3g.40gb", "7g.80gb",   // 80GB family
    "4g.20gb", "4g.40gb", "7g.40gb",              // unsupported / whole-GPU
];

new policy.PolicyPack("mig-policy", {
    policies: [{
        name: "enforce-small-mig-profiles",
        enforcementLevel: "mandatory",
        validateResource: (args, report) => {
            if (!isResourceClaim(args)) return;
            // ... walk requests + selectors against blockedMigProfiles
            report(`profile '${bad}' not on this cluster. ` +
                   `allowed: ${allowedMigProfiles.join(", ")}.`);
        },
    }],
});
```

</div>
</div>

<style scoped>
.zoom-shrink { zoom: 0.72; }
</style>

<p class="!mt-4 !text-[1.1rem] !leading-snug text-center text-[var(--p-fg-muted)]"><em>Runs on every <code>pulumi preview</code> and <code>pulumi up</code>. Validates both <code>ResourceClaim</code> and <code>ResourceClaimTemplate</code>. A request for <code>7g.40gb</code> never reaches the API server.</em></p>

<!--
60s. The guardrail half of the pair. Lists are concrete to THIS cluster
(p4d.24xlarge = A100 40GB) — Friday's p4de swap script needs to flip
allowed/blocked too. The blocked list explains its own choices in
comments: 80GB-only profiles, unsupported combos, and 7g.40gb (whole-GPU)
because that profile defeats the entire point of MIG.

Tested live with `pulumi preview --policy-pack ./mig-policy`. The
policy now validates both ResourceClaim (current shared-claim pattern)
AND ResourceClaimTemplate (older per-pod pattern). Before this fix the
policy was silently a no-op against our deploy because it only matched
RCTs.

Pause here, then click into the takeaway divider.
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[5.5rem] !leading-tight !font-semibold !tracking-tight !m-0 !max-w-[95%]">
    Devs ship faster.<br/>
    <span class="text-[var(--p-primary)]">You stop being the bottleneck.</span>
  </h1>
</div>

<!--
~10s. Takeaway divider for the platform team. Read both lines. Pause on
the second one. That's the whole proposition: self-service for devs in
front, guardrails behind, you go home.
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[10rem] !leading-tight !font-semibold !tracking-tight !m-0 text-[var(--p-primary)] !max-w-[95%]">Q&amp;A</h1>
</div>

<!--
Open floor. Q&A prep ammo if no questions come:
- llm-d (CNCF sandbox, Mar 2026) — distributed LLM serving on K8s
- DRA GPU driver donated to CNCF at KubeCon EU 2026; Google donated TPU
- NVIDIA committing $4M over 3 years for GPU access for CNCF projects
- "What comes after Grove?" — disaggregated inference, agentic pipelines
- "Why not just buy more GPUs?" — Cast AI 5% / NSDI'24 4-48% util numbers
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[10rem] !leading-tight !font-semibold !tracking-tight !m-0 text-[var(--p-primary)] !max-w-[95%]">Thanks.</h1>
</div>

<!--
~5s. The walk-off. Let it land. Then move to "Take it." for the repo
handoff (or end here if you'd rather close cold on the gratitude beat).
-->

---

# Resources

<div class="contact-grid">
  <div class="contact-card">
    <div class="contact-card__avatar">
      <img src="https://github.com/dirien.png" alt="Engin Diri" />
    </div>
    <div class="contact-card__name">Engin Diri</div>
    <div class="contact-card__role">Pulumi</div>
    <div class="contact-card__handles">
      <span><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg> dirien</span>
      <span><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg> engin-diri</span>
    </div>
    <div class="contact-card__qr">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fwww.linkedin.com%2Fin%2Fengin-diri%2F" alt="QR code: linkedin.com/in/engin-diri" />
    </div>
  </div>

  <div class="contact-card">
    <div class="contact-card__avatar contact-card__avatar--icon">
      <svg viewBox="0 0 16 16" width="80" height="80" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
    </div>
    <div class="contact-card__name">Slides + Demo</div>
    <div class="contact-card__role contact-card__role--mono">github.com/dirien/<wbr/>stop-wasting-gpus-how-we-built-<wbr/>a-golden-path-for-gpu-sharing-<wbr/>on-kubernetes</div>
    <div class="contact-card__qr">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fgithub.com%2Fdirien%2Fstop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes" alt="QR code: repo" />
    </div>
  </div>
</div>

<style scoped>
.contact-grid {
  display: grid;
  grid-template-columns: auto auto;
  justify-content: center;
  gap: 6rem;
  margin-top: 2.5rem;
  align-items: start;
}
.contact-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.6rem;
}
.contact-card__avatar {
  width: 9rem;
  height: 9rem;
  border-radius: 9999px;
  overflow: hidden;
  border: 2px solid var(--p-primary);
  background: var(--p-bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
}
.contact-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.contact-card__avatar--icon {
  border-color: color-mix(in srgb, var(--p-primary) 60%, var(--p-border));
  color: var(--p-primary);
}
.contact-card__name {
  font-size: 1.7rem;
  font-weight: 700;
  margin-top: 0.5rem;
  color: var(--p-fg);
}
.contact-card__role {
  font-size: 1.15rem;
  color: var(--p-fg-muted);
}
.contact-card__role--mono {
  font-family: var(--slidev-font-mono);
  font-size: 0.95rem;
  line-height: 1.45;
  word-break: break-all;
  max-width: 22rem;
}
.contact-card__handles {
  display: flex;
  gap: 1.25rem;
  font-size: 1rem;
  color: var(--p-fg-muted);
  align-items: center;
}
.contact-card__handles span {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.contact-card__qr {
  margin-top: 1rem;
  background: white;
  padding: 0.6rem;
  border-radius: 0.5rem;
  width: 11rem;
  height: 11rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.contact-card__qr img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>

<!--
Closing slide. Leave it up during the rest of Q&A.

Left card: GitHub avatar (auto-served from github.com/dirien.png),
GitHub + LinkedIn handles, QR points to LinkedIn.

Right card: repo URL + QR code that resolves to
github.com/dirien/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes
The QR is generated on the fly by api.qrserver.com — needs internet
during the talk. If the venue WiFi is bad, pre-render a PNG and drop
it at slides/public/qr-repo.png, then swap the img src.
-->
