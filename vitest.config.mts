/**
 * Vitest-konfiguration: hur testerna hittas och körs.
 *
 * Två lägen:
 * - `npm test`: alla tester utom MySQL-kontraktstesterna. Kräver ingen databas, så de körs även i CI.
 * - `npm run test:db` (TEST_DB=mysql): bara MySQL-kontraktstesterna, med variabler från .env.local.
 * Testerna körs i Node (inte i en webbläsare), och @/ pekar på src/ precis som i appen.
 */
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const mysqlTests = "tests/db-contract.mysql.test.ts";
const mysqlMode = process.env.TEST_DB === "mysql";

if (mysqlMode) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Filen saknas: testfilen säger till med ett tydligt fel.
  }
}

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: mysqlMode ? [mysqlTests] : ["src/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: mysqlMode ? configDefaults.exclude : [...configDefaults.exclude, mysqlTests],
  },
});
