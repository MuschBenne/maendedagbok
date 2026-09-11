/**
 * MySQL-implementationen av databaskontraktet. DIN FIL: här skriver du all SQL.
 *
 * Varje funktion motsvarar en funktion i `Database` (src/db/types.ts), och där står exakt
 * vad den ska göra. Just nu kastar alla ett "inte implementerad"-fel. Byt ut dem en grupp i taget
 * och kör `npm run test:db -- -t "Användare"` (osv.) för att se att de gör rätt.
 * Kom ihåg: parametrar med `?`, aldrig strängsammanslagning, och filtrera alltid på userId.
 * Exempel på hur ett anrop ser ut finns i docs/databas-krav.md.
 */
/* eslint-disable @typescript-eslint/no-unused-vars -- stubbar; ta bort raden när allt är implementerat */
import type { Pool } from "./pool";
import type { Database } from "./types";

function notImplemented(name: keyof Database): never {
  throw new Error(`${name} är inte implementerad än (src/db/mysql.ts)`);
}

export function createMysqlDatabase(pool: Pool): Database {
  return {
    // ---- Användare (steg 3) ----
    async getUserByUsername(username) {
      return notImplemented("getUserByUsername");
    },
    async getUserById(id) {
      return notImplemented("getUserById");
    },
    async createUser(username, passwordHash) {
      return notImplemented("createUser");
    },
    async updatePasswordHash(userId, passwordHash) {
      return notImplemented("updatePasswordHash");
    },

    // ---- Sessioner (steg 3) ----
    async createSession(tokenHash, userId, expiresAt) {
      return notImplemented("createSession");
    },
    async getSession(tokenHash) {
      return notImplemented("getSession");
    },
    async extendSession(tokenHash, expiresAt) {
      return notImplemented("extendSession");
    },
    async deleteSession(tokenHash) {
      return notImplemented("deleteSession");
    },
    async deleteAllSessionsForUser(userId) {
      return notImplemented("deleteAllSessionsForUser");
    },
    async deleteExpiredSessions(now) {
      return notImplemented("deleteExpiredSessions");
    },

    // ---- Inloggningsspärr (steg 3) ----
    async recordFailedLogin(key, at) {
      return notImplemented("recordFailedLogin");
    },
    async countFailedLogins(key, since) {
      return notImplemented("countFailedLogins");
    },
    async clearFailedLogins(key) {
      return notImplemented("clearFailedLogins");
    },

    // ---- Mitt mående (steg 4) ----
    async upsertMoodEntry(userId, entry) {
      return notImplemented("upsertMoodEntry");
    },
    async getMoodEntry(userId, date) {
      return notImplemented("getMoodEntry");
    },
    async listMoodEntries(userId, range) {
      return notImplemented("listMoodEntries");
    },
    async deleteMoodEntry(userId, date) {
      return notImplemented("deleteMoodEntry");
    },

    // ---- Min panikdagbok (steg 5) ----
    async createPanicAttack(userId, input) {
      return notImplemented("createPanicAttack");
    },
    async updatePanicAttack(userId, id, input) {
      return notImplemented("updatePanicAttack");
    },
    async getPanicAttack(userId, id) {
      return notImplemented("getPanicAttack");
    },
    async listPanicAttacks(userId, range) {
      return notImplemented("listPanicAttacks");
    },
    async deletePanicAttack(userId, id) {
      return notImplemented("deletePanicAttack");
    },

    // ---- Statistik (steg 6) ----
    async getWeeklyPanicCounts(userId, range) {
      return notImplemented("getWeeklyPanicCounts");
    },
    async getSymptomFrequencies(userId, range) {
      return notImplemented("getSymptomFrequencies");
    },

    // ---- Delningslänkar (steg 7) ----
    async createShareLink(userId, input) {
      return notImplemented("createShareLink");
    },
    async getShareLinkByTokenHash(tokenHash) {
      return notImplemented("getShareLinkByTokenHash");
    },
    async listShareLinks(userId) {
      return notImplemented("listShareLinks");
    },
    async revokeShareLink(userId, id, at) {
      return notImplemented("revokeShareLink");
    },
  };
}
