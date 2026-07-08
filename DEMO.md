# Live demo runbook — London Platform User Group (LOPUG), July 8 2026

Copy-paste-ready commands for the live segment. Tested against tonight's
cluster on the us-east-2 Capacity Block `cr-023d2c9020e542f3b`
(p4d.24xlarge, 8× A100 40GB, us-east-2a). Block is live
**2026-07-08 11:30 UTC → 2026-07-09 11:30 UTC** — the cluster dies when it expires.

> Live values (node name, GPU UUID, Grafana IP, MIG UUIDs) below were captured
> from the running cluster after `pulumi up`. They are the real values for
> tonight — but re-run the smoke test (§0c) before you go on stage in case a
> pod was rescheduled.

---

## 0. One-time terminal setup (do this BEFORE the talk starts)

### 0a. Refresh the kubeconfig

The kubeconfig uses `aws eks get-token`, so it needs AWS creds in the shell.
Regenerate it from the live stack:

```bash
cd /Users/dirien/Tools/repos/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes/infra
pulumi stack output kubeconfig --show-secrets --json \
  | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" \
  > /tmp/kubeconfig
ls -la /tmp/kubeconfig   # sanity: ~2 KB
```

### 0b. Open the demo shell (AWS creds + KUBECONFIG wired in)

Every command in §1 runs *inside* this subshell — no `pulumi env run …` prefix needed.

```bash
pulumi env run ediri/pulumi-idp/auth -- env KUBECONFIG=/tmp/kubeconfig bash
```

### 0c. Smoke-test (still in the demo shell) — bail to §3 if anything's red

```bash
kubectl get nodes
kubectl get pods -n mig-test
kubectl get resourceclaim -n mig-test
```

Expected:
- 3 nodes (2 system + 1 GPU), all `Ready`
- 3 pods `1/1 Running` in `mig-test`
- `shared-mig-claim` in state `allocated,reserved`

> If the 3 pods are `Pending` and the claim is `pending`, it's the post-reboot
> DRA race — jump to §3, run the one-liner, wait 30s. Happened on this deploy.

---

## 1. The live segment (slide 16 commands)

Run these *in order* during the demo, while talking. Pacing notes in italics.

### 1.1 The GPU node — *"One node. Kubernetes 1.35."*

```bash
kubectl get nodes -l node-role=gpu
```

Expected output (AGE will read ~5h by demo time):
```
NAME                                       STATUS   ROLES    AGE   VERSION
ip-10-0-35-60.us-east-2.compute.internal   Ready    <none>   5h    v1.35.6-eks-7d6f6ec
```

### 1.2 The three pods — *"Three different-sized workloads. All running. Each thinks it owns a GPU."*

```bash
kubectl get pods -n mig-test
```

Expected:
```
NAME                      READY   STATUS    RESTARTS   AGE
mig-large-training-pod    1/1     Running   0          5h
mig-medium-training-pod   1/1     Running   0          5h
mig-small-inference-pod   1/1     Running   0          5h
```

### 1.3 The shared ResourceClaim — *"One ResourceClaim, three requests, one constraint."*

```bash
kubectl get resourceclaim -n mig-test
```

Expected:
```
NAME               STATE                AGE
shared-mig-claim   allocated,reserved   5h
```

### 1.4 The matchAttribute constraint — *"This is the line that pins them all to one GPU."* (optional, if asked)

```bash
kubectl get resourceclaim shared-mig-claim -n mig-test -o jsonpath='{.spec.devices.constraints}' | python3 -m json.tool
```

Expected:
```json
[
    {
        "matchAttribute": "gpu.nvidia.com/parentUUID",
        "requests": ["mig-large", "mig-medium", "mig-small"]
    }
]
```

### 1.5 The keeper moment — *"Three pods. Same physical GPU. Different MIG slices."*

