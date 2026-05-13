import * as policy from "@pulumi/policy";

// Allowed MIG profiles on this cluster: A100 40GB (p4d.24xlarge) with
// `all-balanced` layout = 2× 1g.5gb + 1× 2g.10gb + 1× 3g.20gb per GPU.
const allowedMigProfiles = ["1g.5gb", "2g.10gb", "3g.20gb"];

// Profiles that either (a) don't exist on this hardware (the 80GB family —
// 1g.10gb, 2g.20gb, 3g.40gb, 7g.80gb belong to A100 80GB / H100), or
// (b) defeat sharing by claiming the whole card (7g.40gb on A100 40GB).
const blockedMigProfiles = [
    "1g.10gb", "2g.20gb", "3g.40gb", "7g.80gb",   // 80GB-only profiles
    "4g.20gb", "4g.40gb",                            // unsupported on this cluster
    "7g.40gb",                                       // full-GPU on A100 40GB — defeats MIG
];

new policy.PolicyPack("mig-policy", {
    policies: [
        {
            name: "enforce-small-mig-profiles",
            description: "Prevents using large MIG profiles (3g.40gb and above) to maximize GPU utilization for inference workloads",
            enforcementLevel: "mandatory",
            validateResource: (args, reportViolation) => {
                const resource = args.props as any;

                // Match ResourceClaim AND ResourceClaimTemplate (native + CR shapes).
                // We need both: the demo uses a shared ResourceClaim with matchAttributes;
                // older patterns used per-pod ResourceClaimTemplates.
                const isClaimKind = (kind: string) =>
                    args.type === `kubernetes:resource.k8s.io/v1:${kind}` ||
                    (args.type === "kubernetes:apiextensions.k8s.io/v1:CustomResource" &&
                     resource.apiVersion === "resource.k8s.io/v1" &&
                     resource.kind === kind);

                const isTemplate = isClaimKind("ResourceClaimTemplate");
                const isClaim = isClaimKind("ResourceClaim");
                if (!isTemplate && !isClaim) {
                    return;
                }

                // ResourceClaimTemplate nests devices under spec.spec.devices;
                // ResourceClaim has spec.devices directly.
                const devices = isTemplate
                    ? resource.spec?.spec?.devices
                    : resource.spec?.devices;
                if (!devices?.requests) {
                    return;
                }
                const spec = { spec: { devices } };

                for (const request of spec.spec.devices.requests) {
                    const selectors = request.exactly?.selectors || [];
                    for (const selector of selectors) {
                        const expression = selector.cel?.expression;
                        if (!expression) continue;

                        // Check for blocked MIG profiles in the CEL expression
                        for (const blockedProfile of blockedMigProfiles) {
                            if (expression.includes(`"${blockedProfile}"`)) {
                                reportViolation(
                                    `ResourceClaimTemplate '${resource.metadata?.name}' requests ` +
                                    `blocked MIG profile '${blockedProfile}'. ` +
                                    `Only small profiles are allowed: ${allowedMigProfiles.join(", ")}. ` +
                                    `Large profiles waste GPU resources for inference workloads.`
                                );
                            }
                        }
                    }
                }
            },
        },
        {
            name: "require-mig-type-selector",
            description: "Ensures ResourceClaimTemplates explicitly request MIG devices (not full GPUs)",
            enforcementLevel: "advisory",
            validateResource: (args, reportViolation) => {
                const resource = args.props as any;

                // Match ResourceClaim AND ResourceClaimTemplate (native + CR shapes).
                // We need both: the demo uses a shared ResourceClaim with matchAttributes;
                // older patterns used per-pod ResourceClaimTemplates.
                const isClaimKind = (kind: string) =>
                    args.type === `kubernetes:resource.k8s.io/v1:${kind}` ||
                    (args.type === "kubernetes:apiextensions.k8s.io/v1:CustomResource" &&
                     resource.apiVersion === "resource.k8s.io/v1" &&
                     resource.kind === kind);

                const isTemplate = isClaimKind("ResourceClaimTemplate");
                const isClaim = isClaimKind("ResourceClaim");
                if (!isTemplate && !isClaim) {
                    return;
                }

                // ResourceClaimTemplate nests devices under spec.spec.devices;
                // ResourceClaim has spec.devices directly.
                const devices = isTemplate
                    ? resource.spec?.spec?.devices
                    : resource.spec?.devices;
                if (!devices?.requests) {
                    return;
                }
                const spec = { spec: { devices } };

                for (const request of spec.spec.devices.requests) {
                    const selectors = request.exactly?.selectors || [];
                    let hasMigTypeSelector = false;

                    for (const selector of selectors) {
                        const expression = selector.cel?.expression;
                        if (expression && expression.includes('type == "mig"')) {
                            hasMigTypeSelector = true;
                            break;
                        }
                    }

                    if (!hasMigTypeSelector) {
                        reportViolation(
                            `ResourceClaimTemplate '${resource.metadata?.name}' does not explicitly ` +
                            `request MIG devices. Consider adding 'device.attributes["gpu.nvidia.com"].type == "mig"' ` +
                            `to your CEL expression to ensure you get a MIG partition instead of a full GPU.`
                        );
                    }
                }
            },
        },
    ],
});
