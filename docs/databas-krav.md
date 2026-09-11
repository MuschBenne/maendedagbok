# Kravspec för databasen

Den här filen beskriver **vad** databasen ska klara, inte **hur**. Tabeller, kolumner, nycklar
och index är ditt eget designarbete.

## Ditt uppdrag

1. **Schemat** i `db/schema.sql`: CREATE TABLE för allt som beskrivs nedan.
2. **Frågorna** i `src/db/mysql.ts`: en funktion i taget. Exakt vad varje funktion ska göra står i
   kommentarerna i `src/db/types.ts`.
3. **Kontrollen** med `npm run test:db`: kontraktstesterna visar om din SQL gör rätt.

Appen kör på en databas i minnet (mock) tills du är klar, så gränssnittet väntar aldrig på dig.
Ett förslag är att ta en grupp i samma takt som stegen: först Användare, Sessioner och Inloggningsspärr,
eftersom inloggningen byggs i steg 3. Byt till `DB_DRIVER=mysql` i `.env.local` när alla grupper
är gröna, senast inför deploy i steg 9.

## Kom igång

1. `cp .env.example .env.local` och fyll i ditt MySQL-lösenord i `DATABASE_URL_TEST`.
2. Starta MySQL om den inte redan är igång: `brew services start mysql`.
3. Kör `npm run test:db`. I början är alla tester röda med felet "inte implementerad än".
4. Kör en grupp i taget, t.ex. `npm run test:db -- -t "Användare"`.

Testerna raderar testdatabasen och bygger om den från `db/schema.sql` vid varje körning, så du kan
ändra schemat fritt. Databasnamnet måste sluta på `_test`, så att en riktig databas aldrig töms av misstag.

## Allmänna regler

- **Parametrar, alltid.** Värden skickas som `?` plus en lista och klistras aldrig in i SQL-strängen.
  Det skyddar mot SQL-injektion.
- **Filtrera på userId.** En funktion som tar `userId` får bara röra den användarens rader, vid
  läsning, ändring och borttagning. Testerna kontrollerar det.
- **Ingen `NOW()` i frågorna.** Tider skickas in som parametrar (`now`, `at`, `since`, `createdAt`).
  Då blir tidszonerna rätt och testerna kan bestämma vad klockan är.
- **Returnera exakt typens fält**, med samma namn som i `types.ts` (`panicWorry`, inte `panic_worry`),
  varken fler eller färre. Testerna jämför hela objekt.
- **Använd DATETIME för tidpunkter.** Anslutningen är inställd på UTC, så DATETIME sparar och läser
  tillbaka exakt samma tidpunkt. TIMESTAMP räknas om efter serverns tidszon.
- **null, inte undefined.** mysql2 kastar fel om en parameter är `undefined`.

Så här översätter mysql2 värden med inställningarna i `src/db/pool.ts`:

| I MySQL | Kommer till JavaScript som | Appen vill ha |
|---|---|---|
| DATE | `"2026-09-11"` | samma |
| DATETIME | `Date` | samma |
| TIME | `"14:30:00"` | `"14:30"` |
| BOOLEAN / TINYINT(1) | `1` eller `0` | `true` eller `false` |
| INT, `COUNT(...)` | number | samma |
| `SUM(...)`, DECIMAL | number | samma |
| NULL | `null` | samma |

## Vad som ska sparas

### Användare (steg 3)

- **Användarnamn:** unikt, högst 50 tecken. Kommer alltid med små bokstäver.
- **Lösenordshash:** en Argon2-sträng på runt 100 tecken, så reservera 255.
- Allt annat nedan hör till en användare. Tas en användare bort ska allt som hör till den också försvinna.

### Sessioner (steg 3)

- **Token-hash:** exakt 64 tecken (hex) och unik. Appen slår upp den vid varje sidladdning.
- Vilken användare sessionen tillhör, och när den går ut.

### Misslyckade inloggningar (steg 3)

- En **nyckel**, t.ex. `user:exempel` eller `ip:203.0.113.5` (högst 100 tecken), och en **tidpunkt**.
- Samma nyckel förekommer många gånger. Appen söker alltid på nyckel plus tidpunkt.

### Mitt mående (steg 4), formulär 2.2

- Datum, genomsnittlig ångest, genomsnittlig depression och genomsnittlig oro för panik
  (heltal 0–10), plus en valfri anteckning (fri text, upp till några tusen tecken).
- **Högst en post per användare och datum.** Sparas samma datum igen skrivs posten över.

### Panikattacker (steg 5), formulär 2.1

- Datum, började klockan (valfritt klockslag), triggers (valfri text), väntad eller oväntad,
  maximal rädsla (heltal 0–10), tankar (valfri text) och beteenden (valfri text).
