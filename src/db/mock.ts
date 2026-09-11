/**
 * Minnesbaserad implementation av databaskontraktet, för utveckling och tester.
 *
 * Gör exakt det som mysql.ts ska göra, men sparar allt i vanliga JavaScript-listor som
 * försvinner när servern startas om. Tack vare den kan gränssnittet byggas innan SQL:en är klar.
 * Kontraktstesterna kör samma tester mot båda, så de beter sig likadant.
 * Allt som lämnar mocken är kopior, så att ingen kan ändra "databasen" förbi funktionerna.
 */
import type { SymptomKey } from "@/lib/symptoms";
import type {
  Database,
  DateRange,
  IsoDate,
  MoodEntry,
  PanicAttack,
  PanicAttackInput,
  Session,
  ShareLink,
  User,
  WeeklyPanicCount,
} from "./types";

type StoredMood = MoodEntry & { userId: number };
type StoredPanic = PanicAttack & { userId: number };

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const inRange = (date: IsoDate, range: DateRange) => date >= range.from && date <= range.to;

/** Måndagen i samma vecka som `date`. */
function mondayOf(date: IsoDate): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d.toISOString().slice(0, 10);
}

const toMood = (m: MoodEntry): MoodEntry => ({
  date: m.date,
  anxiety: m.anxiety,
  depression: m.depression,
  panicWorry: m.panicWorry,
  note: m.note,
});

const panicFields = (p: PanicAttackInput): PanicAttackInput => ({
  date: p.date,
  startTime: p.startTime,
  triggers: p.triggers,
  expected: p.expected,
  maxFear: p.maxFear,
  symptoms: [...p.symptoms],
  thoughts: p.thoughts,
  behaviors: p.behaviors,
});

const toPanic = (p: StoredPanic): PanicAttack => ({ id: p.id, ...panicFields(p) });

