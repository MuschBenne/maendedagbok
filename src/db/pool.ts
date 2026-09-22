/**
 * Anslutningspool mot MySQL eller TiDB, och en hjälpfunktion för transaktioner.
 *
 * En pool håller några öppna anslutningar som återanvänds mellan anrop, i stället för att
 * ansluta på nytt varje gång. Här bestäms också hur värden översätts mellan MySQL och JavaScript:
 * DATE blir strängen "YYYY-MM-DD", DATETIME blir ett Date i UTC och DECIMAL (t.ex. från SUM) blir number.
 * Mot allt utom localhost krävs krypterad anslutning (TLS), och det kräver TiDB Cloud.
 */
import mysql, { type Pool, type PoolConnection } from "mysql2/promise";

export type { Pool, PoolConnection };

export function createPool(url: string): Pool {
  const { hostname } = new URL(url);
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";

  return mysql.createPool({
    uri: url,
    dateStrings: ["DATE"],
    timezone: "Z",
    decimalNumbers: true,
    connectionLimit: 5,
    maxIdle: 5,
    idleTimeout: 60_000,
    enableKeepAlive: true,
    ssl: isLocal ? undefined : { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
}

/**
 * Kör `work` i en transaktion: antingen går alla ändringar igenom, eller ingen.
 * Kastar `work` ett fel rullas allt tillbaka. Använd `conn` (inte poolen) för frågorna inuti.
 */
export async function withTransaction<T>(
  pool: Pool,
  work: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}