```bash
# Three literal commands, NOT a for-loop. If this segment is driven through
# `pulumi env run … -- bash -c '…'` (or Claude Code), Pulumi ESC interpolates
# ${p} to empty before bash ever sees it, so you get `kubectl exec -pod …` →
# "unknown shorthand flag: 'p'". Literal pod names are invocation-proof.
kubectl exec mig-large-training-pod  -n mig-test -- nvidia-smi -L
kubectl exec mig-medium-training-pod -n mig-test -- nvidia-smi -L
kubectl exec mig-small-inference-pod -n mig-test -- nvidia-smi -L
```

Expected (captured live from this cluster — same parent GPU, three MIG slices):
```
GPU 0: NVIDIA A100-SXM4-40GB (UUID: GPU-792fe281-9572-edc7-e6f2-4c560560e705)
  MIG 3g.20gb     Device  0: (UUID: MIG-264aac46-78a8-5ba5-b310-98568efd5090)
GPU 0: NVIDIA A100-SXM4-40GB (UUID: GPU-792fe281-9572-edc7-e6f2-4c560560e705)
  MIG 2g.10gb     Device  0: (UUID: MIG-f834809e-335d-573a-ad0f-b89906f7b2e4)
GPU 0: NVIDIA A100-SXM4-40GB (UUID: GPU-792fe281-9572-edc7-e6f2-4c560560e705)
  MIG 1g.5gb      Device  0: (UUID: MIG-6063e2fb-083a-5b59-9db1-fed83487d87d)
```

The **GPU UUID `GPU-792fe281-…` is identical across all three blocks** (same physical A100).
The **MIG profiles and MIG UUIDs differ** (3g.20gb / 2g.10gb / 1g.5gb). That's the whole talk in one screen.

### 1.6 (Optional) Training is actually running — *"Live loss curve."*

```bash
kubectl logs -n mig-test mig-large-training-pod --tail=5
kubectl logs -n mig-test mig-small-inference-pod --tail=5
```

---

## 2. Grafana dashboard (slide 17)

⚠️ The Grafana service name carries a **random Helm-release hash** that changes
every deploy (this deploy: `kube-prometheus-stack-97a55067-grafana`). **Don't**
hardcode the name — discover it by label:

```bash
# Robust: prints the Grafana LoadBalancer URL regardless of the hash
kubectl get svc -n monitoring -l app.kubernetes.io/name=grafana \
  -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}{"\n"}'
# user: admin   pass: gpu-monitoring-demo
```

**Tonight's URL** (captured live — bookmark it before the talk):
```
http://aa3da325bcdcd4df986c1a12edd218b5-399910236.us-east-2.elb.amazonaws.com
```

Log in, then open the dashboard **"NVIDIA MIG DCGM Exporter Dashboard"**
(folder: **General** — *not* "default", and *not* named "…Dashboard - MIG").
Direct deep-link for tonight:
```
http://aa3da325bcdcd4df986c1a12edd218b5-399910236.us-east-2.elb.amazonaws.com/d/Oxed_c6Wz/nvidia-mig-dcgm-exporter-dashboard
```

Verified live: DCGM target UP, 448 DCGM series, per-MIG memory (`1g.5gb≈35MB`,
`2g.10gb≈70MB`, `3g.20gb≈106MB`) and engine-activity metrics all present. The
`mig-small-inference` slice loops continuously so its line stays active; the
training slices spike intermittently (Fashion-MNIST is small — expect modest,
not saturated, utilization).

> Tips:
> - Open Grafana in a browser tab *before* the talk — the ELB takes ~1–2 min to
>   answer HTTP after creation (verified answering at 200 today).
> - MIG does **not** expose coarse per-slice `DCGM_FI_DEV_GPU_UTIL` — that panel
>   may read empty. The memory + `GR_ENGINE_ACTIVE` panels are the live ones.

---

## 3. Recovery scenarios

### "All 3 pods are Pending"
DRA driver hasn't seen the MIG slices yet. Restart its kubelet plugin:
```bash
kubectl delete pod -n nvidia-dra-driver -l nvidia-dra-driver-gpu-component=kubelet-plugin
# wait 30 seconds
kubectl get pods -n mig-test
```