export function createMockDatabase(): Database {
  const users: User[] = [];
  const sessions = new Map<string, Session>();
  let failedLogins: { key: string; at: Date }[] = [];
  const moods: StoredMood[] = [];
  const panics: StoredPanic[] = [];
  const shareLinks: ShareLink[] = [];
  let nextId = 1;

  return {
    // ---- Användare ----
    async getUserByUsername(username) {
      const user = users.find((u) => u.username === username);
      return user ? { ...user } : null;
    },
    async getUserById(id) {
      const user = users.find((u) => u.id === id);
      return user ? { ...user } : null;
    },
    async createUser(username, passwordHash) {
      if (users.some((u) => u.username === username)) {
        throw new Error(`Användarnamnet ${username} finns redan`);
      }
      const id = nextId++;
      users.push({ id, username, passwordHash });
      return id;
    },
    async updatePasswordHash(userId, passwordHash) {
      const user = users.find((u) => u.id === userId);
      if (user) user.passwordHash = passwordHash;
    },

    // ---- Sessioner ----
    async createSession(tokenHash, userId, expiresAt) {
      if (sessions.has(tokenHash)) throw new Error("tokenHash finns redan");
      sessions.set(tokenHash, { userId, expiresAt: new Date(expiresAt) });
    },
    async getSession(tokenHash) {
      const session = sessions.get(tokenHash);
      return session ? { userId: session.userId, expiresAt: new Date(session.expiresAt) } : null;
    },
    async extendSession(tokenHash, expiresAt) {
      const session = sessions.get(tokenHash);
      if (session) session.expiresAt = new Date(expiresAt);
    },
    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },
    async deleteAllSessionsForUser(userId) {
      for (const [hash, session] of sessions) {
        if (session.userId === userId) sessions.delete(hash);
      }
    },
    async deleteExpiredSessions(now) {
      for (const [hash, session] of sessions) {
        if (session.expiresAt <= now) sessions.delete(hash);
      }
    },

    // ---- Inloggningsspärr ----
    async recordFailedLogin(key, at) {
      failedLogins.push({ key, at: new Date(at) });
    },
    async countFailedLogins(key, since) {
      return failedLogins.filter((f) => f.key === key && f.at >= since).length;
    },
    async clearFailedLogins(key) {
      failedLogins = failedLogins.filter((f) => f.key !== key);
    },

    // ---- Mitt mående ----
    async upsertMoodEntry(userId, entry) {
      const existing = moods.find((m) => m.userId === userId && m.date === entry.date);
      if (existing) Object.assign(existing, toMood(entry));
      else moods.push({ userId, ...toMood(entry) });
    },
    async getMoodEntry(userId, date) {
      const mood = moods.find((m) => m.userId === userId && m.date === date);
      return mood ? toMood(mood) : null;
    },
    async listMoodEntries(userId, range) {
      return moods
        .filter((m) => m.userId === userId && inRange(m.date, range))
        .sort((a, b) => compare(a.date, b.date))
        .map(toMood);
    },
    async deleteMoodEntry(userId, date) {
      const index = moods.findIndex((m) => m.userId === userId && m.date === date);
      if (index === -1) return false;
      moods.splice(index, 1);
      return true;
    },

    // ---- Min panikdagbok ----
    async createPanicAttack(userId, input) {
      const id = nextId++;
      panics.push({ id, userId, ...panicFields(input) });
      return id;
    },
    async updatePanicAttack(userId, id, input) {
      const panic = panics.find((p) => p.id === id && p.userId === userId);
      if (!panic) return false;
      Object.assign(panic, panicFields(input));
      return true;
    },
    async getPanicAttack(userId, id) {
      const panic = panics.find((p) => p.id === id && p.userId === userId);
      return panic ? toPanic(panic) : null;
    },
    async listPanicAttacks(userId, range) {
      return panics
        .filter((p) => p.userId === userId && inRange(p.date, range))
        .sort((a, b) => compare(a.date, b.date) || a.id - b.id)
        .map(toPanic);
    },
    async deletePanicAttack(userId, id) {
      const index = panics.findIndex((p) => p.id === id && p.userId === userId);
      if (index === -1) return false;
      panics.splice(index, 1);
      return true;
    },

    // ---- Statistik ----
    async getWeeklyPanicCounts(userId, range) {
      const weeks = new Map<IsoDate, WeeklyPanicCount>();
      for (const panic of panics) {
        if (panic.userId !== userId || !inRange(panic.date, range)) continue;
        const weekStart = mondayOf(panic.date);
        const week = weeks.get(weekStart) ?? { weekStart, count: 0, expectedCount: 0 };
        week.count += 1;
        if (panic.expected) week.expectedCount += 1;
        weeks.set(weekStart, week);
      }
      return [...weeks.values()].sort((a, b) => compare(a.weekStart, b.weekStart));
    },
    async getSymptomFrequencies(userId, range) {
      const counts = new Map<SymptomKey, number>();
      for (const panic of panics) {
        if (panic.userId !== userId || !inRange(panic.date, range)) continue;
        for (const symptom of panic.symptoms) counts.set(symptom, (counts.get(symptom) ?? 0) + 1);
      }
      return [...counts]
        .map(([symptom, count]) => ({ symptom, count }))
        .sort((a, b) => b.count - a.count || compare(a.symptom, b.symptom));
    },

    // ---- Delningslänkar ----
    async createShareLink(userId, input) {
      if (shareLinks.some((l) => l.tokenHash === input.tokenHash)) {
        throw new Error("tokenHash finns redan");
      }
      const id = nextId++;
      shareLinks.push(structuredClone({ id, userId, ...input, revokedAt: null }));
      return id;
    },
    async getShareLinkByTokenHash(tokenHash) {
      const link = shareLinks.find((l) => l.tokenHash === tokenHash);
      return link ? structuredClone(link) : null;
    },
    async listShareLinks(userId) {
      return shareLinks
        .filter((l) => l.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id)
        .map((l) => structuredClone(l));
    },
    async revokeShareLink(userId, id, at) {
      const link = shareLinks.find((l) => l.id === id && l.userId === userId);
      if (!link) return false;
      link.revokedAt = new Date(at);
      return true;
    },
  };
}
