import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src-tauri", "test-results", "playwright-report", "public"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      // Logs must not contain personal data; keep console out of app code.
      "no-console": "error",
      "no-restricted-syntax": ["error", { selector: "CallExpression[callee.name='eval']", message: "No eval." }],
    },
  },
  { files: ["e2e/**", "**/*.test.ts", "**/*.test.tsx"], rules: { "no-console": "off" } },
);