### "One pod is on a different GPU than the others"
Shouldn't happen with `matchAttributes`. Recreate so the scheduler re-allocates:
```bash
kubectl delete pod -n mig-test --all
kubectl delete resourceclaim -n mig-test shared-mig-claim
cd /Users/dirien/Tools/repos/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes/infra
pulumi up --yes
```

### "exec into pod fails"
The pod may have completed. Check status:
```bash
kubectl get pod -n mig-test <pod-name>
kubectl describe pod -n mig-test <pod-name> | tail -30
```

### "Grafana / monitoring never comes up" (and `pulumi up` fails on the EBS CSI addon)
Root cause seen on this deploy: the `ebs-csi-controller` starts **before** its EKS
Pod Identity association is ready, gets no AWS creds, falls back to IMDS, and
CrashLoops — so the `aws-ebs-csi-driver` addon never goes ACTIVE, which blocks the
`gp3` StorageClass and the whole `kube-prometheus-stack` (Grafana). Fix:
```bash
kubectl rollout restart deployment ebs-csi-controller -n kube-system
# wait ~60s → both pods should be 6/6 Running, 0 restarts
kubectl get pods -n kube-system -l app=ebs-csi-controller
# then re-run the deploy; the addon flips ACTIVE and Grafana installs
cd /Users/dirien/Tools/repos/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes/infra
pulumi up --yes
```

### "Cluster is completely gone"
The us-east-2 block expired or was destroyed. It only lives until
**2026-07-09 11:30 UTC**. To rebuild inside the window:
```bash
cd /Users/dirien/Tools/repos/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes/infra
pulumi up --yes    # ~14 min
```
⚠️ Do **NOT** run `switch-to-friday.sh` — it's a dead relic that flips the region
back to us-west-2 and would break everything.

---

## 4. Useful side commands

```bash
# k9s (TUI) if you prefer to drive interactively
k9s

# All MIG slices on the A100 (readable from the mig-manager host pod)
kubectl exec -n gpu-operator $(kubectl get pod -n gpu-operator -l app=nvidia-mig-manager -o name | head -1) -- nvidia-smi -L

# Capacity reservation status
aws ec2 describe-capacity-reservations --capacity-reservation-ids cr-023d2c9020e542f3b --region us-east-2 \
  --query 'CapacityReservations[0].{state:State, used:TotalInstanceCount, end:EndDate}'

# Pulumi stack outputs
pulumi stack output
```

---

## Quick reference card (for the lectern)

```
SHELL SETUP:
  cd .../infra
  pulumi stack output kubeconfig --show-secrets --json | python3 -c "import json,sys;print(json.dumps(json.load(sys.stdin)))" > /tmp/kubeconfig
  pulumi env run ediri/pulumi-idp/auth -- env KUBECONFIG=/tmp/kubeconfig bash

SLIDE 16 (4 commands, ~2 min):
  kubectl get nodes -l node-role=gpu
  kubectl get pods -n mig-test
  kubectl get resourceclaim -n mig-test
  kubectl exec mig-large-training-pod  -n mig-test -- nvidia-smi -L
  kubectl exec mig-medium-training-pod -n mig-test -- nvidia-smi -L
  kubectl exec mig-small-inference-pod -n mig-test -- nvidia-smi -L

SLIDE 17 (Grafana — name has a per-deploy hash, discover by label):
  kubectl get svc -n monitoring -l app.kubernetes.io/name=grafana -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}{"\n"}'
  # tonight: http://aa3da325bcdcd4df986c1a12edd218b5-399910236.us-east-2.elb.amazonaws.com
  # admin / gpu-monitoring-demo

RESERVATION: cr-023d2c9020e542f3b  (us-east-2a, expires 2026-07-09 11:30 UTC)
```

---

## Optional: drive it through Claude Code

If the Claude Code window is projected, you can also just type trigger phrases and
Claude runs the sequence with stage-formatted output:
- **"run the demo"** / **"demo"** — full 4-command sequence
- **"keeper"** — only the for-loop (same parent GPU UUID across three pods)
- **"slow demo"** — one command at a time; type "next" between each
