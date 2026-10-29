import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import brand from "./eslint-rules/brand.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Brand guard rails: no raw colours, default palette or arbitrary sizes. See BRAND.md.
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/design/**", "src/**/*.test.ts"],
    plugins: { brand },
    rules: { "brand/no-off-brand-styles": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
