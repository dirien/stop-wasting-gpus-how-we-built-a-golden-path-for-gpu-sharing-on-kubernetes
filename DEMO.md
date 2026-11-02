# Live demo runbook: KubeCon NA 2026, Salt Lake City

**Talk:** "Why Are You Still Wasting Whole GPUs? Hardware-Level Sharing, Scheduled with DRA"
**Slot:** Tue Nov 10, 2026, 4:40–5:10 PM MST (UTC-7)
**Deck:** `slides-kubecon-na-2026/`. Demo slides: the divider "Live: one GPU, three pods", two terminal slides, the Grafana slide, the recording slide.

The live demo is optional. The recording (`slides-kubecon-na-2026/public/demo.mp4`, 82s) shows exactly the same commands. If anything in section 3 goes wrong, skip to the recording slide.

What the demo shows, in this order:

1. The GPU: which MIG profiles it supports, and which slices exist right now.
2. Which pod asked for which request of the shared ResourceClaim, and which slice each request got.
3. Proof from inside the pods: same GPU UUID, different MIG UUIDs.
4. A real request through agentgateway and the llm-d endpoint picker, served from a 1g slice.
5. Grafana: training and both vLLM slices busy on one GPU.

---

## 1. Days before: get a GPU and deploy

### 1.1 Capacity

All commands run on your laptop, from `infra/`. AWS credentials come from ESC:

```bash
cd /Users/dirien/Tools/repos/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes/infra
pulumi stack select kubecon
```

The demo uses one `g7e.4xlarge` (1x RTX PRO 6000 Blackwell 96GB, MIG `all-balanced` = 1x 2g.48gb + 2x 1g.24gb, about $4/h).
A100/H100 on-demand capacity was gone in Nov 2026; the story on the slides doesn't depend on the card.

The reservation in `Pulumi.kubecon.yaml` (`cr-07354aebb1a0c5a89`) ends 2026-11-03T17:00Z, so for the talk you need new capacity. Two options:

**Option A: let Pulumi reserve it (fails fast if the AZ is dry).** Edit `Pulumi.kubecon.yaml`:

```yaml
  gpu-dra-blog-test:gpuInstanceType: g7e.4xlarge
  gpu-dra-blog-test:gpuCapacityType: ON_DEMAND_RESERVATION
  gpu-dra-blog-test:gpuAvailabilityZone: us-east-1b
  # remove gpu-dra-blog-test:capacityReservationId
```

**Option B: plain on-demand**, pinned to an AZ: set `gpuCapacityType: ON_DEMAND`, keep `gpuAvailabilityZone`, remove `capacityReservationId`. If the node group times out with `InsufficientInstanceCapacity`, try another AZ. In Nov 2026 the type was offered in `us-east-1b`, `us-east-1c` and `us-east-1d`.

Check that the AZ offers the type at all:

```bash
pulumi env run ediri/pulumi-idp/auth -- aws ec2 describe-instance-type-offerings --region us-east-1 \
  --location-type availability-zone --filters Name=instance-type,Values=g7e.4xlarge \
  --query 'InstanceTypeOfferings[].Location' --output text
```

### 1.2 Deploy

```bash
pulumi preview --policy-pack ./mig-policy   # the MIG policy pack must pass
pulumi up
```

Budget about 30 minutes: EKS, the GPU node, GPU Operator with MIG Manager, DRA driver, Prometheus/Grafana, Gateway API + agentgateway, the llm-d router, two vLLM replicas and the training pod.

### 1.3 Verify the deploy

Set up the shell first (section 2.1), then:

```bash
# MIG applied
kubectl get nodes -l node-role=gpu -L nvidia.com/mig.config,nvidia.com/mig.config.state
#   -> all-balanced   success

# DRA driver publishes three MIG devices (not just gpu-0)
kubectl get resourceslices -o jsonpath='{range .items[*].spec.devices[*]}{.name}{"\n"}{end}'
#   -> gpu-0-mig-2g48gb-…, gpu-0-mig-1g24gb-…, gpu-0-mig-1g24gb-…

# Workloads
kubectl get pods -n mig-test                      # 5 pods, all 1/1 Running
kubectl get resourceclaim -n mig-test             # shared-mig-claim  allocated,reserved
kubectl get gateway,httproute,inferencepool -n mig-test
```

If the ResourceSlice shows only `gpu-0`, see section 5, "Pods Pending".

---

## 2. Before the talk (T-60 min)

### 2.1 Demo shell

