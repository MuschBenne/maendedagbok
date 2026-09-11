/**
 * Databaskontraktet: allt appen behöver från databasen, beskrivet som ett TypeScript-gränssnitt.
 *
 * Resten av appen pratar bara med `Database` och vet inget om tabeller eller SQL.
 * Det finns två implementationer: mysql.ts (din SQL) och mock.ts (i minnet, för utveckling).
 * Kontraktstesterna i tests/ kontrollerar att båda beter sig exakt likadant.
 *
 * Grundregel: en funktion som tar `userId` får bara läsa, ändra eller ta bort den användarens rader.
 */
import type { SymptomKey } from "@/lib/symptoms";

/** Ett datum utan klockslag, "YYYY-MM-DD", t.ex. "2026-09-11". */
export type IsoDate = string;

/** En skattning på bokens skala 0–10 (0 Ingen, 5 Måttlig, 10 Extrem). Alltid ett heltal. */
export type Rating = number;

/** Ett datumintervall där både `from` och `to` räknas med. */
export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

export interface User {
  id: number;
  /** Alltid med små bokstäver. */
  username: string;
  /** Argon2id-hash av lösenordet. Själva lösenordet sparas aldrig. */
  passwordHash: string;
}

export interface Session {
  userId: number;
  expiresAt: Date;
}

/** Formulär 2.2 Mitt mående: en post per användare och dag. */
export interface MoodEntry {
  date: IsoDate;
  /** Genomsnittlig ångest */
  anxiety: Rating;
  /** Genomsnittlig depression */
  depression: Rating;
  /** Genomsnittlig oro för panik */
  panicWorry: Rating;
  /** Valfri anteckning */
  note: string | null;
}

/** Formulär 2.1 Min panikdagbok: det som fylls i om en panikattack. */
export interface PanicAttackInput {
  date: IsoDate;
  /** Började klockan, "HH:MM" i svensk tid. null om man inte minns. */
  startTime: string | null;
  triggers: string | null;
  /** Väntad (true) eller oväntad (false) attack. */
  expected: boolean;
  /** Maximal rädsla */
  maxFear: Rating;
  /** Symtom som upplevdes i minst lindrig omfattning. Inga dubbletter; ordningen spelar ingen roll. */
  symptoms: SymptomKey[];
  thoughts: string | null;
  behaviors: string | null;
}

export interface PanicAttack extends PanicAttackInput {
  id: number;
}

export interface WeeklyPanicCount {
  /** Måndagen i veckan, t.ex. "2026-09-07". Kan ligga före intervallets början. */
  weekStart: IsoDate;
  /** Antal panikattacker den veckan. */
  count: number;
  /** Hur många av dem som var väntade. */
  expectedCount: number;
}

export interface SymptomFrequency {
  symptom: SymptomKey;
  count: number;
}

/** En läslänk till psykologen. Bara hashen av token sparas, aldrig själva token. */
export interface ShareLinkInput {
  tokenHash: string;
  /** Första datumet psykologen får se. */
  from: IsoDate;
  /** Sista datumet psykologen får se. */
  to: IsoDate;
  expiresAt: Date;
  createdAt: Date;
}

export interface ShareLink extends ShareLinkInput {
  id: number;
  userId: number;
  /** När länken återkallades, eller null om den fortfarande är aktiv. */
  revokedAt: Date | null;
}

export interface Database {
  // ---- Användare (steg 3) ----

  /** Användaren med exakt det användarnamnet, eller null. */
  getUserByUsername(username: string): Promise<User | null>;
  /** Användaren med det id:t, eller null. */
  getUserById(id: number): Promise<User | null>;
  /** Skapar en användare och returnerar dess nya id. Kastar fel om användarnamnet redan finns. */
  createUser(username: string, passwordHash: string): Promise<number>;
  /** Byter lösenordshash för användaren. */
  updatePasswordHash(userId: number, passwordHash: string): Promise<void>;

  // ---- Sessioner (steg 3) ----

