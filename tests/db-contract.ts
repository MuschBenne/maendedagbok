/**
 * Kontraktstesterna: en testsvit som körs mot varje implementation av `Database`.
 *
 * Varje test motsvarar ett krav i src/db/types.ts. Mock-implementationen testas alltid
 * (`npm test`, även i CI), och din MySQL-implementation med `npm run test:db`.
 * Testerna är grupperade per steg, så att du kan köra en grupp i taget,
 * t.ex. `npm run test:db -- -t "Mående"`. Varje test skapar egna användare och påverkar inte de andra.
 */
import { describe, expect, it } from "vitest";
import type { Database, MoodEntry, PanicAttack, PanicAttackInput, ShareLinkInput } from "@/db/types";

let counter = 0;
const uniqueName = () => `testare_${++counter}`;

/** Slumpad token-hash på 64 hex-tecken, som en riktig SHA-256. */
const tokenHash = () => (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "");

/** Tidpunkter i hela sekunder, eftersom DATETIME sparar sekunder. */
const at = (iso: string) => new Date(iso);

const mood = (date: string, overrides: Partial<MoodEntry> = {}): MoodEntry => ({
  date,
  anxiety: 3,
  depression: 2,
  panicWorry: 5,
  note: null,
  ...overrides,
});

const panic = (overrides: Partial<PanicAttackInput> = {}): PanicAttackInput => ({
  date: "2026-09-08",
  startTime: "14:30",
  triggers: "Trängsel på bussen",
  expected: false,
  maxFear: 8,
  symptoms: ["palpitations", "sweating", "fear_of_dying"],
  thoughts: "Jag trodde att jag skulle svimma",
  behaviors: "Klev av bussen",
  ...overrides,
});

/** Symtomens ordning spelar ingen roll, så de jämförs sorterade. */
const normalized = (attack: PanicAttack | null) =>
  attack && { ...attack, symptoms: [...attack.symptoms].sort() };