```bash
cd /Users/dirien/Tools/repos/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes/infra
pulumi stack output kubeconfig -s kubecon --show-secrets --json \
  | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" > /tmp/kubeconfig

pulumi env run ediri/pulumi-idp/auth -- env KUBECONFIG=/tmp/kubeconfig bash
```

Inside that shell:

```bash
export PS1='$ '
GW=$(kubectl get gateway llm-d-inference-gateway -n mig-test -o jsonpath='{.status.addresses[0].value}')
echo $GW
```

Terminal: dark theme, font size 20+ so the back row can read it, window wide enough for about 130 columns (the ResourceSlice and custom-columns lines are long).

### 2.2 Smoke test and warm-up

Each replica serves Qwen3-8B in FP8 on its 1g.24gb slice (8.85GiB of weights, ~10.5GiB of KV cache, 32k context). Startup compiles and captures CUDA graphs, so requests are fast from the first one; a quick warm-up still proves both replicas answer:

```bash
for i in 1 2 3 4 5 6; do
  curl -sS -o /dev/null -w '%{http_code} %{time_total}s\n' http://$GW/v1/chat/completions \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"Qwen/Qwen3-8B-FP8\",\"max_tokens\":5,\"messages\":[{\"role\":\"user\",\"content\":\"warm-up $i\"}]}"
done
```

Expected: `200` everywhere, each well under 1s.

### 2.3 Grafana

```bash
kubectl get svc -n monitoring -l app.kubernetes.io/name=grafana \
  -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}'; echo
pulumi stack output grafanaPassword -s kubecon     # user: admin
```

Open it in the browser, log in, open **NVIDIA MIG DCGM (demo)** (not the stock "NVIDIA MIG DCGM Exporter Dashboard", which plots utilization as 0–1), set the range to the last 15 minutes and refresh to 10s. Keep the tab open next to the slides.

### 2.4 Load for the Grafana slide

Start this in a **second** terminal (same demo shell setup, section 2.1) about 5 minutes before the demo slides, so the vLLM lines are already up when you get there. Different prompts spread the load over both replicas; identical prompts would all go to one replica (prefix-cache routing).

```bash
for i in $(seq 1 2000); do
  curl -sS -o /dev/null http://$GW/v1/chat/completions -H 'Content-Type: application/json' \
    -d "{\"model\":\"Qwen/Qwen3-8B-FP8\",\"max_tokens\":200,\"messages\":[{\"role\":\"user\",\"content\":\"Write a short story about GPU number $i\"}]}" &
  (( i % 8 == 0 )) && wait
done
```

Stop it with Ctrl-C after the Grafana slide.

### 2.5 T-10 min checklist

- [ ] `kubectl get pods -n mig-test`: five pods Running
- [ ] One curl from 3.4 returns an answer
- [ ] Grafana tab logged in, lines moving
- [ ] Recording slide plays (`demo.mp4`)
- [ ] Notifications off, terminal font big, `clear`

---

## 3. The live segment

About 3 minutes. Run in order. `clear` between parts so each part fits on one screen; the two terminal slides show the expected output if you need a fallback.

### Part 1: the GPU before any pod

**3.1 The node and its MIG layout**

```bash
kubectl get nodes -l node-role=gpu -L nvidia.com/gpu.machine,nvidia.com/mig.config
```

```
NAME                           STATUS   ROLES    AGE   VERSION               GPU.MACHINE   MIG.CONFIG
ip-10-0-107-255.ec2.internal   Ready    <none>   10h   v1.37.1-eks-6e7947a   g7e.4xlarge   all-balanced
```

*Say:* "One GPU node. The GPU Operator's MIG Manager read the `all-balanced` label and cut the card."

**3.2 Which MIG profiles the card supports**

```bash
kubectl exec -n gpu-operator ds/nvidia-mig-manager -c nvidia-mig-manager -- \
  nvidia-smi mig -lgip | grep -E 'Name|Free/Total|MIG [0-9]g\.[0-9]+gb '
```

```
| GPU   Name               ID    Instances   Memory     P2P    SM    DEC   ENC  |
|                                Free/Total   GiB              CE    JPEG  OFA  |
|   0  MIG 1g.24gb         14     0/4        23.62      No     46     1     1   |
|   0  MIG 2g.48gb          5     0/2        47.38      No     94     2     2   |
|   0  MIG 4g.96gb          0     0/1        95.00      No     188    4     4   |
```

