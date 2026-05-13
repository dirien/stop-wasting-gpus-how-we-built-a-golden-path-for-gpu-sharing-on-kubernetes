import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: ["node_modules/**", "backstage-template/**"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            // Pulumi resources are declared with names for clarity; the constructor
            // call is the side effect that registers them with the engine.
            "@typescript-eslint/no-unused-vars": "off",
        },
    },
];
