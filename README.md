# Stop Wasting GPUs

The repo behind a 25-minute talk at KCD Texas on May 15, 2026.
About how to actually share an A100 across three Kubernetes workloads
without lying to the scheduler.

If you've been told "just buy more GPUs" or "just turn on time-slicing,"
this is the rebuttal. Kubernetes Dynamic Resource Allocation went GA
in 1.34, which is the first version where the scheduler can read what's
*inside* a card. The contents of this repo are what we shipped to a
European automotive OEM that hated their GPU bill.

## Two trees, both opinionated

**`infra/`** — A Pulumi TypeScript program. EKS cluster on an AWS
Capacity Block, p4d.24xlarge (8× A100 40GB), MIG'd to `all-balanced`
(1g.5gb + 2g.10gb + 3g.20gb per card). NVIDIA GPU Operator, the DRA
driver, Prometheus + DCGM, and a single shared `ResourceClaim` that
pins three demo pods to the same physical GPU via `matchAttributes`.
Plus a Pulumi Policy Pack (`mig-policy/`) that rejects MIG profile
requests the cluster can't satisfy.

**`slides/`** — The Slidev deck. Plus `demo.tape` for re-rendering
the terminal demo via Charm VHS, and `demo.md` as the live-demo
runbook.

## Running the cluster

Heads-up before you start: AWS Capacity Blocks cost real money. The
cheapest viable A100 SKU is around $283 for a 24-hour block, prepaid
and non-refundable. The block starts and ends at a fixed time. There's
no pause-and-resume.

If that's still fine:

```bash
cd infra
# 1. Buy a Capacity Block first (see infra/README.md for the dance —
#    aws ec2 describe-capacity-block-offerings ... | purchase-capacity-block)
# 2. Drop the reservation ID into index.ts (and the AZ for the subnet pin)
# 3. pulumi up
```

Expect ~14 minutes from `pulumi up` to a Ready node with MIG slices
visible to DRA. The GPU Operator does a reboot mid-deploy to apply
the MIG profile, which is the part that always feels broken even
when it isn't.

If you don't have AWS Capacity Blocks (or don't want to pay for one),
the same architecture works on any cloud that exposes A100 / H100 /
H200 instances with MIG support — but you'll need to rewrite the EKS
managed-node-group + launch-template bits in `infra/index.ts` for
whichever provider you're on.

## Running just the slides

```bash
cd slides
pnpm install
pnpm dev
```

Slidev opens at `localhost:3030`. Hit `p` for the presenter view if
you want the speaker notes, or `o` for the overview grid.

To re-render the recorded terminal demo (after a code change in the
infra or a re-deploy):

```bash
cd slides
pulumi env run ediri/pulumi-idp/auth -- env KUBECONFIG=/tmp/kubeconfig vhs demo.tape
```

You need Charm VHS installed (`brew install vhs`). Output drops into
`slides/public/demo.{gif,mp4,webm}`.

## Move along if

You're after general GPU-on-Kubernetes patterns. The NVIDIA docs at
`docs.nvidia.com/datacenter/cloud-native/gpu-operator/` are the
better starting point. You want a managed inference platform — look
at `llm-d` (CNCF sandbox, March 2026) or KServe instead. You don't
have access to MIG-capable hardware — none of this story applies on
T4 / L4 / A10G; the device plugin's "whole GPU or nothing" knob is
all you get.

## What's missing

A few things we deliberately skipped:

- **Multi-cloud parity.** This is AWS-only because that's where our
  customer ran. The pattern (Capacity Block → reservation-targeted
  launch template → MNG with `capacityType: CAPACITY_BLOCK` →
  shared-claim with `matchAttributes`) translates to Azure / GCP but
  the surface area is different on each.
- **An autoscaler.** With a 24h Capacity Block of exactly 1 node,
  there's nothing to autoscale. KAI Scheduler (referenced in the
  slides) is the answer when you have more demand than the block.
- **A real-world inference workload.** The three demo pods run
  Fashion-MNIST training and inference. Concrete, but small. For
  disaggregated LLM serving the next floor is NVIDIA Grove + llm-d
  (also referenced in the slides).

## Who

Engin Diri. Pulumi. Most of my GitHub is at `github.com/dirien`.
The talk itself is on Sessionize and (eventually) on KCD's YouTube.

## License

Apache-2.0. Take the code, take the slides, build your platform.
If something breaks, file an issue — I'd rather hear about it than
have you silently work around it.
