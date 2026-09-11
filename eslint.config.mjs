/**
 * ESLint-konfiguration: regler som `npm run lint` kontrollerar koden mot.
 *
 * Använder Next.js rekommenderade regler (React, hooks, prestanda, TypeScript)
 * och hoppar över genererade filer som .next/.
 */
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
  ]),
]);

export default eslintConfig;
