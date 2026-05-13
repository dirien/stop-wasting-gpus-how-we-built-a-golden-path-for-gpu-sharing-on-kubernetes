# Live demo runbook — KCD Texas (May 15, 2026)

Copy-paste-ready commands for the live segment. Tested against tonight's `cr-085916fd734a060cd` cluster and will work identically against Friday's cluster after `switch-to-friday.sh`.

---

## 0. One-time terminal setup (do this BEFORE the talk starts)

### 0a. Refresh the kubeconfig

The kubeconfig uses `aws eks get-token` for auth, so it needs AWS creds in the shell. Regenerate it from the live stack:

```bash
cd /Users/dirien/Tools/repos/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes/infra
pulumi stack output kubeconfig --show-secrets --json \
  | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" \
  > /tmp/kubeconfig
ls -la /tmp/kubeconfig   # sanity: ~2 KB
```

### 0b. Open the demo shell (AWS creds + KUBECONFIG wired in)

This opens a subshell where `kubectl` and `k9s` just work — every command in section 1 below runs *inside* this subshell.

```bash
pulumi env run ediri/pulumi-idp/auth -- env KUBECONFIG=/tmp/kubeconfig bash
```

You'll see your prompt change. From here on, no more `pulumi env run …` prefix needed.

### 0c. Smoke-test (still in the demo shell) — bail out if anything's red

```bash
kubectl get nodes
kubectl get pods -n mig-test
kubectl get resourceclaim -n mig-test
```

Expected:
- 3 nodes, all `Ready`
- 3 pods `1/1 Running` in `mig-test`
- `shared-mig-claim` in state `allocated,reserved`

If any of those are wrong, see section 3 (Recovery).

---

## 1. The live segment (slide 16 commands)

Run these *in order* during the demo, while talking. Pacing notes in italics.

### 1.1 The GPU node — *"One node. Kubernetes 1.35."*

```bash
kubectl get nodes -l node-role=gpu
```

Expected output:
```
NAME                                         STATUS   ROLES    AGE   VERSION
ip-10-0-108-169.us-west-2.compute.internal   Ready    <none>   4h    v1.35.4-eks-4136f65
```

### 1.2 The three pods — *"Three different-sized workloads. All running. Each thinks it owns a GPU."*

```bash
kubectl get pods -n mig-test
```

Expected:
```
NAME                      READY   STATUS    AGE
mig-large-training-pod    1/1     Running   8m
mig-medium-training-pod   1/1     Running   8m
mig-small-inference-pod   1/1     Running   8m
```

### 1.3 The shared ResourceClaim — *"One ResourceClaim, three requests, one constraint."*

```bash
kubectl get resourceclaim -n mig-test
```

Expected:
```
NAME               STATE                AGE
shared-mig-claim   allocated,reserved   8m
```

### 1.4 The matchAttribute constraint — *"This is the line that pins them all to one GPU."* (optional, if audience asks)

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

### 1.5 The keeper moment — *"Three pods. Same physical GPU. Different MIG UUIDs."*

```bash
for p in mig-large-training mig-medium-training mig-small-inference; do
  kubectl exec ${p}-pod -n mig-test -- nvidia-smi -L
done
```

Expected:
```
GPU 0: NVIDIA A100-SXM4-40GB (UUID: GPU-9bd75b6b-cd91-ef22-...)
  MIG 3g.20gb     Device  0: (UUID: MIG-744060a1-c779-54b8-...)
GPU 0: NVIDIA A100-SXM4-40GB (UUID: GPU-9bd75b6b-cd91-ef22-...)
  MIG 2g.10gb     Device  0: (UUID: MIG-7d17cad5-cb54-53b8-...)
GPU 0: NVIDIA A100-SXM4-40GB (UUID: GPU-9bd75b6b-cd91-ef22-...)
  MIG 1g.5gb      Device  0: (UUID: MIG-37b7fdd7-f1cc-51f3-...)
```

The GPU UUID prefix `GPU-9bd75b6b-...` will be **identical across all three blocks**. The MIG UUIDs and profiles **differ**. *(Friday's cluster will have a different GPU UUID — same pattern, different values.)*

### 1.6 (Optional) Training is actually running — *"Live inference, live loss curve."*

```bash
kubectl logs -n mig-test mig-large-training-pod --tail=5
```

Or for the small inference loop:
```bash
kubectl logs -n mig-test mig-small-inference-pod --tail=5
```

---

## 2. Grafana dashboard (slide 17)

```bash
# Get the public URL
kubectl get svc -n monitoring kube-prometheus-stack-grafana

# Credentials
# user:  admin
# pass:  gpu-monitoring-demo
```

Open the `EXTERNAL-IP` in a browser, log in, navigate to the **"NVIDIA DCGM Dashboard - MIG"** under the "default" folder. Three workload lines climbing.

---

## 3. Recovery scenarios

### "All 3 pods are Pending"
Probably DRA driver hasn't seen the MIG slices yet. Restart its kubelet plugin:
```bash
kubectl delete pod -n nvidia-dra-driver -l nvidia-dra-driver-gpu-component=kubelet-plugin
# wait 30 seconds
kubectl get pods -n mig-test
```

### "One pod is on a different GPU than the others"
Shouldn't happen with `matchAttributes`. If it does, recreate them so the scheduler re-allocates:
```bash
kubectl delete pod -n mig-test --all
kubectl delete resourceclaim -n mig-test shared-mig-claim
cd /Users/dirien/Tools/repos/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes/infra
pulumi up --yes
```

### "exec into pod fails"
The pod completed (training scripts now run `range(100000)` so this shouldn't happen). If it does:
```bash
kubectl get pod -n mig-test <pod-name>     # check STATUS
kubectl describe pod -n mig-test <pod-name> | tail -30
```

### "Cluster is completely gone"
Friday's block expired or got destroyed. Recreate:
```bash
cd /Users/dirien/Tools/repos/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes/infra
bash switch-to-friday.sh    # only if not already on Friday config
pulumi up --yes              # ~14 min
```

---

## 4. Useful side commands

```bash
# k9s (TUI) if you prefer to drive interactively
k9s

# All 32 MIG slices on the A100s (only readable from host pod)
kubectl exec -n gpu-operator $(kubectl get pod -n gpu-operator -l app=nvidia-mig-manager -o name | head -1) -- nvidia-smi -L

# Capacity reservation status
aws ec2 describe-capacity-reservations --capacity-reservation-ids cr-085916fd734a060cd --region us-west-2 \
  --query 'CapacityReservations[0].{state:State, used:TotalInstanceCount, end:EndDate}'

# Pulumi stack outputs
pulumi stack output
```

---

## Quick reference card (for the lectern)

```
SHELL SETUP:
  pulumi env run ediri/pulumi-idp/auth -- env KUBECONFIG=/tmp/kubeconfig bash

SLIDE 16 (5 commands, ~2 min):
  kubectl get nodes -l node-role=gpu
  kubectl get pods -n mig-test
  kubectl get resourceclaim -n mig-test
  for p in mig-large-training mig-medium-training mig-small-inference; do
    kubectl exec ${p}-pod -n mig-test -- nvidia-smi -L
  done

SLIDE 17:
  kubectl get svc -n monitoring kube-prometheus-stack-grafana
  # admin / gpu-monitoring-demo
```
