# Måendedagbok

Personlig dagbok som komplement till psykologbehandling för paniksyndrom och agorafobi.
Den bygger på två formulär ur *Hantera ångest och paniksyndrom*:

- **Formulär 2.1 Min panikdagbok**: en post per panikattack (triggers, väntad/oväntad, maximal rädsla, symtom, tankar, beteenden)
- **Formulär 2.2 Mitt mående**: en post per dag (genomsnittlig ångest, depression och oro för panik, 0–10)

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, MySQL (TiDB Cloud i produktion), Vercel.

## Kom igång

```bash
npm install
cp .env.example .env.local   # DB_DRIVER=mock räcker för att starta
npm run dev                  # http://localhost:3000
```

| Skript | Gör |
|---|---|
| `npm run dev` | Startar utvecklingsservern |
| `npm run lint` | ESLint |
| `npm run typecheck` | Genererar Next-typer och kör `tsc` |
| `npm test` | Kör alla tester utan databas (`npm run test:watch` för watch-läge) |
| `npm run test:db` | Kör kontraktstesterna mot din MySQL (se `docs/databas-krav.md`) |
| `npm run build` | Produktionsbygge |

## Arbetsflöde

Arbetet görs i små steg, med en PR per steg mot `main`. CI kör lint, typecheck, test och build på varje PR.

| Steg | Innehåll | Status |
|---|---|---|
| 1 | Grund: projekt, layout, säkerhetsheaders, CI | klar |
| 2 | Databaskontraktet: kravspec, gränssnitt, mock, kontraktstester | pågår |
| 3 | Inloggning och sessioner | |
| 4 | Mitt mående (2.2) | |
| 5 | Min panikdagbok (2.1) | |
| 6 | Översikt och statistik | |
| 7 | Läsvy för psykologen | |
| 8 | Mobil, PWA och tillgänglighet | |
| 9 | Deploy till Vercel och TiDB Cloud | |

## Databasen

Schemat och alla SQL-frågor skrivs för hand i `db/schema.sql` och `src/db/mysql.ts`, efter kravspecen
i [`docs/databas-krav.md`](docs/databas-krav.md). Resten av appen pratar bara med gränssnittet `Database`
i `src/db/types.ts` och hämtar det med `getDb()` från `src/db/index.ts`. Tills SQL:en är klar kör appen
på en databas i minnet (`DB_DRIVER=mock`).

## Säkerhet i korthet

- Strikt Content-Security-Policy med nonce per request (`src/proxy.ts`, `src/lib/security/csp.ts`)
- Säkerhetsheaders och `noindex` (`next.config.ts`, `src/app/robots.ts`)
- Parametriserade SQL-frågor, och varje dataanrop filtreras på inloggad användare
- Från steg 3: Argon2id-lösenord, sessioner i databasen, inloggningsspärr, ingen öppen registrering
