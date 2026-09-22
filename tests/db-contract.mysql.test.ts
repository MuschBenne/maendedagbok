/**
 * Kör kontraktstesterna mot din MySQL-implementation (src/db/mysql.ts) med `npm run test:db`.
 *
 * 1. Läser DATABASE_URL_TEST från .env.local. Databasnamnet måste sluta på _test,
 *    så att en riktig databas aldrig kan tömmas av misstag.
 * 2. Raderar testdatabasen, skapar den på nytt och kör db/schema.sql i den.
 * 3. Kör hela testsviten mot createMysqlDatabase.
 */
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { afterAll, beforeAll, describe } from "vitest";
import { createMysqlDatabase } from "@/db/mysql";
import { createPool, type Pool } from "@/db/pool";
import type { Database } from "@/db/types";
import { runContractTests } from "./db-contract";

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) throw new Error("DATABASE_URL_TEST saknas i .env.local. Se .env.example.");

/** Tar bort SQL-kommentarer, för att se om schemafilen innehåller något alls. */
const withoutComments = (sql: string) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "").trim();

async function recreateTestDatabase(url: string) {
  const server = new URL(url);
  const dbName = decodeURIComponent(server.pathname.slice(1));
  if (!/^\w+_test$/.test(dbName)) {
    throw new Error(`Testdatabasens namn måste sluta på _test (är: "${dbName}").`);
  }
  server.pathname = "/";

  const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  // multipleStatements behövs för att köra hela schemafilen i ett anrop. Bara här, aldrig i appen.
  const conn = await mysql.createConnection({ uri: server.toString(), multipleStatements: true });
  try {
    // Namnet är kontrollerat ovan (bara bokstäver, siffror och _), så det är säkert att sätta in.
    await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await conn.query(`CREATE DATABASE \`${dbName}\``);
    await conn.query(`USE \`${dbName}\``);
    if (withoutComments(schema)) await conn.query(schema);
  } finally {
    await conn.end();
  }
}

let pool: Pool | undefined;
let db: Database;

beforeAll(async () => {
  await recreateTestDatabase(testUrl);
  pool = createPool(testUrl);
  db = createMysqlDatabase(pool);
});

afterAll(async () => {
  await pool?.end();
});

describe("mysql", () => {
  runContractTests(() => db);
});
