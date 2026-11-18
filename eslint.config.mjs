import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Astryx 테마 편집기가 만드는 파일 (직접 고치지 않는다)
    "themes/**",
    "src/themes/**",
    "src/astryx-themes.ts",
  ]),
]);

export default eslintConfig;
