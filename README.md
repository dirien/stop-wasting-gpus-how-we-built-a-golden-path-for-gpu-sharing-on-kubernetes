# Stop Wasting GPUs

How to share one GPU across several Kubernetes workloads without lying
to the scheduler: hardware partitions with NVIDIA Multi-Instance GPU
(MIG), scheduled with Kubernetes Dynamic Resource Allocation (DRA).

If you've been told "just buy more GPUs" or "just turn on time-slicing,"
this is the rebuttal. DRA went GA in Kubernetes 1.34, the first version
where the scheduler can read what's *inside* a card. This repo is a
working platform built on that: one GPU, cut into MIG slices, shared by
a training job and two inference replicas, with guardrails around it.

## What's in here

**`infra/`**: a Pulumi TypeScript program. It builds:

- An EKS cluster (Kubernetes 1.37) with a system node group and a GPU
  node group, MIG layout `all-balanced`.
- NVIDIA GPU Operator (driver, MIG Manager, DCGM) and the NVIDIA DRA
  driver, which publishes each MIG slice to the scheduler. The DRA
  kubelet plugin only starts once MIG is applied
  (`nvidia.com/mig.config.state=success`).
- One shared `ResourceClaim` that pins a training pod and two vLLM
  replicas to slices of the same physical GPU (`matchAttribute` on the
  parent GPU).
- An inference gateway: Gateway API + Inference Extension
  (`InferencePool`), agentgateway, and the llm-d endpoint picker in front
  of the vLLM replicas.
- A `mig-1g-24gb` DeviceClass with `extendedResourceName`, so pods that
  still ask for `nvidia.com/mig-1g.24gb: 1` get a slice through DRA.
- Prometheus + Grafana with a MIG DCGM dashboard (`dashboards/`), fixed
  to show utilization in percent.

Guardrails, in two places:

- **`infra/mig-policy/`**: a Pulumi Policy Pack that rejects MIG
  profiles the platform doesn't allow, at `pulumi preview` time.
- **`infra/kyverno/`**: the same rule as a Kyverno `ValidatingPolicy`,
  for everything that doesn't go through Pulumi (kubectl, operators,
  Kueue).

**`DEMO.md`**: the step-by-step runbook: deploy, verify the slices,
send requests through the gateway, watch Grafana, recover, tear down.

**`slides*/`**: Slidev decks that explain the design, with speaker
notes and a recorded terminal demo (`demo.tape`, Charm VHS).

**`reports/`, `research_notes/`**: research on where the GPU sharing
stack is heading (Kueue, KEP-5729 group-shared claims, KAI, llm-d).

## Running the cluster

Heads-up: GPU instances cost real money, and MIG-capable capacity is
often sold out. Check availability before you start.

The GPU is a config key, so you pick the card per stack:

```bash
cd infra
pulumi stack init <name>
pulumi config set aws:region us-east-1
pulumi config set gpuInstanceType g7e.4xlarge     # or p4d.24xlarge, p4de.24xlarge
pulumi config set gpuCapacityType ON_DEMAND       # see below
pulumi config set gpuAvailabilityZone us-east-1b  # an AZ that has the instance
pulumi up
```

`gpuCapacityType` takes three values:

| Value | What it does |
|---|---|
| `ON_DEMAND` | No reservation, billed per hour. AWS may have no capacity. |
| `ON_DEMAND_RESERVATION` | Creates an On-Demand Capacity Reservation first, so a missing capacity fails in seconds instead of after the node group timeout. Same hourly price, deleted with the stack. |
| `CAPACITY_BLOCK` | Uses a prepaid AWS Capacity Block. Set `capacityReservationId` too. Blocks are non-refundable and run on a fixed schedule. |

MIG profile names depend on the card (`1g.5gb` on an A100 40GB,
`1g.24gb` on an RTX PRO 6000); `infra/index.ts` maps them per instance
type. Budget about 30 minutes from `pulumi up` to a Ready GPU node with
MIG slices visible to DRA. The GPU Operator reconfigures the card
mid-deploy, which always looks broken for a while even when it isn't.
`DEMO.md` has the checks to run once it's up.

Tear down with `pulumi destroy` when you're done. A GPU node left
running is the opposite of what this repo is about.

## Running the slides

```bash
cd slides-kubecon-na-2026   # or slides/
npm install
npm run dev
```

Slidev opens at `localhost:3030`. Press `p` for the presenter view with
speaker notes, or `o` for the overview.

To re-record the terminal demo against your cluster (needs Charm VHS):

```bash
KUBECONFIG=<your kubeconfig> vhs demo.tape
```

Output lands in `public/demo.{gif,mp4,webm}`.

## Move along if

- You're after general GPU-on-Kubernetes patterns. Start with the
  NVIDIA GPU Operator docs at
  `docs.nvidia.com/datacenter/cloud-native/gpu-operator/`.
- You want a managed inference platform. Look at llm-d or KServe.
- You don't have MIG-capable hardware. None of this applies on T4, L4
  or A10G; the device plugin's "whole GPU or nothing" is all you get.

## What's missing

- **Multi-cloud parity.** This is AWS-only. The pattern (MIG layout per
  node pool, DRA driver, shared claim with `matchAttribute`) carries
  over to Azure and GCP, but the node group and capacity code differs
  on each.
- **An autoscaler.** The demo runs one GPU node. With more demand than
  nodes, per-team quota comes next: Kueue, or KAI Scheduler if you need
  GPU-specific fair share.
- **Models bigger than a slice.** Everything here fits on one MIG slice
  (an 8B model in FP8). Models that need whole GPUs or several nodes use
  tensor/pipeline parallelism with LeaderWorkerSet, or prefill/decode
  disaggregation with llm-d.

## Who

Engin Diri, Pulumi. More at `github.com/dirien`.

## License

Apache-2.0. Take the code, take the slides, build your platform.
If something breaks, file an issue. I'd rather hear about it than
have you silently work around it.
