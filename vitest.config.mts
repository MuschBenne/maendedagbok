/**
 * Vitest-konfiguration: hur `npm test` hittar och kör testerna.
 *
 * Testerna ligger i *.test.ts-filer under src/ och tests/, körs i Node (inte i en webbläsare),
 * och @/ pekar på src/ precis som i appen.
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
