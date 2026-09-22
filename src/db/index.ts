/**
 * Appens ingång till databasen: väljer implementation utifrån miljövariabeln DB_DRIVER.
 *
 * - "mysql": riktig databas via DATABASE_URL, med din SQL i mysql.ts.
 * - "mock": i minnet, för utveckling innan SQL:en är klar. Nekas i produktion på Vercel.
 * Databasen skapas första gången getDb() anropas och återanvänds sedan, även när Next.js
 * laddar om koden under utveckling. Filen kan bara importeras i serverkod ("server-only").
 */
import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { createMockDatabase } from "./mock";
import { createMysqlDatabase } from "./mysql";
import { createPool } from "./pool";
import type { Database } from "./types";

function createDatabase(): Database {
  const driver = process.env.DB_DRIVER;

  if (driver === "mysql") {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL saknas. Se .env.example.");
    const pool = createPool(url);
    // Låter Vercel stänga lediga anslutningar innan en serverfunktion pausas.
    attachDatabasePool(pool);
    return createMysqlDatabase(pool);
  }

  if (driver === "mock") {
    if (process.env.VERCEL_ENV === "production") {
      throw new Error("DB_DRIVER=mock får inte användas i produktion.");
    }
    return createMockDatabase();
  }

  throw new Error(
    `DB_DRIVER måste vara "mysql" eller "mock" (är: ${driver ?? "inte satt"}). Se .env.example.`,
  );
}

const globalForDb = globalThis as typeof globalThis & { __db?: Database };

export function getDb(): Database {
  globalForDb.__db ??= createDatabase();
  return globalForDb.__db;
}