  /** Sparar en ny inloggning. `tokenHash` är 64 hex-tecken och unik. */
  createSession(tokenHash: string, userId: number, expiresAt: Date): Promise<void>;
  /** Sessionen med den hashen, eller null. Returnerar även utgångna sessioner; appen kontrollerar tiden. */
  getSession(tokenHash: string): Promise<Session | null>;
  /** Sätter en ny utgångstid på sessionen. */
  extendSession(tokenHash: string, expiresAt: Date): Promise<void>;
  /** Tar bort en session (utloggning). */
  deleteSession(tokenHash: string): Promise<void>;
  /** Tar bort alla användarens sessioner ("logga ut överallt"). */
  deleteAllSessionsForUser(userId: number): Promise<void>;
  /** Tar bort alla sessioner, oavsett användare, vars utgångstid är `now` eller tidigare. */
  deleteExpiredSessions(now: Date): Promise<void>;

  // ---- Inloggningsspärr (steg 3) ----

  /** Registrerar ett misslyckat inloggningsförsök för `key` (t.ex. "user:benjamin") vid tiden `at`. */
  recordFailedLogin(key: string, at: Date): Promise<void>;
  /** Antal misslyckade försök för `key` vid tiden `since` eller senare. */
  countFailedLogins(key: string, since: Date): Promise<number>;
  /** Tar bort alla registrerade försök för `key`, t.ex. efter en lyckad inloggning. */
  clearFailedLogins(key: string): Promise<void>;

  // ---- Mitt mående (steg 4) ----

  /** Sparar en dags skattning. Finns det redan en post för det datumet skrivs den över. */
  upsertMoodEntry(userId: number, entry: MoodEntry): Promise<void>;
  /** Posten för det datumet, eller null. */
  getMoodEntry(userId: number, date: IsoDate): Promise<MoodEntry | null>;
  /** Alla poster inom intervallet, äldst först. */
  listMoodEntries(userId: number, range: DateRange): Promise<MoodEntry[]>;
  /** Tar bort posten för det datumet. Returnerar true om något togs bort. */
  deleteMoodEntry(userId: number, date: IsoDate): Promise<boolean>;

  // ---- Min panikdagbok (steg 5) ----

  /** Sparar en panikattack med symtom och returnerar dess nya id. */
  createPanicAttack(userId: number, input: PanicAttackInput): Promise<number>;
  /** Ersätter alla fält och hela symtomlistan. false om attacken inte finns eller tillhör någon annan. */
  updatePanicAttack(userId: number, id: number, input: PanicAttackInput): Promise<boolean>;
  /** Attacken med symtom, eller null om den inte finns eller tillhör någon annan. */
  getPanicAttack(userId: number, id: number): Promise<PanicAttack | null>;
  /** Alla attacker med symtom inom intervallet, sorterade på datum och sedan id, äldst först. */
  listPanicAttacks(userId: number, range: DateRange): Promise<PanicAttack[]>;
  /** Tar bort attacken och dess symtom. Returnerar true om något togs bort. */
  deletePanicAttack(userId: number, id: number): Promise<boolean>;

  // ---- Statistik (steg 6) ----

  /**
   * Antal attacker per vecka (måndag–söndag) inom intervallet, äldsta veckan först.
   * Bara veckor med minst en attack kommer med.
   */
  getWeeklyPanicCounts(userId: number, range: DateRange): Promise<WeeklyPanicCount[]>;
  /**
   * Hur många attacker inom intervallet varje symtom förekom i.
   * Vanligast först; lika vanliga sorteras på nyckeln i bokstavsordning. Symtom som aldrig förekom tas inte med.
   */
  getSymptomFrequencies(userId: number, range: DateRange): Promise<SymptomFrequency[]>;

  // ---- Delningslänkar (steg 7) ----

  /** Sparar en ny delningslänk och returnerar dess id. `tokenHash` är unik. */
  createShareLink(userId: number, input: ShareLinkInput): Promise<number>;
  /** Länken med den hashen, eller null. Returnerar även utgångna och återkallade länkar; appen kontrollerar dem. */
  getShareLinkByTokenHash(tokenHash: string): Promise<ShareLink | null>;
  /** Användarens alla länkar, nyast (`createdAt`) först. */
  listShareLinks(userId: number): Promise<ShareLink[]>;
  /** Sätter `revokedAt` till `at`. false om länken inte finns eller tillhör någon annan. */
  revokeShareLink(userId: number, id: number, at: Date): Promise<boolean>;
}
