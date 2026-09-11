@AGENTS.md

# Måendedagbok – konventioner

## Filhuvud i varje fil

Varje fil börjar med en kort kommentar på svenska som på **abstrakt nivå** beskriver vad
som sker i filen. Granskaren ska kunna läsa huvudet, tänka "aha, det här ska hända här",
och sedan läsa koden med rätt förväntningar.

- 2–6 rader, vardaglig svenska. Första raden: filens namn eller roll, kolon, vad den gör.
- Beskriv *vad* som sker och *varför*, inte rad för rad. Numrerade steg passar när filen
  gör saker i en bestämd ordning.
- Uppdatera huvudet i samma ändring när filens ansvar ändras.
- Gäller alla filer som tillåter kommentarer: TS/TSX, CSS, SQL, YAML och config-filer.
  Undantag: JSON utan kommentarsstöd (`package.json`) och genererade filer (`package-lock.json`).

Exempel (`src/proxy.ts`):

```ts
/**
 * Proxy: körs på servern före varje sidladdning, innan sidan renderas.
 *
 * 1. Skapar en ny slumpad nonce för just den här requesten.
 * 2. Bygger CSP-headern som säger att bara skript med den noncen får köras.
 * 3. Skickar headern vidare till Next.js och tillbaka till webbläsaren.
 */
```

## Arbetsdelning

- Användaren skriver själv databasschemat (`db/schema.sql`) och alla SQL-frågor
  (`src/db/mysql.ts`). Skriv aldrig SQL där om du inte uttryckligen blir ombedd; resten av
  appen pratar bara med gränssnittet i `src/db/types.ts`.
- En liten PR per steg (se README). Vänta på merge innan nästa steg påbörjas.
- UI, kodkommentarer och PR-beskrivningar skrivs på svenska.