export function runContractTests(getDb: () => Database) {
  const newUser = () => getDb().createUser(uniqueName(), "hash");

  describe("Användare (steg 3)", () => {
    it("createUser ger ett id som går att slå upp på både namn och id", async () => {
      const db = getDb();
      const username = uniqueName();
      const id = await db.createUser(username, "argon2-hash");
      const expected = { id, username, passwordHash: "argon2-hash" };
      expect(await db.getUserByUsername(username)).toEqual(expected);
      expect(await db.getUserById(id)).toEqual(expected);
    });

    it("ger null för användare som inte finns", async () => {
      const db = getDb();
      expect(await db.getUserByUsername("finns_inte")).toBeNull();
      expect(await db.getUserById(2_000_000_000)).toBeNull();
    });

    it("nekar två användare med samma namn", async () => {
      const db = getDb();
      const username = uniqueName();
      await db.createUser(username, "hash");
      await expect(db.createUser(username, "hash")).rejects.toThrow();
    });

    it("updatePasswordHash byter hash bara för rätt användare", async () => {
      const db = getDb();
      const a = await newUser();
      const b = await newUser();
      await db.updatePasswordHash(a, "ny-hash");
      expect((await db.getUserById(a))?.passwordHash).toBe("ny-hash");
      expect((await db.getUserById(b))?.passwordHash).toBe("hash");
    });
  });

  describe("Sessioner (steg 3)", () => {
    const future = at("2030-01-01T12:00:00Z");

    it("createSession + getSession ger tillbaka användare och utgångstid", async () => {
      const db = getDb();
      const userId = await newUser();
      const hash = tokenHash();
      await db.createSession(hash, userId, future);
      expect(await db.getSession(hash)).toEqual({ userId, expiresAt: future });
    });

    it("getSession ger null för okänd token", async () => {
      expect(await getDb().getSession(tokenHash())).toBeNull();
    });

    it("extendSession sätter en ny utgångstid", async () => {
      const db = getDb();
      const userId = await newUser();
      const hash = tokenHash();
      await db.createSession(hash, userId, future);
      const later = at("2030-02-01T12:00:00Z");
      await db.extendSession(hash, later);
      expect((await db.getSession(hash))?.expiresAt).toEqual(later);
    });

    it("deleteSession tar bara bort den sessionen", async () => {
      const db = getDb();
      const userId = await newUser();
      const first = tokenHash();
      const second = tokenHash();
      await db.createSession(first, userId, future);
      await db.createSession(second, userId, future);
      await db.deleteSession(first);
      expect(await db.getSession(first)).toBeNull();
      expect(await db.getSession(second)).not.toBeNull();
    });

    it("deleteAllSessionsForUser rör inte andra användares sessioner", async () => {
      const db = getDb();
      const a = await newUser();
      const b = await newUser();
      const [a1, a2, b1] = [tokenHash(), tokenHash(), tokenHash()];
      await db.createSession(a1, a, future);
      await db.createSession(a2, a, future);
      await db.createSession(b1, b, future);
      await db.deleteAllSessionsForUser(a);
      expect(await db.getSession(a1)).toBeNull();
      expect(await db.getSession(a2)).toBeNull();
      expect(await db.getSession(b1)).not.toBeNull();
    });

    it("deleteExpiredSessions tar bort utgångna sessioner, även de som går ut exakt nu", async () => {
      const db = getDb();
      const userId = await newUser();
      const now = at("2020-06-01T12:00:00Z");
      const [before, exactly, after] = [tokenHash(), tokenHash(), tokenHash()];
      await db.createSession(before, userId, at("2020-06-01T11:00:00Z"));
      await db.createSession(exactly, userId, now);
      await db.createSession(after, userId, at("2020-06-01T13:00:00Z"));
      await db.deleteExpiredSessions(now);
      expect(await db.getSession(before)).toBeNull();
      expect(await db.getSession(exactly)).toBeNull();
      expect(await db.getSession(after)).not.toBeNull();
    });
  });

  describe("Inloggningsspärr (steg 3)", () => {
    it("räknar försök från och med en tidpunkt, per nyckel", async () => {
      const db = getDb();
      const key = `user:${uniqueName()}`;
      for (const time of ["10:00", "10:05", "10:10"]) {
        await db.recordFailedLogin(key, at(`2026-09-11T${time}:00Z`));
      }
      expect(await db.countFailedLogins(key, at("2026-09-11T09:00:00Z"))).toBe(3);
      expect(await db.countFailedLogins(key, at("2026-09-11T10:05:00Z"))).toBe(2);
      expect(await db.countFailedLogins(`user:${uniqueName()}`, at("2026-09-11T09:00:00Z"))).toBe(0);
    });

    it("clearFailedLogins nollställer bara den nyckeln", async () => {
      const db = getDb();
      const [key, other] = [`user:${uniqueName()}`, `ip:${uniqueName()}`];
      const since = at("2026-09-11T00:00:00Z");
      await db.recordFailedLogin(key, at("2026-09-11T10:00:00Z"));
      await db.recordFailedLogin(other, at("2026-09-11T10:00:00Z"));
      await db.clearFailedLogins(key);
      expect(await db.countFailedLogins(key, since)).toBe(0);
      expect(await db.countFailedLogins(other, since)).toBe(1);
    });
  });

  describe("Mitt mående (steg 4)", () => {
    it("sparar och hämtar en dags skattning, även skalans ytterlägen", async () => {
      const db = getDb();
      const userId = await newUser();
      const entry = mood("2026-09-11", { anxiety: 0, depression: 10, note: "Jobbig dag på jobbet" });
      await db.upsertMoodEntry(userId, entry);
      expect(await db.getMoodEntry(userId, "2026-09-11")).toEqual(entry);
    });

    it("skriver över posten när samma datum sparas igen", async () => {
      const db = getDb();
      const userId = await newUser();
      await db.upsertMoodEntry(userId, mood("2026-09-11", { anxiety: 7, note: "Första" }));
      const updated = mood("2026-09-11", { anxiety: 4, note: null });
      await db.upsertMoodEntry(userId, updated);
      expect(await db.listMoodEntries(userId, { from: "2026-09-11", to: "2026-09-11" })).toEqual([updated]);
    });

    it("listMoodEntries ger bara poster inom intervallet, äldst först", async () => {
      const db = getDb();
      const userId = await newUser();
      for (const date of ["2026-09-05", "2026-09-01", "2026-09-10", "2026-08-31", "2026-09-11"]) {
        await db.upsertMoodEntry(userId, mood(date));
      }
      const list = await db.listMoodEntries(userId, { from: "2026-09-01", to: "2026-09-10" });
      expect(list.map((m) => m.date)).toEqual(["2026-09-01", "2026-09-05", "2026-09-10"]);
    });

    it("en användare ser eller ändrar aldrig någon annans poster", async () => {
      const db = getDb();
      const a = await newUser();
      const b = await newUser();
      const entryA = mood("2026-09-01", { anxiety: 9 });
      await db.upsertMoodEntry(a, entryA);
      expect(await db.getMoodEntry(b, "2026-09-01")).toBeNull();
      expect(await db.listMoodEntries(b, { from: "2026-01-01", to: "2026-12-31" })).toEqual([]);
      await db.upsertMoodEntry(b, mood("2026-09-01", { anxiety: 1 }));
      expect(await db.getMoodEntry(a, "2026-09-01")).toEqual(entryA);
    });

    it("deleteMoodEntry ger true en gång och sedan false, och tar aldrig någon annans", async () => {
      const db = getDb();
      const a = await newUser();
      const b = await newUser();
      await db.upsertMoodEntry(a, mood("2026-09-01"));
      expect(await db.deleteMoodEntry(b, "2026-09-01")).toBe(false);
      expect(await db.getMoodEntry(a, "2026-09-01")).not.toBeNull();
      expect(await db.deleteMoodEntry(a, "2026-09-01")).toBe(true);
      expect(await db.deleteMoodEntry(a, "2026-09-01")).toBe(false);
      expect(await db.getMoodEntry(a, "2026-09-01")).toBeNull();
    });
  });

  describe("Min panikdagbok (steg 5)", () => {
    it("sparar en attack med alla fält och symtom och hämtar den", async () => {
      const db = getDb();
      const userId = await newUser();
      const input = panic();
      const id = await db.createPanicAttack(userId, input);
      expect(normalized(await db.getPanicAttack(userId, id))).toEqual(normalized({ id, ...input }));
    });

    it("klarar tomma fält, inga symtom och en väntad attack", async () => {
      const db = getDb();
      const userId = await newUser();
      const input = panic({
        startTime: null,
        triggers: null,
        expected: true,
        maxFear: 0,
        symptoms: [],
        thoughts: null,
        behaviors: null,
      });
      const id = await db.createPanicAttack(userId, input);
      expect(await db.getPanicAttack(userId, id)).toEqual({ id, ...input });
    });

    it("ger null för en annan användares attack", async () => {
      const db = getDb();
      const a = await newUser();
      const b = await newUser();
      const id = await db.createPanicAttack(a, panic());
      expect(await db.getPanicAttack(b, id)).toBeNull();
    });

    it("updatePanicAttack ersätter alla fält och hela symtomlistan", async () => {
      const db = getDb();
      const userId = await newUser();
      const id = await db.createPanicAttack(userId, panic());
      const changed = panic({
        date: "2026-09-09",
        startTime: "08:15",
        triggers: "Mataffären",
        expected: true,
        maxFear: 5,
        symptoms: ["choking"],
        thoughts: "Nu tappar jag kontrollen",
        behaviors: "Stannade kvar och andades lugnt",
      });
      expect(await db.updatePanicAttack(userId, id, changed)).toBe(true);
      expect(await db.getPanicAttack(userId, id)).toEqual({ id, ...changed });
    });

    it("updatePanicAttack ger false för attacker som inte finns eller tillhör någon annan", async () => {
      const db = getDb();
      const a = await newUser();
      const b = await newUser();
      const original = panic();
      const id = await db.createPanicAttack(a, original);
      expect(await db.updatePanicAttack(b, id, panic({ maxFear: 1, symptoms: [] }))).toBe(false);
      expect(await db.updatePanicAttack(a, 2_000_000_000, panic())).toBe(false);
      expect(normalized(await db.getPanicAttack(a, id))).toEqual(normalized({ id, ...original }));
    });

    it("listPanicAttacks ger bara egna attacker inom intervallet, sorterade på datum och id", async () => {
      const db = getDb();
      const userId = await newUser();
      const other = await newUser();
      const late = await db.createPanicAttack(userId, panic({ date: "2026-09-10" }));
      const first = await db.createPanicAttack(userId, panic({ date: "2026-09-01" }));
      const second = await db.createPanicAttack(userId, panic({ date: "2026-09-01" }));
      await db.createPanicAttack(userId, panic({ date: "2026-08-31" }));
      await db.createPanicAttack(other, panic({ date: "2026-09-05" }));
      const list = await db.listPanicAttacks(userId, { from: "2026-09-01", to: "2026-09-10" });
      expect(list.map((p) => p.id)).toEqual([first, second, late]);
      expect(normalized(list[0])).toEqual(normalized({ id: first, ...panic({ date: "2026-09-01" }) }));
    });

    it("deletePanicAttack ger true en gång och sedan false, och tar aldrig någon annans", async () => {
      const db = getDb();
      const a = await newUser();
      const b = await newUser();
      const id = await db.createPanicAttack(a, panic());
      expect(await db.deletePanicAttack(b, id)).toBe(false);
      expect(await db.getPanicAttack(a, id)).not.toBeNull();
      expect(await db.deletePanicAttack(a, id)).toBe(true);
      expect(await db.deletePanicAttack(a, id)).toBe(false);
      expect(await db.getPanicAttack(a, id)).toBeNull();
    });
  });

  describe("Statistik (steg 6)", () => {
    const september = { from: "2026-09-01", to: "2026-09-30" };

    it("getWeeklyPanicCounts grupperar per vecka (måndag–söndag) och räknar väntade", async () => {
      const db = getDb();
      const userId = await newUser();
      const other = await newUser();
      await db.createPanicAttack(userId, panic({ date: "2026-08-30", expected: true })); // utanför
      await db.createPanicAttack(userId, panic({ date: "2026-09-02" })); // ons, vecka 31/8
      await db.createPanicAttack(userId, panic({ date: "2026-09-07", expected: true })); // mån
      await db.createPanicAttack(userId, panic({ date: "2026-09-13" })); // sön, samma vecka
      await db.createPanicAttack(userId, panic({ date: "2026-09-16" })); // ons, nästa vecka
      await db.createPanicAttack(other, panic({ date: "2026-09-08" }));
      expect(await db.getWeeklyPanicCounts(userId, september)).toEqual([
        { weekStart: "2026-08-31", count: 1, expectedCount: 0 },
        { weekStart: "2026-09-07", count: 2, expectedCount: 1 },
        { weekStart: "2026-09-14", count: 1, expectedCount: 0 },
      ]);
    });

    it("getSymptomFrequencies räknar symtom, vanligast först och sedan i bokstavsordning", async () => {
      const db = getDb();
      const userId = await newUser();
      const other = await newUser();
      await db.createPanicAttack(userId, panic({ date: "2026-09-02", symptoms: ["palpitations", "sweating"] }));
      await db.createPanicAttack(userId, panic({ date: "2026-09-03", symptoms: ["palpitations", "choking"] }));
      await db.createPanicAttack(
        userId,
        panic({ date: "2026-09-04", symptoms: ["palpitations", "sweating", "dizziness"] }),
      );
      await db.createPanicAttack(userId, panic({ date: "2026-08-20", symptoms: ["choking", "sweating"] })); // utanför
      await db.createPanicAttack(other, panic({ date: "2026-09-02", symptoms: ["dizziness", "choking"] }));
      expect(await db.getSymptomFrequencies(userId, september)).toEqual([
        { symptom: "palpitations", count: 3 },
        { symptom: "sweating", count: 2 },
        { symptom: "choking", count: 1 },
        { symptom: "dizziness", count: 1 },
      ]);
    });

    it("ger tomma listor när det inte finns några attacker", async () => {
      const db = getDb();
      const userId = await newUser();
      expect(await db.getWeeklyPanicCounts(userId, september)).toEqual([]);
      expect(await db.getSymptomFrequencies(userId, september)).toEqual([]);
    });

    it("räknar inte symtom från borttagna attacker", async () => {
      const db = getDb();
      const userId = await newUser();
      const id = await db.createPanicAttack(userId, panic({ date: "2026-09-02", symptoms: ["nausea"] }));
      await db.deletePanicAttack(userId, id);
      expect(await db.getSymptomFrequencies(userId, september)).toEqual([]);
    });
  });

  describe("Delningslänkar (steg 7)", () => {
    const link = (overrides: Partial<ShareLinkInput> = {}): ShareLinkInput => ({
      tokenHash: tokenHash(),
      from: "2026-08-01",
      to: "2026-08-31",
      expiresAt: at("2026-10-01T12:00:00Z"),
      createdAt: at("2026-09-11T08:00:00Z"),
      ...overrides,
    });

    it("skapar en länk och hittar den via token-hash", async () => {
      const db = getDb();
      const userId = await newUser();
      const input = link();
      const id = await db.createShareLink(userId, input);
      expect(await db.getShareLinkByTokenHash(input.tokenHash)).toEqual({
        id,
        userId,
        ...input,
        revokedAt: null,
      });
    });

    it("ger null för okänd token", async () => {
      expect(await getDb().getShareLinkByTokenHash(tokenHash())).toBeNull();
    });

    it("listShareLinks ger bara egna länkar, nyast först", async () => {
      const db = getDb();
      const userId = await newUser();
      const other = await newUser();
      const eight = await db.createShareLink(userId, link({ createdAt: at("2026-09-11T08:00:00Z") }));
      const ten = await db.createShareLink(userId, link({ createdAt: at("2026-09-11T10:00:00Z") }));
      const nine = await db.createShareLink(userId, link({ createdAt: at("2026-09-11T09:00:00Z") }));
      await db.createShareLink(other, link());
      expect((await db.listShareLinks(userId)).map((l) => l.id)).toEqual([ten, nine, eight]);
    });

    it("revokeShareLink återkallar bara egna länkar", async () => {
      const db = getDb();
      const a = await newUser();
      const b = await newUser();
      const input = link();
      const id = await db.createShareLink(a, input);
      const revokedAt = at("2026-09-12T15:00:00Z");
      expect(await db.revokeShareLink(b, id, revokedAt)).toBe(false);
      expect((await db.getShareLinkByTokenHash(input.tokenHash))?.revokedAt).toBeNull();
      expect(await db.revokeShareLink(a, id, revokedAt)).toBe(true);
      expect((await db.getShareLinkByTokenHash(input.tokenHash))?.revokedAt).toEqual(revokedAt);
    });

    it("revokeShareLink ger false för länk som inte finns", async () => {
      const db = getDb();
      const userId = await newUser();
      expect(await db.revokeShareLink(userId, 2_000_000_000, at("2026-09-12T15:00:00Z"))).toBe(false);
    });
  });
}
