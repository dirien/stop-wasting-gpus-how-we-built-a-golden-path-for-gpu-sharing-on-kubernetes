# VHS recording for the KCD Texas live-demo fallback.
# Render:   pulumi env run ediri/pulumi-idp/auth -- env KUBECONFIG=/tmp/kubeconfig vhs slides/demo.tape
# Outputs:  slides/public/demo.gif  (and demo.mp4 / demo.webm if uncommented)

Output "slides/public/demo.gif"
Output "slides/public/demo.mp4"
Output "slides/public/demo.webm"

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
Type "clear" Enter
Show

# 1 — the GPU node
Type "kubectl get nodes -l node-role=gpu"
Sleep 600ms
Enter
Sleep 2.5s

# 2 — the three demo pods
Type "kubectl get pods -n mig-test"
Sleep 600ms
Enter
Sleep 2.5s

# 3 — the shared ResourceClaim (allocated,reserved)
Type "kubectl get resourceclaim -n mig-test"
Sleep 600ms
Enter
Sleep 2.5s

# 4 — the keeper: same parent GPU UUID across all three pods, different MIG UUIDs
Type "for p in mig-large-training mig-medium-training mig-small-inference; do kubectl exec ${p}-pod -n mig-test -- nvidia-smi -L; done"
Sleep 800ms
Enter
Sleep 6s