*Say:* "This card can be cut into up to four 1g.24gb, two 2g.48gb, or one 4g.96gb, which is the whole card. Free is zero because all-balanced already uses it: one 2g plus two 1g."

**3.3 What the DRA driver publishes to the scheduler**

```bash
kubectl get resourceslices -o jsonpath='{"DEVICE\t\t\tPROFILE\tPARENT GPU\n"}{range .items[*].spec.devices[*]}{.name}{"\t"}{.attributes.profile.string}{"\t"}{.attributes.parentUUID.string}{"\n"}{end}'
```

```
DEVICE                  PROFILE PARENT GPU
gpu-0-mig-2g48gb-5-0    2g.48gb GPU-676c1adb-1b9d-b501-13e6-05cc9b040785
gpu-0-mig-1g24gb-14-6   1g.24gb GPU-676c1adb-1b9d-b501-13e6-05cc9b040785
gpu-0-mig-1g24gb-14-9   1g.24gb GPU-676c1adb-1b9d-b501-13e6-05cc9b040785
```

*Say:* "This is what the scheduler sees: a ResourceSlice with three devices, each with a profile and the same parent UUID. Our claim pins on exactly that attribute."

```bash
clear
```

### Part 2: which pod got which slice

**3.4 Pod to request**

```bash
kubectl get pods -n mig-test -o custom-columns='POD:.metadata.name,NODE:.spec.nodeName,REQUEST:.spec.containers[0].resources.claims[0].request'
```

```
POD                                        NODE                           REQUEST
llm-d-inference-gateway-85bcc65df8-rsbld   ip-10-0-42-66.ec2.internal     <none>
mig-large-training-pod                     ip-10-0-107-255.ec2.internal   mig-large
qwen3-epp-5689fc9496-7ntvq                 ip-10-0-42-66.ec2.internal     <none>
vllm-qwen3-a-6885d59876-n4g85              ip-10-0-107-255.ec2.internal   mig-serve-a
vllm-qwen3-b-6795466874-jj4n7              ip-10-0-107-255.ec2.internal   mig-serve-b
```

*Say:* "Three pods on the GPU node, each asking for a different request of one shared ResourceClaim. The gateway and the endpoint picker don't need a GPU and run on the system node."

**3.5 Request to slice**

```bash
kubectl get resourceclaim shared-mig-claim -n mig-test -o jsonpath='{"REQUEST\t\tDEVICE\n"}{range .status.allocation.devices.results[*]}{.request}{"\t"}{.device}{"\n"}{end}'
```

```
REQUEST         DEVICE
mig-large       gpu-0-mig-2g48gb-5-0
mig-serve-a     gpu-0-mig-1g24gb-14-6
mig-serve-b     gpu-0-mig-1g24gb-14-9
```

*Say:* "And the scheduler's answer: training got the 2g slice, each vLLM replica a 1g slice. All from the ResourceSlice we just saw."

Optional, if someone asks why they all land on one GPU:

```bash
kubectl get resourceclaim shared-mig-claim -n mig-test -o jsonpath='{.spec.devices.constraints}' | jq
```

```json
[{ "matchAttribute": "gpu.nvidia.com/parentUUID", "requests": ["mig-large", "mig-serve-a", "mig-serve-b"] }]
```

**3.6 The keeper: proof from inside the pods**

```bash
for t in pod/mig-large-training-pod deploy/vllm-qwen3-a deploy/vllm-qwen3-b; do kubectl exec -n mig-test $t -- nvidia-smi -L; done
```

```
GPU 0: NVIDIA RTX PRO 6000 Blackwell Server Edition (UUID: GPU-676c1adb-1b9d-…)
  MIG 2g.48gb     Device  0: (UUID: MIG-945cb005-…)
GPU 0: NVIDIA RTX PRO 6000 Blackwell Server Edition (UUID: GPU-676c1adb-1b9d-…)
  MIG 1g.24gb     Device  0: (UUID: MIG-edf5d3ce-…)
GPU 0: NVIDIA RTX PRO 6000 Blackwell Server Edition (UUID: GPU-676c1adb-1b9d-…)
  MIG 1g.24gb     Device  0: (UUID: MIG-9cf287a1-…)
```

*Say:* "Same GPU UUID three times. Three different MIG UUIDs. One slice trains, two slices serve." Pause here.

```bash
clear
```

### Part 3: through the gateway

**3.7 The route and the InferencePool**

```bash
kubectl get httproute,inferencepool -n mig-test
```

*Say:* "agentgateway takes the request, the llm-d endpoint picker chooses the replica behind this InferencePool."

