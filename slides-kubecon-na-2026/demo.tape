# VHS recording for the KubeCon NA 2026 demo fallback.
# Render from slides-kubecon-na-2026/ with a kubeconfig for the demo cluster:
#   pulumi env run ediri/pulumi-idp/auth -- env KUBECONFIG=/tmp/kubeconfig vhs demo.tape
# Outputs:  public/demo.gif, public/demo.mp4, public/demo.webm
# The live version of these steps, with talk track and recovery: ../DEMO.md

Output "public/demo.gif"
Output "public/demo.mp4"
Output "public/demo.webm"

Set Shell "bash"
Set FontSize 20
Set Width 1600
Set Height 900
Set Padding 24
Set Theme "Catppuccin Macchiato"
Set TypingSpeed 35ms
Set PlaybackSpeed 1.0

Hide
Type 'export PS1="$ "' Enter
Type `GW=$(kubectl get gateway llm-d-inference-gateway -n mig-test -o jsonpath='{.status.addresses[0].value}')` Enter
Sleep 4s
Type "clear" Enter
# let clear finish before the first visible frame, or the setup lines flash on screen
Sleep 1s
Show

# Screen 1 — the GPU: what it can be cut into, and what it is cut into now

Type "# The GPU node and its MIG layout"
Enter
Type "kubectl get nodes -l node-role=gpu -L nvidia.com/gpu.machine,nvidia.com/mig.config"
Sleep 600ms
Enter
Sleep 3s

Type "# Which MIG profiles does this GPU support? (Instances = free/total)"
Enter
Type@15ms `kubectl exec -n gpu-operator ds/nvidia-mig-manager -c nvidia-mig-manager -- nvidia-smi mig -lgip | grep -E 'Name|Free/Total|MIG [0-9]g\.[0-9]+gb '`
Sleep 600ms
Enter
Sleep 5s

Type "# What the DRA driver publishes to the scheduler: the slices that exist right now"
Enter
Type@15ms `kubectl get resourceslices -o jsonpath='{"DEVICE\t\t\tPROFILE\tPARENT GPU\n"}{range .items[*].spec.devices[*]}{.name}{"\t"}{.attributes.profile.string}{"\t"}{.attributes.parentUUID.string}{"\n"}{end}'`
Sleep 600ms
Enter
Sleep 5s

Hide
Type "clear" Enter
Sleep 1s
Show

# Screen 2 — the pods: which request, which slice, and the proof from inside

Type "# Which pod asks for which request of the shared ResourceClaim?"
Enter
Type@15ms "kubectl get pods -n mig-test -o custom-columns='POD:.metadata.name,NODE:.spec.nodeName,REQUEST:.spec.containers[0].resources.claims[0].request'"
Sleep 600ms
Enter
Sleep 5s

Type "# Which slice did the scheduler give each request?"
Enter
Type@15ms `kubectl get resourceclaim shared-mig-claim -n mig-test -o jsonpath='{"REQUEST\t\tDEVICE\n"}{range .status.allocation.devices.results[*]}{.request}{"\t"}{.device}{"\n"}{end}'`
Sleep 600ms
Enter
Sleep 4s

Type "# Proof from inside: same GPU UUID, different MIG UUIDs"
Enter
Type@15ms "for t in pod/mig-large-training-pod deploy/vllm-qwen3-a deploy/vllm-qwen3-b; do kubectl exec -n mig-test $t -- nvidia-smi -L; done"
Sleep 600ms
Enter
Sleep 7s

Hide
Type "clear" Enter
Sleep 1s
Show

# Screen 3 — the gateway and a real request, served from a 1g MIG slice

Type "# The route and the InferencePool in front of the two vLLM replicas"
Enter
Type "kubectl get httproute,inferencepool -n mig-test"
Sleep 600ms
Enter
Sleep 3s

Type "# A real request through the gateway"
Enter
Type@15ms `curl -sS http://$GW/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"Qwen/Qwen3-8B-FP8","max_tokens":120,"chat_template_kwargs":{"enable_thinking":false},"messages":[{"role":"user","content":"In two sentences: why should teams share one GPU?"}]}' | jq -r '.choices[0].message.content'`
Sleep 800ms
Enter
# Qwen3-8B answers in about 1s; hold the frame long enough to read two sentences
Sleep 11s