- **Symtom:** 0–13 stycken ur den fasta listan i `src/lib/symptoms.ts`. Varje symtom har en nyckel på
  högst 30 tecken, t.ex. `palpitations`.

  Hur symtomen lagras är ett av de viktigaste designvalen. Fundera på:
  - Hur enkelt blir det att räkna symtom i steg 6 (`getSymptomFrequencies`)?
  - Vad händer med symtomen när en attack tas bort?
  - Kan databasen själv stoppa ett symtom som inte finns, eller samma symtom två gånger på en attack?
- `updatePanicAttack` byter ut hela symtomlistan. Behövs flera frågor för det, kör dem i en
  transaktion (`withTransaction` i `src/db/pool.ts`), så att en attack aldrig blir halvt uppdaterad.

### Delningslänkar (steg 7)

- **Token-hash** (64 hex-tecken, unik), första och sista datum som psykologen får se, utgångstid,
  när länken skapades och när den återkallades (valfritt, saknas = länken är aktiv).

### Att fundera på: index

Appen gör nästan alltid samma sorters sökningar: på användare plus datum (mående, panikattacker),
på token-hash (sessioner, länkar) och på nyckel plus tid (inloggningsförsök). Vilka index gör de
sökningarna snabba? Primärnycklar och UNIQUE får ett index automatiskt.

## Funktionerna

Den sista kolumnen är tips på SQL-begrepp. Hoppa över den om du vill klura själv.

| Grupp | Funktioner | Begrepp att kika på |
|---|---|---|
| Användare | `getUserByUsername`, `getUserById`, `createUser`, `updatePasswordHash` | SELECT, INSERT, UPDATE, UNIQUE, `insertId` |
| Sessioner | `createSession`, `getSession`, `extendSession`, `deleteSession`, `deleteAllSessionsForUser`, `deleteExpiredSessions` | DELETE med villkor, jämförelser på tider |
| Inloggningsspärr | `recordFailedLogin`, `countFailedLogins`, `clearFailedLogins` | `COUNT(*)` |
| Mitt mående | `upsertMoodEntry`, `getMoodEntry`, `listMoodEntries`, `deleteMoodEntry` | `INSERT … ON DUPLICATE KEY UPDATE`, BETWEEN, ORDER BY, `affectedRows` |
| Min panikdagbok | `createPanicAttack`, `updatePanicAttack`, `getPanicAttack`, `listPanicAttacks`, `deletePanicAttack` | transaktioner, JOIN, `FOREIGN KEY … ON DELETE CASCADE` |
| Statistik | `getWeeklyPanicCounts`, `getSymptomFrequencies` | GROUP BY på ett uttryck, `WEEKDAY()`, SUM, ORDER BY på flera kolumner |
| Delningslänkar | `createShareLink`, `getShareLinkByTokenHash`, `listShareLinks`, `revokeShareLink` | UPDATE med flera villkor |

## Så ser ett anrop ut i mysql2

Tabell- och kolumnnamnen här är påhittade; det är bara mönstret som gäller.

```ts
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

// Läsa: rows är en lista med ett objekt per rad, med kolumnnamnen som nycklar.
const [rows] = await pool.execute<RowDataPacket[]>(
  "SELECT id, namn FROM min_tabell WHERE id = ? AND user_id = ?",
  [id, userId],
);
if (rows.length === 0) return null;
return { id: rows[0].id, name: rows[0].namn };

// Skriva: result berättar vad som hände.
const [result] = await pool.execute<ResultSetHeader>(
  "UPDATE min_tabell SET namn = ? WHERE id = ? AND user_id = ?",
  [name, id, userId],
);
result.affectedRows; // hur många rader som matchade villkoret
result.insertId; // efter INSERT: id för den nya raden

// Flera frågor som hör ihop: antingen går alla igenom, eller ingen.
await withTransaction(pool, async (conn) => {
  await conn.execute("…", [/* … */]);
  await conn.execute("…", [/* … */]);
});
```

## TiDB Cloud (produktion)

TiDB är kompatibelt med MySQL, men med några skillnader:

- **CHECK-constraints ignoreras** som standard. Skriv dem gärna ändå, eftersom MySQL 8 lokalt
  respekterar dem. Appen validerar dessutom all indata.
- **FOREIGN KEY** fungerar (TiDB 6.6 och senare).
- **AUTO_INCREMENT** ger unika id:n, men de kommer inte garanterat i ordning. Det påverkar bara
  sorteringen mellan attacker på samma dag.
- Anslutningen måste vara krypterad, och det sköter redan `src/db/pool.ts`.

Samma `db/schema.sql` körs i TiDB när det är dags för deploy i steg 9.
