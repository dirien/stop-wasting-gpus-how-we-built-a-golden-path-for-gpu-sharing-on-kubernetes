---
theme: "@pulumi/slidev-theme"
title: "Why Are You Still Wasting Whole GPUs? Hardware-Level Sharing, Scheduled with DRA"
info: |
  Why Are You Still Wasting Whole GPUs? Hardware-Level Sharing, Scheduled with DRA.
  Engin Diri — Pulumi.

  KubeCon + CloudNativeCon North America 2026, Salt Lake City, November 10 2026.
  Platform Engineering track, Salt Palace Level 2, 255 BC.

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

<img class="divider-mascot" src="/brand/pulumipus-cool.svg" alt="" aria-hidden="true" style="width: 562px;" />

<div class="absolute inset-0 flex flex-col justify-center items-start px-20">
  <h1 class="!text-[5.5rem] !leading-[1.02] !font-semibold !tracking-tight !mb-6 !max-w-[95%]">
    Why Are You Still Wasting Whole GPUs?
  </h1>
  <p class="!mt-1 !text-[2.4rem] text-[var(--p-fg-muted)] !m-0 !leading-relaxed !max-w-[90%]">
    Hardware-level sharing, scheduled with DRA.
  </p>
  <p class="!mt-10 !text-[1.8rem] text-[var(--p-fg-muted)] !m-0 !leading-relaxed">
    Engin Diri · Principal Solutions Architect, Pulumi<br/>
    KubeCon + CloudNativeCon North America · Salt Lake City · November 10, 2026
  </p>
</div>

<!--
30s. Read the title. Don't sell. The talk has one protagonist: an automotive
customer in Europe with a GPU bill they hated. We follow their story, the
audience walks out with the repo, and on Monday they have a blueprint.
-->

---

<div class="absolute inset-0 flex items-center px-24 gap-20">
  <div class="flex-shrink-0">
    <img src="/img/engin-diri.png" class="w-[28rem] rounded-2xl shadow-xl border-4" style="border-color: rgba(126,107,255,0.45)" alt="Engin Diri" />
  </div>
  <div class="flex-1">
    <h1 class="!text-[7rem] !leading-[1.02] !font-semibold !tracking-tight !mb-4 !text-[var(--p-primary)]">Engin Diri</h1>
    <p class="!text-[2.2rem] !leading-relaxed !m-0 opacity-90">
      Principal Solutions Architect at <strong class="!text-[var(--p-primary)]">Pulumi</strong>
    </p>
    <div class="!mt-8 flex items-center gap-8 !text-[1.5rem] opacity-70">
      <span class="flex items-center gap-2"><carbon-logo-x /> @_ediri</span>
      <span class="flex items-center gap-2"><carbon-logo-linkedin /> engin-diri</span>
      <span class="flex items-center gap-2"><carbon-logo-github /> dirien</span>
    </div>
    <p class="!mt-10 !text-[1.75rem] !leading-relaxed opacity-70 !m-0">
      Building platform tooling and infrastructure-as-code.<br/>
      Helping teams ship cloud infrastructure faster. With and without agents.
    </p>
  </div>
</div>

<!--
15s. Name, Pulumi, handles. Don't linger: the customer story is the hook.
-->

---

<img class="divider-mascot" src="/brand/pulumipus-running.svg" alt="" aria-hidden="true" />

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

<img class="divider-mascot" src="/brand/pulumipus-walking.svg" alt="" aria-hidden="true" />

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

<div class="zoom-content">

<p class="!mt-0 !text-[2.6rem] !leading-tight !font-semibold !tracking-tight !max-w-[95%]">
A <span class="text-[var(--p-primary)]">European automotive OEM</span> asked us to help build an internal AI platform:
training, fine-tuning and serving the models they own.
</p>

<p class="!mt-8 !text-[1.25rem] !leading-relaxed !max-w-[90%] text-[var(--p-fg-muted)]">
The pattern is industry-wide. Others in the industry have been shipping similar work:
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

Three named examples, all public: two OEMs (BMW, VW) and one Tier-1
supplier (Continental). OEM = Original Equipment Manufacturer, the carmaker.
- BMW: 230 PB storage, 240M km simulated. Red Hat / DXC case study.
  (redhat.com/en/success-stories/bmwgroup)
- Volkswagen Group 2025: generative-AI pipeline for brand assets on
  SageMaker, g5.2xlarge async, Nova Lite for prompt optimization.
  (quantumzeitgeist.com/volkswagen-builds-generative-pipeline)
- Continental: distributed DGX clusters via Equinix, IBM storage, training
  time weeks-to-days. (blog.equinix.com 3 AI use cases advancing automotive)

The audience walks out with the shape: every European OEM is building
some version of this. We were the team building the next one. The next
slide is why owning models is spreading beyond automotive (Revolut), then
why their K8s admin couldn't close the gap on their own.

Don't quote NSDI / Cast AI here anymore. Those numbers belong on the
"the bill" beat where the cost wound lands harder.
-->

---

# Why run your own models? Revolut did it.

<div class="grid grid-cols-[1fr_1.15fr] gap-12 mt-8 items-start">
  <a href="https://www.youtube.com/watch?v=Ok6QdZHCcI8" target="_blank" class="yt-card">
    <img src="/revolut-self-hosting-thumb.jpg" alt="Video thumbnail: David Abitbol of Revolut on stage at AI Engineer New York, captioned 'A Tenth of the Bill'." />
    <div class="yt-caption">David Abitbol, Revolut · AI Engineer New York<br/>"How Revolut Cut AI Coding Costs 90% With Self-Hosted Open Models"</div>
  </a>
  <ul class="takeaways">
    <li v-click><strong>A tenth of the bill.</strong> An open model (GLM 5.3) for 2,000 engineers at about $0.30 per million tokens. Flat cost.</li>
    <li v-click><strong>Unlimited tokens changed the work.</strong> Lead time down 70%, coding time down 60%.</li>
    <li v-click><strong>Regulated, and still fine.</strong> An EU bank on a Chinese open model: weights on US GPUs, a human in the loop.</li>
    <li v-click><strong>The GPUs are now your only bill.</strong> 56× B200. Tuning, not more GPUs, cut time to first token by 88%.</li>
  </ul>
</div>

<p v-click class="!mt-8 !text-[2.3rem] !leading-snug text-[var(--p-primary)] !font-semibold">
  Owning the model is the easy part. Using every GPU well is the hard part.
</p>

<style scoped>
.yt-card { display: block; text-decoration: none; border: 1.5px solid var(--p-border); border-radius: 14px; overflow: hidden; background: var(--p-bg-elevated); }
.yt-card img { width: 100%; display: block; aspect-ratio: 16 / 9; object-fit: cover; }
.yt-caption { padding: 0.8rem 1.1rem 1rem; font-size: 1rem; line-height: 1.4; color: var(--p-fg-muted); }
.takeaways { list-style: none; padding: 0; margin: 0; }
.takeaways li { font-size: 1.7rem; line-height: 1.35; margin: 0 0 1.2rem; padding-left: 1.1rem; border-left: 3px solid var(--p-primary); }
.takeaways strong { color: var(--p-fg); }
</style>

<!--
~60s. Motivation beat, right after the customer slide. Why would anyone,
like our OEM, want to own and serve their own models instead of calling
an API? Here's a public example from this year, and it shows how fast
this is changing. Four clicks,
then the line at the bottom.

What to say:
- Revolut (EU digital bank, 80M customers) moved 2,000 engineers from
  commercial coding APIs to an open model on dedicated GPUs in April 2026.
  Blended cost about $0.30 per million tokens; the invoice is about a
  tenth of what they paid Anthropic and OpenAI. Flat billing.
- Unlimited tokens changed behavior: people stopped rationing tokens for
  "the hardest task of the quarter." Their dashboards show lead time down
  about 70% and coding time down about 60%. Lead time = from an
  engineer picking up a feature until it is merged and ready to deploy
  (days); coding time = the hands-on coding part of that (hours).