**3.8 A real request**

```bash
curl -sS http://$GW/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"Qwen/Qwen3-8B-FP8","max_tokens":120,"chat_template_kwargs":{"enable_thinking":false},"messages":[{"role":"user","content":"In two sentences: why should teams share one GPU?"}]}' | jq -r '.choices[0].message.content'
```

Expected: two sentences from Qwen3-8B in about a second, roughly 40 tokens/s on a 1g slice (the wording changes every run).

### Part 4: Grafana

Switch to the Grafana tab (the load from 2.4 is running). Three lines on GPU Utilization: both vLLM slices at about 97%, the training slice dipping from about 61% to about 48% while the two 8B replicas are busy, all on GPU 0. Stay quiet for ten seconds. Back to the slides; stop the load loop.

If someone asks about the training dip, *say:* "The dip is mostly the dashboard. Measured, training loses about 5%, all in its CPU data loader sharing the node with vLLM. The GPU work doesn't change: MIG isolates the GPU, not the host. Fix: num_workers and CPU pinning."

Background (A/B on the demo cluster): GPU-side work on the training slice is the same with and without vLLM load (bf16 matmul 146.2 TFLOPS both ways, device copy 486 vs 480 GB/s, PCIe 50 GB/s, GPU step 155 ms). Real training throughput goes from 3.43 to 3.25 batches/s (about -5%), all of it in the `num_workers=0` DataLoader (137 → 153 ms/batch) competing with vLLM for host CPU. The per-slice DCGM profiling numbers on this card (RTX PRO 6000, driver 580) are not reliable enough to read more into the dip: DRAM_ACTIVE rises on the training slice while the busy vLLM slices report 0, and an idle vLLM slice once reported a constant 17.6%.

---

## 4. Fallbacks during the talk

| Problem | Do this |
|---|---|
| Anything hangs for more than 10s | Ctrl-C, go to the recording slide (two slides after the terminal slides) |
| Wi-Fi is gone | Same: the recording and the terminal slides are local |
| curl is slow | It is the first request after idle; wait up to 30s or use the recording |
| Grafana won't load | Use the Grafana slide (screenshot from Nov 2) |

---

## 5. Recovery (not on stage)

### Pods Pending, or the ResourceSlice shows only `gpu-0`

The DRA kubelet plugin started before MIG Manager finished cutting the card. `infra/index.ts` now waits for `nvidia.com/mig.config.state=success`, but if it happens anyway:

```bash
kubectl rollout restart ds -n dra-driver-nvidia-gpu dra-driver-nvidia-gpu-kubelet-plugin
kubectl get resourceslices -o jsonpath='{range .items[*].spec.devices[*]}{.name}{"\n"}{end}'
kubectl get pods -n mig-test -w
```

### curl returns 5xx or hangs

```bash
kubectl get pods -n mig-test
kubectl logs -n mig-test deploy/vllm-qwen3-a --tail=30
kubectl logs -n mig-test deploy/qwen3-epp --tail=30
kubectl rollout restart deploy -n mig-test vllm-qwen3-a vllm-qwen3-b   # 8B reload (download, compile, CUDA graphs) takes about 5 min
```

### Pods on different GPUs

Can't happen with one GPU on the node. On a multi-GPU node, recreate the claim so the scheduler re-allocates:

```bash
kubectl delete pod -n mig-test --all
kubectl delete resourceclaim -n mig-test shared-mig-claim
pulumi up    # from infra/, recreates the claim and pods
```

### Re-record the fallback video

From `slides-kubecon-na-2026/`, in the demo shell:

```bash
vhs demo.tape     # writes public/demo.gif, .mp4, .webm
```

---

## 6. After the talk

```bash
cd /Users/dirien/Tools/repos/stop-wasting-gpus-how-we-built-a-golden-path-for-gpu-sharing-on-kubernetes/infra
pulumi destroy -s kubecon
```

The g7e.4xlarge bills about $4/h until it is destroyed. If you reserved capacity by hand (ODCR), cancel it too:

```bash
pulumi env run ediri/pulumi-idp/auth -- aws ec2 describe-capacity-reservations --region us-east-1 \
  --filters Name=state,Values=active --query 'CapacityReservations[].[CapacityReservationId,InstanceType,EndDate]' --output table
pulumi env run ediri/pulumi-idp/auth -- aws ec2 cancel-capacity-reservation --region us-east-1 --capacity-reservation-id <id>
```
