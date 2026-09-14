import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["assets/**"] },
    js.configs.recommended,
    {
        files: ["*.js", "level-editor/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            "eqeqeq": "error",
            "no-unused-vars": "off",
            "no-var": "error",
            "prefer-const": "error"
        }
    },
    {
        files: ["tests/**/*.js", "eslint.config.js"],
        languageOptions: { globals: globals.node }
    }
];