- Compliance (his "message for the CIO", 10:59-11:37): EU-regulated bank,
  strictest regime, and it still works.
  - The stigma: GLM is a Chinese open model. "You're not using the
    inference dedicated endpoint that goes to China. You're just getting
    the weights and putting them on a US-based service."
  - Data stays in countries in the data-adequacy framework ("US, EU, UK,
    Israel"); inference/GPU providers run "zero data retention by
    default."
  - Coding agents are "not considered autonomous agents" because a
    sandbox with approval rules keeps a human in the loop ("allow grep
    but not Gradle"). That is what gives the regulator confidence. The
    sandbox also guards against rogue insiders and prompt injection.
  - Plus "very strong OpenTelemetry" so you can dig into any incident.
- The catch, and the bridge to our customer: once you own the model, the
  GPUs are your bill. Same 56x B200 the whole time; tuning took time to
  first token from over 10 s to about 1.6 s while load grew 76%. "80% of
  the gain came from adjusting hyperparameters."
- Line at the bottom, then: "Our OEM wanted exactly this. Their platform
  team just didn't have the tools to share the GPUs." Click into the
  "limited by the technology of my time" meme.

Careful in Q&A:
- "Self-hosted" = dedicated GPUs at a provider (thumbnail: "GLM 5.3 on 56
  x B200s with Together"), not their own Kubernetes cluster.
- All numbers are the speaker's own, from a 12-minute talk. The
  productivity numbers are correlation from their dashboards.
- Auto-captions garble the model name ("GLM 51", "GLM-53"); GLM 5.3 is
  from the thumbnail. He describes it as about 800B parameters.
- More from the talk if asked: first token under 3 s is the target (past
  5 s, complaints start); 200 tokens/s is enough; "long context is a
  scam" (256k, not 1M); FP4 on Blackwell; TP8 over TP4 for KV cache room;
  coding needs prefix-cache hits above 90%.

Source: youtube.com/watch?v=Ok6QdZHCcI8 (AI Engineer, David Abitbol,
Revolut), transcript pulled Nov 10 2026.
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

# We trialed and evaluated two options.

<div class="grid grid-cols-2 gap-10 mt-4">

<div v-click class="gpu-card gpu-card--muted">
<div class="gpu-caption gpu-caption--muted">Option 1: the device plugin</div>
<p class="!mt-4 !text-[1.2rem] !leading-snug">
<code>nvidia.com/gpu: 1</code>. A count, not an attribute. The pod gets the whole GPU or nothing.
</p>
<p class="!mt-4 !text-[1.05rem] !leading-snug text-[var(--p-fg-muted)]">
An 80GB A100 serving a 12GB quantized LLM: <strong>the GPU runs at 30&ndash;35% compute utilization.</strong>
</p>
</div>

<div v-click class="gpu-card gpu-card--muted">
<div class="gpu-caption gpu-caption--muted">Option 2: time-slicing</div>
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
Whole GPUs wasted the card. Time-slicing put every neighbor at risk.
</p>


<!--
75s. This slide is the audience-recognition beat. The room has lived this.
Walk down the two options we trialed with the customer before DRA:

Left panel: the device plugin. nvidia.com/gpu: 1 — a count, not an attribute.
Pod gets the whole GPU. The 12GB-on-80GB number is concrete: the audience
sees their own bill in that line.

Right panel: time-slicing. Walk the three sharp edges in our own words —
no memory or fault isolation, no guaranteed compute share, and per-pod GPU
metrics go dark in DCGM-Exporter the moment you turn it on. The metrics
blind spot is the one most teams don't see coming until Prometheus stops
answering questions.

Closing line: "Whole GPUs wasted the card. Time-slicing put every
neighbor at risk." Pause. The audience is nodding. That's the wound:
waste on one side, risk on the other.

If asked "Why not MIG with the device plugin?": "We had it on the list.
MIG has existed since the A100 (2020), but through the device plugin the
scheduler only sees counts per profile (nvidia.com/mig-1g.10gb), so we
couldn't build self-service on it." The waste fix is the hardware (MIG);
DRA is what makes it schedulable as a golden path. Don't claim DRA alone
saves GPUs.

Fact-check:
- "Trades memory and fault-isolation..." → docs.nvidia.com/datacenter/cloud-native/gpu-operator (gpu-sharing.html)
- "Does not guarantee proportional GPU compute power" → same source
- "DCGM-Exporter does not support associating metrics..." → same source
- "12GB on 80GB A100, 30–35% compute utilization" → CIO, Apr 1 2026,
  Rakesh Kumar Pal (cio.com/article/4152554), verbatim "might consume only
  12GB of GPU memory and operate at 30–35% compute utilization"
- Fleet-wide utilization, if asked: Cast AI State of Kubernetes
  Optimization 2026, ~5% average GPU utilization across ~23,000 clusters
  (vendor data, say so). Academic: Microsoft Philly study, USENIX ATC'19
  (arXiv 1901.05758). Do NOT cite "NSDI'24 4–48%": no such paper found.
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
into the two price memes, then the pivot.
-->

---
class: 'meme-slide'
---

<div class="meme-frame-light">
  <img src="/meme-gpu-prices-wtf.png" alt="Two-panel meme with Joey from Friends: 'Let's check GPU prices', then a shocked face: 'WTF'." />
</div>

<!--
~5s. No words. Right after the wojak. Let it land, click.
-->

---
class: 'meme-slide'
---

<div class="meme-frame-light">
  <img src="/rtx5090-price.png" alt="Amazon Italy listing: ASUS TUF Gaming RTX 5090 OC, 32GB GDDR7, 9,330.71 euros, only 3 left." />
</div>

<!--
~8s. The receipt. A consumer RTX 5090 (32GB) listed on Amazon Italy at
EUR 9,330.71, "only 3 left". NVIDIA's launch price was USD 1,999
(Jan 2025). One beat: "That's a gaming card." Then click into "Then
things changed."
-->

---

<img class="divider-mascot" src="/brand/pulumipus-puluminary.svg" alt="" aria-hidden="true" />

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[7rem] !leading-tight !font-semibold !tracking-tight !m-0 !max-w-[95%]">
    Then things <span class="text-[var(--p-primary)]">changed.</span>
  </h1>
</div>

<!--
15s. Divider. Read it. Pause. Then say: "The hardware fix, MIG, existed
for years. What changed is that Kubernetes can finally schedule it
properly, so we could offer it as a golden path." (DRA went GA in
Kubernetes 1.34.) Walk into the next slide.
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
<li><code>productName</code>: <code>NVIDIA A100-SXM4-40GB</code>, <code>NVIDIA H100</code>, &hellip;</li>
<li><code>architecture</code>: <code>Ampere</code>, <code>Hopper</code>, <code>Blackwell</code></li>
<li><code>profile</code> + <code>parentUUID</code> (MIG devices): <code>3g.20gb</code>, <code>1g.5gb</code>, &hellip;</li>
<li>topology: <code>resource.kubernetes.io/numaNode</code>, <code>pcieRoot</code></li>
<li>capacity, not attributes: <code>memory</code>, <code>multiprocessors</code>, copy engines</li>
</ul>
</div>

<div v-click class="gpu-card gpu-card--primary">
<div class="gpu-caption gpu-caption--accent">The pattern is borrowed</div>
<p class="!mt-3 !text-[1.0rem] !leading-snug italic text-[var(--p-fg-muted)]">
"This enhancement took inspiration from dynamic provisioning for storage volumes."
<br/>Kubernetes 1.34 release blog
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

Left card: the concrete attributes the driver publishes. Product,
architecture, MIG profile and parent GPU, NUMA node and PCIe root.
Memory, SMs and copy engines are published as capacity, not attributes;
a CEL selector reads them via device.capacity["gpu.nvidia.com"].memory.
Audience members who run mixed fleets immediately get the value: "I want
a 40GB Hopper card on this NUMA node" is now a sentence the scheduler
can parse.

If asked "what changed since GA?" (Q&A ammo, not on the slide):
- Prioritized list, GA in 1.36: a request can say "a 2g slice, else a
  1g slice" (firstAvailable).
- Extended-resource mapping, GA in 1.37: a pod that still asks for
  `resources.limits: nvidia.com/gpu: 1` (the old device-plugin style) is
  served by the DRA driver, with no ResourceClaim written by the user.
  That's the migration path for old manifests.
- Device taints, GA in 1.37: an unhealthy device stays in the
  ResourceSlice with a taint instead of disappearing.
- Partitionable devices and consumable capacity: Beta, on by default
  since 1.36. The base for the driver's DynamicMIG and ConsumableShares,
  both still Alpha.

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
- Attribute and capacity names: read from the live demo cluster's
  ResourceSlice (dra-driver-nvidia-gpu v0.5.1, Nov 2 2026). Attributes:
  productName, architecture, profile, parentUUID, uuid, type,
  cudaComputeCapability, driverVersion, resource.kubernetes.io/numaNode,
  pcieRoot, pciBusID. Capacity: memory, multiprocessors, copyEngines,
  decoders, encoders, memorySlice0..N.
- Since-GA Q&A items: Kubernetes v1.36 and v1.37 DRA blog posts
  (kubernetes.io/blog/2026/09/03/kubernetes-v1-37-dra-updates/).
- Do NOT claim NVLink on this slide: it is not a device attribute.
  NVLink-aware scheduling is what ComputeDomains and Grove address.
-->

---

<img class="divider-mascot" src="/brand/pulumipus-meditating.svg" alt="" aria-hidden="true" />

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
<p v-click class="!mt-5 !text-[1.2rem] !leading-relaxed text-[var(--p-fg-muted)] !max-w-[92%]">
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
        device.attributes["gpu.nvidia.com"].type == "gpu" &&
        device.capacity["gpu.nvidia.com"].memory
          .compareTo(quantity("40Gi")) >= 0
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
    resourceSliceCount: 1
  devices:
  - name: gpu-0
    attributes:
      type: { string: "gpu" }
      productName: { string: "NVIDIA A100-PCIE-40GB" }
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

The four YAMLs on this slide and the next are one consistent example
(whole GPUs; MIG comes two slides later): the slice's gpu-0 is type gpu
with 40Gi, so it matches the large-gpu class (>= 40Gi), and it is an
Ampere card, so it also matches the template's extra filter.

Left card: DeviceClass. Show the CEL syntax — workloads reference this
by name to ask for "any device matching this expression." Same role as
StorageClass. Attributes and capacity are namespaced by driver in CEL:
device.attributes["gpu.nvidia.com"].type, device.capacity["gpu.nvidia.com"].memory.
type == "gpu" matters: the same driver also publishes MIG devices.
quantity()/compareTo() come from the Kubernetes CEL quantity library. The NVIDIA driver already
ships three DeviceClasses (gpu.nvidia.com, mig.nvidia.com,
vfio.gpu.nvidia.com); you add your own on top, e.g. one per MIG profile.

Right card: ResourceSlice. Tell the audience the YAML is illustrative —
the driver writes it, they read it via `kubectl get resourceslice`. In
the slice the attributes are bare keys (type, productName) with typed
wrappers; CEL reads them as device.attributes["gpu.nvidia.com"].X. The
real slice has more attributes (uuid, driverVersion, cudaComputeCapability,
PCI bus). The pool is per node, so usually one slice per GPU node.

Sources:
- NVIDIA DRA driver docs: dra-driver-nvidia-gpu.sigs.k8s.io/docs/reference/resourceslice-attributes/
  (slice shape, attribute names, A100-PCIE-40GB example, 40Gi memory)
- NVIDIA's own gpu.nvidia.com DeviceClass (Helm chart deviceclass-gpu.yaml):
  device.driver == 'gpu.nvidia.com' && device.attributes['gpu.nvidia.com'].type == 'gpu'
- CEL quantity library: kubernetes.io/docs/reference/using-api/cel/
- Resource API kinds GA in resource.k8s.io/v1 (1.34 release blog)
-->

---

# The workload side.

<div class="zoom-wrap">

<p v-click class="!mt-6 !text-[1.2rem] !leading-relaxed text-[var(--p-fg-muted)] !max-w-[92%]">
What app teams actually write: a one-off claim, or a template per workload.
</p>


<div class="grid grid-cols-2 gap-6 mt-5">

<div v-click class="gpu-card">

<div class="gpu-caption">ResourceClaim</div>
<p class="!mt-2 !text-[1.0rem] !leading-snug">A direct request, like a <code>PersistentVolumeClaim</code>. Every pod that references it shares the same device.</p>

```yaml
apiVersion: resource.k8s.io/v1
kind: ResourceClaim
metadata:
  name: shared-gpu
  namespace: ml-team
spec:
  devices:
    requests:
    - name: gpu
      exactly:
        deviceClassName: large-gpu
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
  name: single-gpu
  namespace: ml-team
spec:
  spec:
    devices:
      requests:
      - name: gpu
        exactly:
          deviceClassName: large-gpu
          count: 1
          selectors:
          - cel:
              expression: |
                device.attributes["gpu.nvidia.com"]
                  .architecture == "Ampere"
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
"give me one GPU", you nest deviceClassName + count under .exactly. It
points at the platform team's large-gpu class from the previous slide.
A claim created up front and referenced by several pods gives them all
the same device: that is how our demo shares one GPU later.

Right: ResourceClaimTemplate. Notice spec.spec: the outer spec is the
template, the inner spec is the claim that gets stamped out per pod.
Same class, plus a claim-level CEL filter (architecture == "Ampere"):
the class narrows what exists, the claim can narrow further. The pod
references it via spec.resourceClaims[].resourceClaimTemplateName and
containers[].resources.claims[].name.

Sources:
- Template shape (single-gpu, spec.spec, exactly.deviceClassName) follows
  NVIDIA's guide: dra-driver-nvidia-gpu.sigs.k8s.io/docs/guides/gpu-allocation/allocating-gpus/
  and demo/specs/quickstart/v1/gpu-test1.yaml in kubernetes-sigs/dra-driver-nvidia-gpu.
- ResourceClaim v1 schema (.exactly wrapper, .selectors[].cel.expression)
  per K8s 1.34 release blog and resource.k8s.io/v1 API reference.
- The demo's real claim (shared-mig-claim, MIG) is in infra/index.ts and
  shows up on the demo slides.

firstAvailable (Prioritized list, GA in 1.36), if someone asks for
fallbacks: instead of `exactly`, a request can list sub-requests in order
and the scheduler takes the first one it can satisfy:

  requests:
  - name: gpu
    firstAvailable:
    - name: 2g
      deviceClassName: mig.nvidia.com
      selectors: [{cel: {expression: 'device.attributes["gpu.nvidia.com"].profile == "2g.10gb"'}}]
    - name: 1g
      deviceClassName: mig.nvidia.com
      selectors: [{cel: {expression: 'device.attributes["gpu.nvidia.com"].profile == "1g.5gb"'}}]

Kueue caveat: Kueue supports ResourceClaimTemplates but not firstAvailable
in MultiKueue, and not pre-created shared claims (details in the notes of
"Our next steps after MIG and DRA").
-->

---

# Change two: the GPU itself can be carved.

<p class="!mt-2 !text-[1.2rem] !leading-relaxed !max-w-[92%]">
NVIDIA's Multi-Instance GPU (MIG) splits one physical card into partitions with their own streaming multiprocessors (SMs), memory, L2 cache and memory bandwidth. Hardware-enforced.
</p>

<div class="diagram-row">

<div v-click class="diagram-box">
  <div class="diagram-title">MPS</div>
  <div class="diagram-sub">Multi-Process Service</div>
  <div class="stack">
    <div class="wkld">Process</div>
    <div class="connector"></div>
    <div class="wkld">Process</div>
    <div class="connector"></div>
    <div class="wkld">CUDA Context</div>
    <div class="connector"></div>
    <div class="gpu">GPU</div>
  </div>
  <ul class="facts">
    <li>One shared CUDA context, concurrent kernels</li>
    <li>Shared memory space</li>
    <li class="bad">No fault isolation</li>
  </ul>
</div>

<div v-click class="diagram-box">
  <div class="diagram-title">Time-Slicing</div>
  <div class="diagram-sub" aria-hidden="true">&nbsp;</div>
  <div class="stack">
    <div class="wkld">Workload 1</div>
    <div class="connector"></div>
    <div class="wkld">Workload 2</div>
    <div class="connector dashed"></div>
    <div class="gpu">GPU</div>
  </div>
  <ul class="facts">
    <li>Pods take turns on the whole GPU</li>
    <li>Context-switch tax, noisy neighbours</li>
    <li class="bad">No memory or fault isolation</li>
  </ul>
</div>

<div v-click class="diagram-box diagram-box--accent">
  <div class="diagram-title">MIG</div>
  <div class="diagram-sub" aria-hidden="true">&nbsp;</div>
  <div class="stack">
    <div class="wkld">GPU Instance</div>
    <div class="connector"></div>
    <div class="wkld">GPU Instance</div>
    <div class="connector"></div>
    <div class="wkld">GPU Instance</div>
    <div class="connector"></div>
    <div class="gpu">GPU</div>
  </div>
  <ul class="facts">
    <li>Dedicated SMs, memory and cache</li>
    <li class="good">Fault isolation between slices</li>
    <li>Up to 7 slices (A100, H100), 4 on RTX PRO 6000</li>
  </ul>
</div>

</div>

<style scoped>
.diagram-row {
  margin-top: 0.9rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  align-items: stretch;
}
.diagram-box {
  background: #15132c;
  border: 1.5px solid #5b4cd6;
  border-radius: 12px;
  padding: 0.8rem 1rem 0.9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 8px 24px rgba(126, 107, 255, 0.18);
}
.diagram-box--accent {
  border-color: #c77bff;
  box-shadow: 0 8px 28px rgba(199, 123, 255, 0.3);
}
.diagram-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: #e9e7ff;
  margin-bottom: 0.6rem;
  letter-spacing: 0.02em;
}
.diagram-sub {
  font-size: 0.95rem;
  color: var(--p-fg-muted);
  margin: -0.5rem 0 0.6rem;
}
.stack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 75%;
}
.wkld, .gpu {
  border-radius: 8px;
  text-align: center;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 0.35rem 0.6rem;
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
  height: 0.4rem;
  background: #9b8cff;
  align-self: center;
}
.connector.dashed {
  background: transparent;
  border-left: 2px dashed #9b8cff;
  width: 0;
}
.facts {
  margin-top: 0.8rem;
  width: 100%;
  font-size: 1.0rem;
  line-height: 1.35;
  list-style: disc;
  padding-left: 1.2rem;
}
.facts li { margin-top: 0.25rem; }
.facts .bad { color: #ff9b9b; }
.facts .good { color: #7ad99c; font-weight: 600; }
</style>

<!--
75s. The hardware half of the story. DRA gave the scheduler the words;
MIG gives it something real to hand out. One slide, three columns, click
by click.

- MPS: every process funnels through one shared CUDA context. Concurrent
  kernels, shared memory space. One crash takes everyone with it.
- Time-slicing: workloads take turns on the whole GPU. Dashed line: no
  static binding, the runtime multiplexes them. No memory or fault
  isolation; a noisy neighbour starves the rest. (We showed this option
  on the "two options" slide; don't re-explain it.)
- MIG: each GPU Instance is a hardware partition that talks directly to
  the silicon. Dedicated SMs, memory, cache. A fault stays in its slice.
  (SM = streaming multiprocessor: the GPU's compute block. Each one runs
  the CUDA threads; a 1g slice gets its own fixed share of them.)

The takeaway is the topology: anything that funnels through one shared
layer is coordination, not isolation.

Our own scars from time-slicing, the same story from every peer we
talked to, and a rack of GPUs that already supported MIG: that's why we
went with MIG.

Honest scope: MIG is data-center cards only. Up to 7 slices on A100/H100,
4 on the RTX PRO 6000 Blackwell the demo runs on. If someone asks about
NVLink-aware multi-card scheduling, route them to the next-steps slide.

Sources:
- MPS shared context, no fault isolation: NVIDIA MPS docs.
- Time-slicing tradeoffs: NVIDIA GPU Operator docs.
- 7 slices: NVIDIA MIG User Guide. 4 on RTX PRO 6000: nvidia-smi mig
  -lgip on the demo cluster (1g.24gb 0/4).
- Diagram inspired by @sunzoomass on Medium, "How Kubernetes evolved to
  tame the GPU beast — 2025 edition", redrawn in this deck's palette.
-->

---

<img class="divider-mascot" src="/brand/pulumipus-running.svg" alt="" aria-hidden="true" />

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[7rem] !leading-tight !font-semibold !tracking-tight !m-0 text-[var(--p-primary)] !max-w-[95%]">So we built it.</h1>
</div>

<!--
5s. Beat 3 divider. Walk straight into the architecture.
-->

---
class: 'meme-slide'
---

<div class="meme-frame">
  <img src="/villager-building.gif" alt="Animated: an Age of Empires-style villager hammering away at a wooden build site." />
</div>

<!--
~5s. No words. Right after "So we built it." Let it loop once, click.
GIF source: global.discourse-cdn.com/funcom (forum upload).
-->

---

# What we shipped them, in one picture (simplified).

<div class="arch">
<div class="arch-region">
<div class="arch-region-label">AWS · eu-central-1 · VPC + private subnets</div>
<div class="arch-row">
<div class="arch-cluster">
<div class="arch-cluster-label">EKS 1.37 · gpu-dra-cluster · IRSA · Pod Identity</div>
<div class="arch-cluster-pools">
<div class="tile tile-pool tile-stacked">
<div class="tile-title">system pool</div>
<div class="tile-sub">m6i.xlarge × 2</div>
<div class="tile-meta">CoreDNS · DRA controller · gateway</div>
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
<div class="tile-meta">kubernetes-sigs · v0.5.1</div>
</div>
<div class="tile tile-svc">
<div class="tile-title">Prometheus + Grafana</div>
<div class="tile-meta">DCGM MIG dashboard · Loki · Tempo</div>
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
<div class="tile tile-svc tile-svc-accent">
<div class="tile-title">Inference gateway</div>
<div class="tile-meta">agentgateway · llm-d EPP</div>
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
<div class="tile-meta">custom CNN training</div>
</div>
<div class="tile tile-wkld tile-stacked">
<div class="tile-title">serve-a</div>
<div class="tile-sub">1g.5gb</div>
<div class="tile-meta">vLLM · Qwen3</div>
</div>
<div class="tile tile-wkld tile-stacked">
<div class="tile-title">serve-b</div>
<div class="tile-sub">1g.5gb</div>
<div class="tile-meta">vLLM · Qwen3</div>
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
EKS 1.37, two node pools, the GPU pool is the protagonist. GPU Operator
installs the driver and MIG Manager; DRA driver publishes ResourceSlices;
DCGM scrapes metrics into Prometheus; Grafana lights up the dashboard.
Training pods and two vLLM replicas in mig-test share one ResourceClaim,
each request a different MIG profile on the same physical GPU.
agentgateway plus the llm-d endpoint picker route requests to the vLLM
slices. That's the whole show. Source: infra/index.ts.
-->

---

# With MIG, every slice is a device.

<div class="mig-dra">

<p class="!mt-4 !text-[1.2rem] !leading-relaxed text-[var(--p-fg-muted)]">
Same four objects as before. The driver just publishes smaller devices.
</p>

<div class="grid grid-cols-2 gap-6 mt-4">

<div v-click class="gpu-card">

<div class="gpu-caption">ResourceSlice: three slices, one GPU</div>

```yaml
# Published by the DRA driver.
kind: ResourceSlice
spec:
  driver: gpu.nvidia.com
  devices:
  - name: gpu-0-mig-2g48gb-5-0
    attributes:
      type:       { string: "mig" }
      profile:    { string: "2g.48gb" }
      parentUUID: { string: "GPU-676c1adb-…" }
  - name: gpu-0-mig-1g24gb-14-6
    attributes:
      type:       { string: "mig" }
      profile:    { string: "1g.24gb" }
      parentUUID: { string: "GPU-676c1adb-…" }
  - name: gpu-0-mig-1g24gb-14-9   # 1g.24gb, same parent
```

</div>

<div v-click class="gpu-card gpu-card--primary">

<div class="gpu-caption gpu-caption--accent">ResourceClaim: three slices, same GPU</div>

```yaml
kind: ResourceClaim
metadata: { name: shared-mig-claim }
spec:
  devices:
    requests:
    - name: mig-large                # training
      exactly:
        deviceClassName: mig.nvidia.com
        selectors:
        - cel:
            expression: |
              device.attributes["gpu.nvidia.com"]
                .profile == "2g.48gb"
    # mig-serve-a, mig-serve-b: same, "1g.24gb"
    constraints:
    - matchAttribute: gpu.nvidia.com/parentUUID
      requests: [mig-large, mig-serve-a, mig-serve-b]
```

</div>

</div>

<p v-click class="!mt-5 !text-[1.35rem] !leading-snug">
Each pod picks its slice: <code>resources.claims: [{ name: mig, request: mig-serve-a }]</code>. The scheduler finds three slices that share one <code>parentUUID</code>.
</p>

</div>

<style scoped>
.mig-dra :deep(pre) { font-size: 0.86rem !important; line-height: 1.38 !important; }
</style>

<!--
~75s. The MIG version of the two DRA slides. Same objects, nothing new
to learn: MIG just makes the driver publish smaller devices.

Click 1, left: the ResourceSlice from our demo node (Nov 2 2026, RTX PRO
6000, layout all-balanced). The driver publishes each MIG slice as its
own device with type: mig, its profile, and parentUUID = the physical
GPU it was cut from. Three slices, one parentUUID. (Trimmed: the real
slice also has uuid, productName, capacity memory/multiprocessors/...)

Click 2, right: our real claim from infra/index.ts, trimmed. Three
requests, each pinned to a profile with CEL, all on NVIDIA's built-in
mig.nvidia.com class (it selects type == 'mig'). The constraint
matchAttribute: gpu.nvidia.com/parentUUID says "all three must share the
same parent GPU". We never hardcode a UUID: the scheduler finds three
slices that fit together.

Click 3: how pods use it. Every pod references the same claim and picks
its request by name. Training gets mig-large, vLLM A and B get the two
1g slices. That's the whole trick behind "one GPU, three pods".

Bridge from the earlier slides: the class still narrows (type == mig),
the claim still narrows further (profile). In production you'd give
each size its own DeviceClass (rollout slide, card 02), so teams write
deviceClassName: mig-1g-24gb instead of CEL.

Sources:
- Device names, profiles, parentUUID: our demo cluster, Nov 2 2026
  (also visible in the recorded demo). A rebuilt node gets a new UUID.
- Claim: infra/index.ts (shared-mig-claim).
- MIG slice shape and the mig.nvidia.com class selector:
  dra-driver-nvidia-gpu.sigs.k8s.io/docs/reference/resourceslice-attributes/
  and the chart template deviceclass-mig.yaml.
- Same-GPU constraint pattern: NVIDIA's MIG guide, "Request multiple MIG
  devices from the same GPU" (matchAttribute: gpu.nvidia.com/parentUUID).
-->

---

<img class="divider-mascot" src="/brand/pulumipus-thinking.svg" alt="" aria-hidden="true" />

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[7rem] !leading-tight !font-semibold !tracking-tight !m-0 !max-w-[95%]">
    Why an <span class="text-[var(--p-primary)]">inference gateway</span>?
  </h1>
</div>

<!--
~5s. Divider. Ask it out loud, pause, click. The slices are scheduled;
now the question is how requests reach the right one.
-->

---

# One gateway, many slices.

<div class="gw">
  <div class="gw-flow">
    <div class="gw-node">Client<span>OpenAI-compatible API</span></div>
    <div class="gw-arrow"></div>
    <div class="gw-node gw-accent">agentgateway<span>Gateway API + HTTPRoute</span></div>
    <div class="gw-arrow"></div>
    <div class="gw-node gw-accent">llm-d endpoint picker<span>InferencePool: scores queue, KV cache, prefix hits</span></div>
    <div class="gw-arrow"></div>
    <div class="gw-pair">
      <div class="gw-node gw-slice">vLLM serve-a<span>1g MIG slice</span></div>
      <div class="gw-node gw-slice">vLLM serve-b<span>1g MIG slice</span></div>
    </div>
  </div>

  <div class="gw-why">
    <div v-click class="gw-card">
      <div class="gw-h">A Service balances blind.</div>
      <p>kube-proxy picks a pod per connection, at random. It can't see which replica is busy. On a 1g slice, one bad pick is a latency spike.</p>
    </div>
    <div v-click class="gw-card">
      <div class="gw-h">The picker reads the slices.</div>
      <p>Per request, llm-d's endpoint picker scores each vLLM replica on queue depth, KV-cache use and prefix-cache hits, then sends it to the best one.</p>
    </div>
    <div v-click class="gw-card">
      <div class="gw-h">Standard APIs, swappable parts.</div>
      <p>Gateway API Inference Extension defines the InferencePool. agentgateway is our gateway today; any conformant one works.</p>
    </div>
  </div>
</div>

<style scoped>
.gw { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 3rem; margin-top: 1.8rem; align-items: start; }
.gw-flow { display: flex; flex-direction: column; align-items: stretch; }
.gw-node {
  background: var(--p-bg-elevated); border: 1.5px solid var(--p-border); border-radius: 12px;
  padding: 0.7rem 1.1rem; font-weight: 700; font-size: 1.15rem; text-align: center;
}
.gw-node span { display: block; margin-top: 0.2rem; font-weight: 400; font-size: 0.9rem; color: var(--p-fg-muted); }
.gw-accent { border-color: color-mix(in srgb, var(--p-primary) 70%, var(--p-border)); background: color-mix(in srgb, var(--p-primary) 14%, var(--p-bg-elevated)); }
.gw-slice { border-style: dashed; }
.gw-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; }
.gw-arrow { height: 1.6rem; position: relative; }
.gw-arrow::before { content: ""; position: absolute; left: 50%; top: 0.15rem; bottom: 0.45rem; border-left: 2px solid var(--p-primary); }
.gw-arrow::after { content: ""; position: absolute; left: calc(50% - 6px); bottom: 0.1rem; border: 6px solid transparent; border-top: 8px solid var(--p-primary); border-bottom: 0; }
.gw-why { display: flex; flex-direction: column; gap: 1.1rem; }
.gw-card { border-left: 4px solid var(--p-primary); padding: 0.4rem 0 0.4rem 1.2rem; }
.gw-h { font-size: 1.4rem; font-weight: 700; line-height: 1.25; }
.gw-card p { margin: 0.4rem 0 0 !important; font-size: 1.08rem; line-height: 1.45; color: var(--p-fg-muted); }
</style>

<!--
60s. Why the demo has a gateway at all. Walk the flow top to bottom,
then the three reasons.

The flow: a client sends an OpenAI-style request to agentgateway (the
Gateway API implementation, v1.7.0). The HTTPRoute points at an
InferencePool instead of a Service. For every request the gateway asks
the llm-d router's endpoint picker (EPP, v1.0.0) which vLLM pod to use.
The EPP scores the pods on queue depth, KV-cache use and prefix-cache
hits, and the gateway forwards to the winner. Each vLLM replica sits on
its own 1g MIG slice and serves Qwen3-8B in FP8.

Why, as one argument (default is blind -> the gateway sees -> it's standard):
- A Service balances blind. kube-proxy (iptables/nftables mode, the
  default) picks a backend at random when the connection opens, not per
  request. LLM clients keep HTTP connections alive, so one client can
  stick to one replica. It sees no load, no cache. On a small 1g slice a
  bad pick shows up straight away as latency. (IPVS mode can round-robin,
  but still per connection and still blind.)
- The picker reads the slices. Per request, the EPP scores each replica
  on queue depth, KV-cache utilization and prefix-cache hits and the
  gateway forwards to the best one. Clients still call one URL; a new
  replica on a free slice joins the InferencePool by label.
- Caveat from our own load tests: prefix-cache scoring pins identical
  prompts to the replica that already has them cached. Load-test with
  varied prompts or one replica runs hot while the other idles.
- Standard APIs: Gateway API + the Inference Extension (InferencePool,
  v1.6.2). The EPP is the llm-d router. agentgateway is swappable for any
  conformant gateway (Envoy Gateway, kgateway, GKE, Istio).

Sources: infra/index.ts (versions block, inference gateway section);
gateway-api-inference-extension docs; llm-d router v1.0.0 release.
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

<img class="divider-mascot" src="/brand/pulumipus-walking.svg" alt="" aria-hidden="true" />

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
~25s. The recorded demo, played first so the room sees the whole flow
once at a calm pace. Then the next slides walk the same steps (live if
the cluster is up, the terminal slides as fallback). If the cluster is
down, this slide is the demo. Either way: stay quiet during the keeper command (the for-loop). The same
parent GPU UUID across three pods is the visual. It ends with a real
answer from Qwen3, routed through the gateway to a 1g slice.

Recorded Nov 2 2026 via Charm VHS (demo.tape) against the live cluster.
Re-render from slides-kubecon-na-2026/:
`pulumi env run ediri/pulumi-idp/auth -- env KUBECONFIG=/tmp/kubeconfig vhs demo.tape`
-->

---
class: 'meme-slide'
---

<img src="/grafana-mig-climbing.png"
     alt="Grafana NVIDIA DCGM MIG dashboard showing three MIG slices on one RTX PRO 6000: one training slice and two vLLM slices under load"
     class="absolute inset-0 w-full h-full object-cover" />

<div class="absolute top-8 left-12 right-12 z-10">
  <h1 class="!text-[3.4rem] !leading-tight !font-semibold !tracking-tight !m-0 text-white"
      style="text-shadow: 0 2px 16px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,1);">
    Live: <span class="text-[var(--p-primary)]">three workloads</span>, climbing.
  </h1>
</div>

<!--
60s. Switch to Grafana in the browser. Three slices, three colored lines:
the training slice and the two vLLM slices under request load. Stay quiet
for ten seconds while the dashboard does the talking. Then: "That's what
an idle GPU becomes when the scheduler can see the slices." Walk into the
next slide.

Fallback screenshot: public/grafana-mig-climbing.png (recorded Nov 2 2026
on the RTX PRO 6000 demo cluster, with load through the gateway).

Story if there's time ("dashboards lie"): the stock grafana.com dashboard
16640 plots DCGM_FI_PROF_GR_ENGINE_ACTIVE, a 0-1 ratio, on a percent axis,
so 60% showed as 0.6%. We ship a fixed copy (x100) in infra/dashboards/.
dcgm-exporter 4.8.3 also renamed the Hostname label to hostname, which
breaks older dashboards.

If asked about the training dip (61% to 48%): mostly the dashboard.
Measured, training loses about 5%, all in its CPU data loader sharing the
node with vLLM; the GPU step time doesn't change. See DEMO.md Part 4.

If one vLLM line stays flat: the llm-d endpoint picker scores prefix-cache
hits, so a load test with one identical prompt pins one replica. Load-test
with varied prompts.
-->

---

<div class="zoom-content">

```bash
# The GPU node and its MIG layout.
$ kubectl get nodes -l node-role=gpu -L nvidia.com/gpu.machine,nvidia.com/mig.config
NAME                           STATUS   ROLES    AGE   VERSION               GPU.MACHINE   MIG.CONFIG
ip-10-0-107-255.ec2.internal   Ready    <none>   10h   v1.37.1-eks-6e7947a   g7e.4xlarge   all-balanced

# Which MIG profiles does this GPU support? (Instances = free/total)
$ kubectl exec -n gpu-operator ds/nvidia-mig-manager -c nvidia-mig-manager -- \
    nvidia-smi mig -lgip | grep -E 'Name|Free/Total|MIG [0-9]g\.[0-9]+gb '
| GPU   Name               ID    Instances   Memory     P2P    SM    DEC   ENC  |
|                                Free/Total   GiB              CE    JPEG  OFA  |
|   0  MIG 1g.24gb         14     0/4        23.62      No     46     1     1   |
|   0  MIG 2g.48gb          5     0/2        47.38      No     94     2     2   |
|   0  MIG 4g.96gb          0     0/1        95.00      No     188    4     4   |

# What the DRA driver publishes to the scheduler: the slices that exist now.
$ kubectl get resourceslices -o jsonpath='{"DEVICE\t\t\tPROFILE\tPARENT GPU\n"}{range .items[*].spec.devices[*]}...'
DEVICE                  PROFILE PARENT GPU
gpu-0-mig-2g48gb-5-0    2g.48gb GPU-676c1adb-1b9d-b501-13e6-05cc9b040785
gpu-0-mig-1g24gb-14-6   1g.24gb GPU-676c1adb-1b9d-b501-13e6-05cc9b040785
gpu-0-mig-1g24gb-14-9   1g.24gb GPU-676c1adb-1b9d-b501-13e6-05cc9b040785
```

</div>

<style scoped>
.zoom-content { zoom: 0.86; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.zoom-content pre { font-size: 1.05rem !important; line-height: 1.45 !important; }
</style>

<!--
BACKUP (with the next slide). Use these two only if the live terminal
demo fails or you need the output on screen; otherwise skip to Day 1 /
Day 30.

Demo part 1, about 60s: the GPU before any pod. Three questions.
1. The node: a g7e.4xlarge, MIG layout all-balanced, applied by the GPU
   Operator's MIG Manager from the node label.
2. What the card can be cut into: nvidia-smi mig -lgip from the MIG Manager
   pod, which has the whole GPU. The RTX PRO 6000 supports 1g.24gb (up to
   4), 2g.48gb (up to 2) and 4g.96gb (the whole card). Free is 0 everywhere
   because all-balanced already uses the card: 1x 2g.48gb + 2x 1g.24gb.
3. What the scheduler sees: the ResourceSlice from the DRA driver. Three
   devices, each with a profile and the same parentUUID. That parentUUID is
   the attribute our shared claim's matchAttribute constraint uses.

Why an RTX PRO 6000 and not an A100/H100: on Nov 1 2026 there was no
on-demand p4d, p4de or p5.4xlarge in us-east-1, us-east-2 or us-west-2. A
p4de Capacity Block was about $488, prepaid and non-refundable. The card
is one config key in the Pulumi stack (gpuInstanceType).

Full command for the ResourceSlice (the slide shortens it):
kubectl get resourceslices -o jsonpath='{"DEVICE\t\t\tPROFILE\tPARENT GPU\n"}{range .items[*].spec.devices[*]}{.name}{"\t"}{.attributes.profile.string}{"\t"}{.attributes.parentUUID.string}{"\n"}{end}'
-->

---

<div class="zoom-content">

```bash
# Which pod asks for which request of the shared ResourceClaim?
$ kubectl get pods -n mig-test -o custom-columns='POD:.metadata.name,NODE:.spec.nodeName,
    REQUEST:.spec.containers[0].resources.claims[0].request'
POD                                        NODE                           REQUEST
llm-d-inference-gateway-85bcc65df8-rsbld   ip-10-0-42-66.ec2.internal     <none>
mig-large-training-pod                     ip-10-0-107-255.ec2.internal   mig-large
qwen3-epp-5689fc9496-7ntvq                 ip-10-0-42-66.ec2.internal     <none>
vllm-qwen3-a-6885d59876-n4g85              ip-10-0-107-255.ec2.internal   mig-serve-a
vllm-qwen3-b-6795466874-jj4n7              ip-10-0-107-255.ec2.internal   mig-serve-b

# Which slice did the scheduler give each request?
$ kubectl get resourceclaim shared-mig-claim -n mig-test -o jsonpath='{"REQUEST\t\tDEVICE\n"}...'
REQUEST         DEVICE
mig-large       gpu-0-mig-2g48gb-5-0
mig-serve-a     gpu-0-mig-1g24gb-14-6
mig-serve-b     gpu-0-mig-1g24gb-14-9

# Proof from inside: same GPU UUID, different MIG UUIDs.
$ for t in pod/mig-large-training-pod deploy/vllm-qwen3-a deploy/vllm-qwen3-b; do
>   kubectl exec -n mig-test $t -- nvidia-smi -L; done
GPU 0: NVIDIA RTX PRO 6000 Blackwell Server Edition (UUID: GPU-676c1adb-1b9d-...)
  MIG 2g.48gb     Device  0: (UUID: MIG-945cb005-349a-55fd-...)
GPU 0: NVIDIA RTX PRO 6000 Blackwell Server Edition (UUID: GPU-676c1adb-1b9d-...)
  MIG 1g.24gb     Device  0: (UUID: MIG-edf5d3ce-15cf-55d8-...)
GPU 0: NVIDIA RTX PRO 6000 Blackwell Server Edition (UUID: GPU-676c1adb-1b9d-...)
  MIG 1g.24gb     Device  0: (UUID: MIG-9cf287a1-f02c-5581-...)

# A real request through the gateway, answered from a 1g slice.
$ curl -sS http://$GW/v1/chat/completions -d '{"model":"Qwen/Qwen3-8B-FP8",...}' | jq -r ...
Sharing a GPU allows teams to efficiently utilize computational resources, reducing costs and improving access to high-performance computing. …
```

</div>

<style scoped>
.zoom-content { zoom: 0.8; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.zoom-content pre { font-size: 1.05rem !important; line-height: 1.45 !important; }
</style>

<!--
BACKUP (with the previous slide). Skip if the live demo worked.

Demo part 2, about 2 minutes. Walk the chain: pod -> request -> slice.
The custom-columns show each GPU pod's request name from the shared claim
(gateway and endpoint picker have none and run on the system node). The
claim's allocation maps each request to a device from the ResourceSlice on
the previous slide. The keeper moment is the nvidia-smi loop: same GPU
UUID at the top, three different MIG UUIDs underneath. One slice trains,
two slices serve. Then the curl: the request goes through agentgateway, the
llm-d endpoint picker chooses a replica, and a 1g slice answers. If
something is wrong, play the recording on the next-but-one slide.

Demo hardware: one RTX PRO 6000 Blackwell (AWS g7e.4xlarge, MIG
all-balanced = 1x 2g.48gb + 2x 1g.24gb), because no A100 was available
on-demand in Nov 2026. Same MIG, same DRA, same story as the customer's A100s.

If asked about routing: with identical prompts the endpoint picker keeps
everything on one replica (prefix-cache affinity); varied prompts spread
across both.
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
this next slide will close. Don't answer it yet. Click into the next steps.
-->

---

# Our next steps after MIG and DRA.

<div class="zoom-content">

<div class="grid grid-cols-[1.35fr_1fr] gap-8 mt-14">
  <div v-click class="gpu-card gpu-card--accent">
    <div class="gpu-caption gpu-caption--accent">Next quarter</div>
    <ul class="!mt-4 !text-[1.1rem] !leading-snug space-y-4">
      <li><strong>Kueue</strong>: MIG quota per team. Answers "whose workload runs first?"</li>
      <li><strong>Group-shared claims</strong> (K8s 1.37, Beta): replace our hand-built shared claim.</li>
      <li><strong>Admission policy in-cluster</strong>: the policy pack's rules for <code>kubectl</code> too.</li>
      <li><strong>llm-d, next layer</strong>: KV-cache routing, autoscaling on EPP and vLLM metrics.</li>
      <li><strong>Pilots</strong>: ConsumableShares and DynamicMIG on an H100 pool.</li>
    </ul>
  </div>

  <div v-click class="gpu-card">
    <div class="gpu-caption gpu-caption--muted">Options we're watching</div>
    <ul class="!mt-4 !text-[1.1rem] !leading-snug space-y-5">
      <li><strong>KAI Scheduler</strong>: GPU-aware fair share and gang scheduling. CNCF sandbox, v0.18.</li>
      <li><strong>NVIDIA Grove</strong>: multi-pod inference topologies across NVLink. Beta, v0.2.</li>
      <li><strong>KServe</strong> <code>LLMInferenceService</code>: <span class="whitespace-nowrap">llm-d</span> behind one CR.</li>
      <li><strong>NVIDIA AICR</strong>: validated, version-locked recipes for the GPU stack, with drift checks. Also available as Pulumi provider.</li>
    </ul>
  </div>
</div>


</div>

<style scoped>
.zoom-content { zoom: 1.12; }
</style>

<!--
90s. Answer the Day 30 question from the slide before. The gateway is
already in the demo (agentgateway + the llm-d endpoint picker); this is
what comes after it. Two clicks: first the left card, then the right. Walk the left card top
to bottom, then the right card in one breath.

Next quarter, in order:
- Kueue first. A ClusterQueue per team with quota on MIG slices
  (counter-based quota, Kueue v0.20.x). That is the answer to "whose
  workload runs first?" and it's the upstream-blessed quota layer.
- Group-shared claims: KEP-5729, PodGroup-level ResourceClaims, Beta in
  1.37 and off by default. It's the upstream form of our one shared
  claim with matchAttribute. Honest caveat: Kueue can't admit our
  pre-created shared claim today; KEP-5729 is how that gets resolved.
  We turn it on when EKS exposes the gate.
- Admission: the Pulumi policy pack only sees what Pulumi deploys. A CEL
  ValidatingAdmissionPolicy on ResourceClaims enforces the same profile
  list at the API server.
- llm-d beyond the router we run today: KV-cache-aware routing, and HPA
  or KEDA on EPP queue depth and vLLM metrics. Prefill/decode
  disaggregation only makes sense on whole-GPU pools, not 1g slices.
- Pilots, both Alpha: ConsumableShares for independent inference claims,
  DynamicMIG on H100 and newer (A100 can't flip MIG without a reset).

Options, each with its maturity:
- KAI: CNCF sandbox, v0.18.x, pre-1.0. Replaces kube-scheduler for its
  pods, DRA support is off by default. Worth it if you need GPU-specific
  fair share beyond what Kueue gives you.
- Grove: v0.2.0-beta1 (Oct 30 2026), moved to ai-dynamo/grove, upgraded
  in lockstep with Dynamo. Built for NVLink domains, not MIG slices.
- KServe LLMInferenceService: the managed way to run llm-d if you
  already use KServe.
- NVIDIA AI Cluster Runtime (AICR), v1.2.0 (Nov 2 2026), Apache 2.0.
  Known-good, version-locked "recipes" of drivers, operators and K8s
  settings, rendered as Helm values and manifests for your own tooling
  ("Not a cluster provisioner"). aicr validate checks a live cluster
  against the recipe (optional NCCL/performance phases); aicr diff
  compares snapshots for drift. v1.2.0 ships dra-driver-nvidia-gpu
  0.5.1, the same as ours. Pulumi provider: nvidia-aicr (Pulumi Labs,
  v0.3.2, Aug 31 2026), resource ClusterStack(accelerator, service,
  intent); accepts rtx-pro-6000 and eks.
  Why only "watching" (Q&A: "are you using it?" -> "Not yet."):
  - No MIG layout configuration in the recipes we could read. MIG is
    the core of this talk.
  - EKS 1.37 not mentioned; nightly runs are on H100, the qualified EKS
    combo is EKS + H100. RTX PRO 6000 on EKS has no stated support level.
  - Stock recipes disable whole-GPU DRA; its docs: "Whole-GPU DRA and the
    GPU Operator device plugin (nvidia.com/gpu) are mutually exclusive
    per node."
  - Validation jobs run privileged with cluster-admin: needs a Kyverno
    exception.

Close by saying it: "MIG isolates. DRA describes. Kueue admits. The
gateway routes." (Spoken only; it's no longer on the slide.)

Sources:
- reports/GPU sharing successor stack.md (research, Oct 31 2026)
- kubernetes.io/blog/2026/09/08/kubernetes-v1-37-advancing-workload-aware-scheduling/
- github.com/kai-scheduler/KAI-Scheduler
- github.com/ai-dynamo/grove/releases/tag/v0.2.0-beta1
- github.com/NVIDIA/aicr, docs.nvidia.com/aicr,
  pulumi.com/registry/packages/nvidia-aicr
-->

---

<img class="divider-mascot" src="/brand/pulumipus-meditating.svg" alt="" aria-hidden="true" />

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <lucide-lab-elephant class="elephant" />
  <h1 class="!text-[5.5rem] !leading-tight !font-semibold !tracking-tight !m-0 !mt-4 text-[var(--p-primary)]">The elephant in the room.</h1>
  <p class="!mt-8 !text-[2.4rem] !leading-snug">Large, as in <strong class="text-[var(--p-primary)]">Large</strong> Language Model.</p>
</div>

<style scoped>
.elephant { font-size: 10rem; color: var(--p-accent); }
</style>

<!--
10s. Say it before someone in Q&A does: "Everything you saw today fits
on a slice. An 8B model in FP8 with a 32k context runs on a quarter of
this card. What about the really big ones?" Then click.
-->

---
class: 'meme-slide'
---

<div class="meme-frame">
  <img src="/address-the-elephant.jpg" alt="An elephant standing in an office among knocked-over chairs, with the caption 'Address me'." />
</div>

<!--
~5s. No words. Let the elephant ask for itself, then click into the
ladder: slice, node, bigger than a node.
Image source: preview.redd.it (Reddit upload), saved locally.
-->

---

# This is where it gets interesting.

<ul class="ladder">
  <li><span class="rung">Fits a slice</span> MIG + DRA. Everything you saw today.</li>
  <li><span class="rung">Fits one node</span> Whole GPUs. vLLM cuts every layer into pieces, one per GPU (tensor parallelism), ideally over NVLink.</li>
  <li><span class="rung">Bigger than that</span> Two patterns:</li>
</ul>

<div class="big grid grid-cols-2 gap-6 mt-3">

<div v-click class="gpu-card">
  <div class="gpu-caption gpu-caption--accent">Bigger than one node</div>

```mermaid {look: 'handDrawn', theme: 'base', scale: 0.9, themeVariables: {fontFamily: 'Inter, sans-serif', fontSize: '19px', primaryColor: '#241c45', primaryBorderColor: '#9077f3', primaryTextColor: '#e9e7ff', lineColor: '#c3bdff', clusterBkg: 'transparent', clusterBorder: '#6b5bb5', edgeLabelBackground: '#1b1630', titleColor: '#c3bdff'}}
flowchart LR
  R(["Service<br/>(leader)"]) --> L
  subgraph G["LeaderWorkerSet: one group"]
    L["Leader pod<br/>node A: 8 GPUs<br/>layers 1 to n/2"]
    W["Worker pod<br/>node B: 8 GPUs<br/>layers n/2 to n"]
    L <-->|"RDMA"| W
  end
```

  <dl class="facts">
    <dt>Example</dt><dd>Llama 3.1 405B on 2 nodes × 8 GPUs.</dd>
    <dt>Split</dt><dd>Each layer across a node's 8 GPUs. The layers across the 2 nodes.</dd>
    <dt>Runs as</dt><dd>One LWS group: created, updated, scaled and restarted together.</dd>
    <dt>Needs</dt><dd>Fast links between nodes: InfiniBand, RoCE or EFA.</dd>
  </dl>
</div>

<div v-click class="gpu-card gpu-card--accent">
  <div class="gpu-caption gpu-caption--accent">Frontier Mixture-of-Experts (MoE) models</div>

```mermaid {look: 'handDrawn', theme: 'base', scale: 0.9, themeVariables: {fontFamily: 'Inter, sans-serif', fontSize: '19px', primaryColor: '#241c45', primaryBorderColor: '#9077f3', primaryTextColor: '#e9e7ff', lineColor: '#c3bdff', clusterBkg: 'transparent', clusterBorder: '#6b5bb5', edgeLabelBackground: '#1b1630', titleColor: '#c3bdff'}}
flowchart LR
  R(["llm-d<br/>router"]) --> D
  subgraph S["DisaggregatedSet: two LWS roles"]
    D["Decode pool<br/>16 GPUs<br/>writes the answer"]
    P["Prefill pool<br/>16 GPUs<br/>reads the prompt"]
    D -->|"1 prefill"| P
    P ==>|"2 KV cache"| D
  end
```

  <dl class="facts">
    <dt>Example</dt><dd>DeepSeek-R1 on 32× H200 (llm-d reference).</dd>
    <dt>Split</dt><dd>Experts spread over GPUs. Prompt and answer on separate pools.</dd>
    <dt>Runs as</dt><dd>llm-d picks both pods. KV cache moves over NIXL.</dd>
    <dt>Needs</dt><dd>RDMA. On GB200 NVL72, a DRA <code>ComputeDomain</code>: <strong>same driver as our slices.</strong></dd>
  </dl>
</div>

</div>

<style scoped>
.ladder { margin: 0.6rem 0 0 0 !important; padding: 0 !important; list-style: none; }
.ladder li { margin: 0.55rem 0 !important; font-size: 1.4rem; display: flex; align-items: baseline; gap: 0.8rem; }
.ladder li::before { content: '▸'; color: var(--p-accent); }
.ladder .rung { font-family: 'Monaspace Neon', ui-monospace, monospace; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--p-accent); min-width: 14rem; }
.big .gpu-card { padding: 0.9rem 1.3rem 1rem; }
.big :deep(.mermaid) { display: flex; justify-content: center; margin: 0.2rem 0 0.1rem; }
.big :deep(.mermaid svg) { max-width: 100%; height: auto; }
.facts { display: grid; grid-template-columns: 5.6rem 1fr; gap: 0.55rem 0.8rem; margin: 0.6rem 0 0; font-size: 1.05rem; line-height: 1.3; }
.facts dt { font-family: 'Monaspace Neon', ui-monospace, monospace; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--p-accent); padding-top: 0.2rem; }
.facts dd { margin: 0; }
</style>

<!--
75s. The honest answer to "this is just a demo". Walk the three ladder
lines in one breath, then click for the left card, click for the right card.

Ladder:
- Fits one GPU or a slice: run copies. vLLM docs: "if the model fits on
  a single GPU, distributed inference is probably unnecessary."
- Fits one node: tensor_parallel_size = GPUs in the node. Wants NVLink;
  on cards without it (L40S) vLLM recommends pipeline parallel instead.

Left card (click). (LWS v1.0.0, Oct 16 2026). This is the official LWS vLLM
example, not our invention: Llama-3.1-405B-Instruct, size 2 (leader +
1 worker), 8 GPUs each, --tensor-parallel-size 8
--pipeline-parallel-size 2, restartPolicy RecreateGroupOnPodRestart
(one pod dies, the group is recreated). vLLM runs multi-node with its
own multiprocessing backend (--nnodes / --node-rank); Ray is optional.
vLLM docs: cross-node traffic "preferably" over InfiniBand + GPUDirect
RDMA; NCCL logging "via NET/Socket" means slow TCP.
Exposed the way the official example does it: a plain ClusterIP Service
(vllm-leader) that targets the leader pods. No router or InferencePool
in that example, and llm-d doesn't document routing to multi-node LWS
groups, so the diagram starts with the Service, not llm-d.

Right card (click). llm-d 1.0 (Oct 20 2026) wide-EP guide. The router
(EPP) picks a decode pod AND a prefill pod. The request goes to the
decode pod's routing sidecar, which sends the prompt to the prefill pod
(1), then the decode pod pulls the KV cache over NIXL (2) and writes
the answer. If most of the prompt is already cached on the decode pod,
the decider skips prefill. Default: DeepSeek-R1-0528, prefill DP16 +
decode DP16 (two nodes each) on 32 H200, DeepEP all-to-all; validated
nightly on InfiniBand (CoreWeave) and RoCE (GKE). llm-d: without RDMA
"NIXL falls back to TCP ... only for testing and development."
Deployment (llm-d wide-EP guide, re-checked Nov 10): on NVIDIA and AMD it
is "a single DisaggregatedSet that manages the prefill and decode
LeaderWorkerSets as one versioned unit" (Intel XPU uses two plain LWS).
Needs the LWS controller v0.11.1+ with enableDisaggregatedSet=true. The
router's InferencePool targets every data-parallel rank, so it picks a
DP rank, not just a pod.
llm-d's DeepSeek-V4-Pro recipe runs on GB200 NVL72 (16 to 56 GPUs); its
cross-node NVLink comes from a ComputeDomain of the NVIDIA DRA driver,
the same dra-driver-nvidia-gpu we run for MIG (v0.5.1 ships
ComputeDomain fixes).

Q&A (was the footer): KServe v0.21 LLMInferenceService creates a LeaderWorkerSet when
you set spec.worker (and per role for prefill/decode); KServe's
dependency installer installs the LWS controller. DisaggregatedSet
support is on KServe main, not in v0.21.

Q&A ammo: "Can I split one model across MIG slices?" No. Since R570 a
process can see several MIG instances and P2P works between slices of
one GPU, but NVIDIA's MIG guide says "NCCL is currently not supported
with MIG", and vLLM tensor parallel runs on NCCL. Two 1g slices are
about one 2g slice anyway: take the bigger slice.

Sources:
- docs.vllm.ai/en/latest/serving/parallelism_scaling.html
- github.com/kubernetes-sigs/lws (README, docs/examples/leaderworkerset/basic/vllm.yaml)
- lws.sigs.k8s.io/stable/docs/examples/leaderworkerset/basic/ (vllm.yaml, vllm-leader Service)
- lws.sigs.k8s.io/docs/concepts/disaggregatedset/ (KEP-766)
- llm-d.ai/docs/well-lit-paths/foundations/wide-expert-parallelism
- github.com/llm-d/llm-d: guides/wide-ep, guides/pd-disaggregation,
  guides/models/deepseek-v4, docs/architecture/disaggregation/pd-disaggregation.md
- github.com/kserve/kserve: pkg/controller/v1alpha2/llmisvc/workload_multi_node.go (v0.21.0)
- docs.nvidia.com/datacenter/tesla/mig-user-guide/latest/deployment-considerations.html
- developer.nvidia.com/blog/enabling-multi-node-nvlink-on-kubernetes-for-gb200-and-beyond/
-->

---

<img class="divider-mascot" src="/brand/pulumipus-puluminary.svg" alt="" aria-hidden="true" />

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[6.5rem] !leading-tight !font-semibold !tracking-tight !m-0 text-[var(--p-primary)] !max-w-[95%]">Takeaways from our pain for you!</h1>
</div>

<!--
5s. Beat 4 divider. The customer's story is over. Pivot the room: now
it's your story. Everything that follows is what hurt us, so it doesn't
hurt you. Click to the headache meme.
-->

---
class: 'meme-slide'
---

<div class="meme-frame-light">
  <img src="/meme-headache-inference.png" alt="Types of Headaches meme: migraine, hypertension, stress, and a fully red head captioned 'Creating an AI inference platform from scratch'." />
</div>

<style scoped>
/* match the meme's off-white so the letterbox disappears */
.meme-frame-light { background: #f9f9f9; }
</style>

<!--
~8s. No words. Let the room read the red head and laugh. Then walk into
"When DRA + MIG beats time-slicing".
-->

---

# When DRA + MIG beats time-slicing.

<div class="zoom-content">

<div class="grid grid-cols-2 gap-8 mt-4">
  <div v-click class="gpu-card gpu-card--primary">
    <div class="gpu-caption gpu-caption--accent">Reach for MIG + DRA when</div>
    <ul class="!mt-3 !text-[1.15rem] !leading-snug space-y-2">
      <li>Several teams or tenants share one card.</li>
      <li>You have latency targets: no neighbour may steal SMs or memory bandwidth.</li>
      <li>The model fits a slice: 5&ndash;20 GB on an A100 40GB, 24&ndash;48 GB on an RTX PRO 6000.</li>
      <li>Training and serving run on the same card.</li>
      <li>You want to charge per slice, not per card.</li>
    </ul>
  </div>

  <div v-click class="gpu-card gpu-card--muted">
    <div class="gpu-caption gpu-caption--muted">Time-slicing is still fine when</div>
    <ul class="!mt-3 !text-[1.15rem] !leading-snug space-y-2">
      <li>One team, trusted workloads.</li>
      <li>Notebooks, dev boxes, CI smoke tests.</li>
      <li>Bursty jobs that need the whole card for a moment.</li>
      <li>The card has no MIG: L4, A10G, consumer GPUs.</li>
      <li>You can live without memory or fault isolation.</li>
    </ul>
  </div>
</div>

<p v-click class="!mt-6 !text-[1.3rem] !leading-relaxed text-[var(--p-primary)] !font-semibold text-center">
  If an OOM or a crash in one pod must not touch another, it's MIG.
</p>

</div>

<style scoped>
.zoom-content { zoom: 1.15; }
</style>

<!--
60s. This answers the abstract's promise: when does DRA + MIG beat
time-slicing. Left card first, then right, then the rule of thumb.

Left: isolation, predictable latency, a model that fits a slice, mixed
training + serving (our demo), and cost per slice. Mention the slice
sizes: an A100 40GB slice is 5, 10 or 20 GB; on the RTX PRO 6000 it's 24
or 48 GB, enough for a 7-8B model on the smallest slice.

Right: time-slicing isn't wrong. One trusted team, notebooks, bursty jobs
that want the whole card, and every card without MIG. MPS sits in
between: more throughput for trusted inference, still no fault isolation.

Rule of thumb: if one pod's OOM or crash must not touch another, it's MIG.
-->

---

# How to roll it out safely.

<div class="rollout">
  <div v-click class="rcard">
    <div class="rnum">01</div>
    <div class="rtitle">Pick slice sizes per node pool</div>
    <div class="rbody">Label the pool, e.g. <code>mig.config=all-balanced</code>. Changing it later means emptying the GPUs first.</div>
  </div>
  <div v-click class="rcard">
    <div class="rnum">02</div>
    <div class="rtitle">Give each slice size a name</div>
    <div class="rbody">The driver has one class for all MIG slices. Add one per size, e.g. <code>mig-1g-24gb</code>.</div>
  </div>
  <div v-click class="rcard">
    <div class="rnum">03</div>
    <div class="rtitle">Guard twice</div>
    <div class="rbody">Policy pack in <code>pulumi preview</code>. Kyverno at the API server.</div>
  </div>
  <div v-click class="rcard">
    <div class="rnum">04</div>
    <div class="rtitle">Start DRA after MIG</div>
    <div class="rbody">Every new GPU node races. Run the DRA plugin only where <code>mig.config.state=success</code>.</div>
  </div>
  <div v-click class="rcard">
    <div class="rnum">05</div>
    <div class="rtitle">Measure, then bill</div>
    <div class="rbody">dcgm-exporter 4.9+ maps MIG metrics to pods. Bill on slice-hours, not utilization.</div>
  </div>
  <div v-click class="rcard">
    <div class="rnum">06</div>
    <div class="rtitle">Bring old manifests along</div>
    <div class="rbody">The same DeviceClass maps <code>nvidia.com/mig-1g.24gb</code> to a slice (GA in 1.37). Old pods run unchanged.</div>
  </div>
</div>

<style scoped>
.rollout {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.6rem 1.8rem;
  margin-top: 3rem;
}
.rcard {
  position: relative;
  background: var(--p-bg-elevated);
  border: 1.5px solid var(--p-border);
  border-top: 4px solid var(--p-primary);
  border-radius: 14px;
  padding: 1.3rem 1.5rem 1.5rem;
  min-height: 13.5rem;
}
.rnum {
  font-family: var(--slidev-font-mono);
  font-size: 2.6rem; font-weight: 700; line-height: 1;
  color: var(--p-primary);
}
.rtitle { margin-top: 0.9rem; font-size: 1.45rem; font-weight: 700; line-height: 1.2; }
.rbody { margin-top: 0.6rem; font-size: 1.12rem; line-height: 1.45; color: var(--p-fg-muted); }
.rbody code { font-size: 0.95em; white-space: nowrap; }
</style>

<!--
90s. The abstract promises "how to roll it out safely". Six steps, in
the order we'd do them again. Top row first (1-3), then bottom (4-6).

1. One static MIG layout per node pool, set with the node label
   nvidia.com/mig.config (e.g. all-balanced: on our RTX PRO 6000 that is
   1x 2g.48gb + 2x 1g.24gb). The GPU Operator's MIG Manager reads the
   label and cuts every card in the pool the same way. Changing it later
   is disruptive: MIG Manager stops the operator's own GPU pods, but it
   "requires that no user workloads are running on the GPUs being
   configured" and the node "might need to be cordoned" (NVIDIA GPU
   Operator docs). It doesn't drain for you, and it may reboot the node
   (WITH_REBOOT on some clouds). So pick per pool, not per pod. Need other
   sizes? Add a second pool with a different label.
   MIG needs Ampere or newer. An A100 can't toggle MIG mode without a GPU
   reset; Hopper and later enable MIG mode on demand. DynamicMIG in the
   DRA driver is Alpha, destroys partitions it didn't create, and can't
   run together with MPS or passthrough.
2. Admin-owned DeviceClasses, one per slice size. NVIDIA's chart only
   installs generic classes: gpu.nvidia.com (whole GPUs), mig.nvidia.com
   (any MIG slice, type == mig) and vfio.gpu.nvidia.com. The driver names
   the devices (gpu-0-mig-1g24gb-14-6) and publishes their profile, but
   there is no class per size, because profile names differ per card.
   The DeviceClass holds
   the CEL selector (driver, type == mig, profile == 1g.24gb); app teams
   just write deviceClassName: mig-1g-24gb. Our demo's shared claim still
   uses the driver's generic mig.nvidia.com class with the CEL in the
   claim, which is exactly what you don't want app teams to copy. Profile names differ per
   card (1g.5gb on an A100 40GB, 1g.24gb on an RTX PRO 6000), so keep one
   profile list and DeviceClass set per card family.
3. Guard twice. The Pulumi policy pack (next slide) catches bad profiles
   in preview. It only sees what Pulumi deploys, so a Kyverno policy on
   ResourceClaims and ResourceClaimTemplates enforces the same list at
   the API server for kubectl, operators and Kueue.
4. Start order. Not an IaC quirk: it happens on every new GPU node
   (autoscaler scale-up, node replacement), because the GPU Operator and
   the DRA plugin DaemonSets both start as soon as the node joins. The
   DRA kubelet plugin (v0.5.1, what we ran) enumerates devices once at
   startup. If it starts before MIG Manager finishes, it publishes the
   whole GPU and nothing fits. Our fix: nodeSelector on
   nvidia.com/mig.config.state=success.
   The story: on our cluster the plugin started at 23:18:47 and MIG was
   applied at 23:19:29. The ResourceSlice had the whole GPU and none of
   the slices, so pods stayed Pending until a rollout restart.
5. Measure, then bill. dcgm-exporter 4.8.4 (Sep 18) started attributing
   DRA MIG metrics to pods (pod_uid, GPU_CI_ID labels), but only for MIG
   devices "visible to DCGM at startup", and it left some utilization
   fields blank on MIG GPUs; 4.9.0 (Nov 6) fixed that. A Dynamic MIG
   layout change needs an exporter restart.
   Bill on allocated slice-hours (from the ResourceClaims), not on
   utilization: in our own A/B test the per-slice DCGM numbers showed a
   21% training dip where we measured 5%. Use utilization to right-size,
   and collect a month of data before you charge anyone.
6. Migration. DRA extended resource mapping (KEP-5004, GA in 1.37): an
   admin sets spec.extendedResourceName on a DeviceClass, and pods that
   still ask for that name get a device through DRA, no ResourceClaim
   (the scheduler creates one per pod). The KEP's stated goals: "Enable
   existing applications to run without modification" and let admins
   "transition to DRA gradually at their own pace."
   Tested Nov 3 on the demo cluster: DeviceClass mig-1g-24gb with
   extendedResourceName nvidia.com/mig-1g.24gb (infra/index.ts). An
   unchanged pod with limits nvidia.com/mig-1g.24gb: 1 got a 1g.24gb
   slice; nvidia-smi and PyTorch saw 23.6 GiB.
   Honest scope: NVIDIA documents this pattern for nvidia.com/gpu; for
   MIG names we tested it ourselves. Caveats: one DeviceClass per name,
   and a node must not also run a device plugin advertising the same name
   (switch per node or per pool).

Sources: infra/index.ts (steps 1, 3, 4); infra/mig-policy;
docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-operator-mig.html (MIG Manager);
dra-driver-nvidia-gpu.sigs.k8s.io MIG guide and feature gates (DynamicMIG);
github.com/NVIDIA/dcgm-exporter/releases (4.8.4 Sep 18, 4.9.0 Nov 6 2026);
Kubernetes v1.37 DRA blog.
-->

---
hide: true
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

# Guardrails: bad slices die twice.

<div class="guard">
  <div v-click class="gcol">
    <div class="gpu-caption gpu-caption--accent">Before deploy: Pulumi policy pack</div>
    <div class="gcode">

```ts
// infra/mig-policy/index.ts
const blocked = ["7g.40gb", "4g.40gb",
                 "3g.40gb", "7g.80gb", "4g.96gb"];

new PolicyPack("mig-policy", { policies: [{
  name: "enforce-small-mig-profiles",
  enforcementLevel: "mandatory",
  validateResource: (args, report) => {
    if (!isResourceClaim(args)) return;
    for (const expr of celSelectors(args.props))
      for (const p of blocked)
        if (expr.includes(`"${p}"`))
          report(`MIG profile ${p} not allowed`);
  },
}]});
```

</div>
    <div class="gwhen">Runs on <code>pulumi preview</code> and <code>pulumi up</code>.</div>
  </div>

  <div v-click class="gcol">
    <div class="gpu-caption gpu-caption--accent">At the API server: Kyverno</div>
    <div class="gcode">

```yaml
# infra/kyverno/enforce-small-mig-profiles.yaml
apiVersion: policies.kyverno.io/v1
kind: ValidatingPolicy
spec:
  validationActions: [Deny]
  matchConstraints:
    resourceRules:
    - apiGroups: ["resource.k8s.io"]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["resourceclaims",
                  "resourceclaimtemplates"]
  variables:
  - name: blocked
    expression: "['7g.40gb', '4g.40gb', ...]"
  validations:
  - expression: >-
      variables.requests.all(r, r.exactly.selectors
        .all(s, !variables.blocked.exists(p,
          s.cel.expression.contains(p))))
    message: MIG profile not allowed.
```

</div>
    <div class="gwhen">Catches <code>kubectl</code>, operators and Kueue.</div>
  </div>
</div>

<style scoped>
.guard { display: grid; grid-template-columns: 1fr 1fr; gap: 1.8rem; margin-top: 1.6rem; }
.gcol { display: flex; flex-direction: column; min-width: 0; }
.gcode { margin-top: 0.8rem; flex: 1; }
.gcode :deep(pre), .gcode :deep(pre.shiki) {
  height: 100%; margin: 0 !important;
  font-size: 0.86rem !important; line-height: 1.5 !important;
  padding: 1rem 1.2rem !important;
}
.gwhen { margin-top: 0.8rem; font-size: 1.05rem; color: var(--p-fg-muted); text-align: center; }
</style>

<!--
60s. Same rule, two places. Opens with only the title. Click for the
left (policy pack), click again for the right (Kyverno).

Left: the Pulumi policy pack, trimmed for the slide (the real file is
infra/mig-policy/index.ts). It runs on every pulumi preview and pulumi
up and validates both ResourceClaim and ResourceClaimTemplate. A
7g.40gb request in your Pulumi program never reaches the cluster. The
blocked list: 80GB-family profiles that don't exist on our cards, and
the whole-GPU profiles (7g.40gb on A100 40GB, 4g.96gb on RTX PRO 6000)
because they defeat MIG.

Right: the policy pack only sees what Pulumi deploys. Claims created at
runtime (kubectl, Kubeflow, Kueue, an operator) never pass through it.
The Kyverno ValidatingPolicy enforces the same list at the API server.
It's CEL, so it reads like the DRA selectors it checks. Trimmed on the
slide; the full file is infra/kyverno/enforce-small-mig-profiles.yaml.
Kyverno 1.19 deprecates the old kyverno.io/v1 ClusterPolicy, so this
uses policies.kyverno.io/v1 ValidatingPolicy.

Tested with `kyverno apply` (CLI v1.19.2) against a 1g.24gb claim
(pass), a 4g.96gb claim and a 7g.40gb template (both denied). Kyverno
isn't installed on the demo cluster; the file ships in the repo.

Pause here, then click into the open-source slide.
-->

---

# It's open source.

<div class="os">
  <div class="os-qr">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=0&data=https%3A%2F%2Fgithub.com%2Fdirien%2Fstop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes" alt="QR code: repo" />
    <div class="os-url"><span>github.com/dirien/</span><span>stop-wasting-gpus-how-we-built-</span><span>a-golden-path-for-gpu-sharing-</span><span>on-kubernetes</span></div>
  </div>

  <div class="os-right">
    <div class="os-tiles">
      <div class="os-tile"><code>infra/</code><span>The Pulumi program: EKS 1.37, GPU Operator, DRA driver, vLLM, gateway, Grafana.</span></div>
      <div class="os-tile"><code>infra/mig-policy/</code><span>The policy pack from this talk.</span></div>
      <div class="os-tile"><code>infra/kyverno/</code><span>The same rule at the API server.</span></div>
      <div class="os-tile"><code>infra/dashboards/</code><span>The fixed DCGM MIG dashboard.</span></div>
      <div class="os-tile os-wide"><code>DEMO.md</code><span>This demo, step by step, with recovery and teardown.</span></div>
    </div>
    <div class="os-keys">
      <span class="os-keys-label">Swap the card with</span>
      <code>gpuInstanceType</code><code>gpuCapacityType</code><code>gpuAvailabilityZone</code>
    </div>
  </div>
</div>

<p class="os-tag">Stop wasting whole GPUs.</p>

<style scoped>
.os { display: grid; grid-template-columns: 22rem 1fr; gap: 2.6rem; margin-top: 2rem; align-items: start; }
.os-qr {
  background: var(--p-bg-elevated); border: 1.5px solid color-mix(in srgb, var(--p-primary) 60%, var(--p-border));
  border-radius: 18px; padding: 1.4rem; display: flex; flex-direction: column; align-items: center;
}
.os-qr img { width: 100%; aspect-ratio: 1; background: #fff; padding: 0.9rem; border-radius: 12px; }
.os-url { margin-top: 1rem; font-family: var(--slidev-font-mono); font-size: 0.8rem; line-height: 1.5; color: var(--p-fg-muted); text-align: center; }
.os-url span { display: block; white-space: nowrap; }
.os-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.os-tile {
  background: var(--p-bg-elevated); border: 1.5px solid var(--p-border); border-radius: 14px;
  padding: 1rem 1.2rem; display: flex; flex-direction: column; gap: 0.45rem;
}
.os-tile code { align-self: flex-start; font-size: 1.05rem; }
.os-tile span { font-size: 1.02rem; line-height: 1.4; color: var(--p-fg-muted); }
.os-wide { grid-column: span 2; }
.os-keys { margin-top: 1.3rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; }
.os-keys-label { font-size: 1.05rem; color: var(--p-fg-muted); margin-right: 0.3rem; }
.os-keys code { font-size: 1rem; }
.os-tag {
  margin-top: 2rem !important; text-align: center;
  font-size: 2.4rem; font-weight: 700; letter-spacing: -0.02em; color: var(--p-primary);
}
</style>

<!--
45s. The abstract promises "open source, ready to lift onto your
platform". Point at the QR code and leave it up for a few seconds.

What's in the repo: the Pulumi TypeScript program that built everything
you saw, the policy pack, its Kyverno twin, the fixed dashboard, and the
demo runbook plus the VHS tape for the recording. Moving to another card is three config
keys plus the MIG profile map in infra/index.ts.

Close on the title callback: "Stop wasting whole GPUs." Then Q&A.
-->

---
class: 'meme-slide'
---

<div class="qa">
  <img class="qa-line qa-line--tr" src="/brand/bg-top-right-1.svg" alt="" aria-hidden="true" />
  <img class="qa-line qa-line--bl" src="/brand/bg-bottom-left-1.svg" alt="" aria-hidden="true" />

  <img class="qa-logo" src="/logos/pulumi-logo-horizontal-color-dark.svg" alt="Pulumi" />

  <div class="qa-main">
    <div class="qa-text">
      <h1 class="qa-title">Questions<span>?</span></h1>
      <p class="qa-sub">Meet me and my colleagues at our booth.</p>
      <div class="qa-booth">
        <span class="qa-booth-label">Booth</span>
        <span class="qa-booth-num">200</span>
      </div>
    </div>
    <img class="qa-pus" src="/brand/pulumipus-thinking.svg" alt="The Pulumipus, Pulumi's platypus mascot, in a thinking pose." />
  </div>
</div>

<style scoped>
.qa { position: absolute; inset: 0; overflow: hidden; background: var(--slidev-theme-background, #1F1B21); }
.qa-line { position: absolute; width: 24%; pointer-events: none; opacity: 1; }
.qa-line--tr { top: 0; right: 0; }
.qa-line--bl { bottom: 0; left: 0; }
.qa-logo { position: absolute; top: 72px; left: 96px; height: 64px; width: auto; }
.qa-main {
  position: absolute; inset: 0; padding: 0 120px 70px 96px; z-index: 1;
  display: grid; grid-template-columns: 1.7fr 1fr; align-items: center; gap: 40px;
}
.qa-over {
  font-family: var(--slidev-font-mono); font-size: 1.15rem; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--p-fg-muted);
}
.qa-title {
  margin: 0 !important; font-size: 10.5rem !important; line-height: 0.95 !important;
  font-weight: 700 !important; letter-spacing: -0.04em !important; color: #fff;
}
.qa-title span { color: var(--p-primary); }
.qa-sub { margin: 2.4rem 0 0 !important; font-size: 2.6rem !important; line-height: 1.25 !important; color: #fff; }
.qa-booth {
  display: inline-flex; align-items: center; gap: 1.6rem; margin-top: 2.6rem;
  padding: 1rem 2rem 1rem 1.8rem; border-radius: 18px;
  background: var(--p-bg-elevated); border: 2px solid var(--p-primary);
}
.qa-booth-label {
  font-family: var(--slidev-font-mono); font-size: 1.5rem; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--p-fg-muted);
}
.qa-booth-num { font-size: 5.5rem; line-height: 1; font-weight: 700; letter-spacing: -0.03em; color: var(--p-primary); }
.qa-pus { width: 100%; max-width: 520px; justify-self: center; margin-top: 60px; }
</style>

<!--
Open floor. Say it: "Questions? And if you'd rather talk one-on-one, my
colleagues and I are at the Pulumi booth, number 200."
Logo, accent lines and the Pulumipus are the official files from
brand.pulumi.com (stored in public/ so the slide works offline).

Q&A prep ammo if no questions come:
- llm-d: CNCF sandbox since Mar 2026, v1.0.0 shipped Oct 20 2026.
  Disaggregated prefill/decode, KV-cache-aware routing, home of the
  Gateway API Inference Extension endpoint picker
- NVIDIA donated the DRA GPU driver to Kubernetes (SIG Node, now
  kubernetes-sigs/dra-driver-nvidia-gpu, v0.5.1) at KubeCon EU 2026;
  Google donated a TPU DRA driver
- NVIDIA committed $4M over 3 years for GPU access for CNCF projects
  (KubeCon EU 2026; one source says $3.8M)
- NVIDIA open-sourced the full Run:ai platform on Oct 13 2026
- "Can I do dynamic MIG?" — DynamicMIG feature gate, alpha, off by
  default, H100 and newer. A100 can't flip MIG mode freely. Static MIG is
  what AWS recommends on EKS today
- "Why not just buy more GPUs?" — Cast AI 2026: ~5% average GPU
  utilization across ~23,000 clusters (vendor data). Microsoft Philly
  study, USENIX ATC'19, for the academic version
-->

---

<div class="absolute inset-0 flex flex-col justify-center items-center px-20 text-center">
  <h1 class="!text-[10rem] !leading-tight !font-semibold !tracking-tight !m-0 text-[var(--p-primary)] !max-w-[95%]">Thanks.</h1>
  <img src="/brand/pulumipus-cool.svg" alt="The Pulumipus mascot in sunglasses, arms crossed." class="!mt-6" style="width: 380px; height: auto;" />
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
