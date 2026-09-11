/**
 * Översikt (/): startsidan.
 *
 * Just nu två stora genvägar: logga dagens mående och logga en panikattack.
 * Dagens status och en minigraf läggs till i steg 6.
 */
import Link from "next/link";

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-semibold">Översikt</h1>
        <p className="mt-1 text-muted">Hur har dagen varit?</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/maende"
          className="rounded-2xl bg-accent p-5 text-on-accent transition-opacity hover:opacity-90"
        >
          <span className="block text-lg font-semibold">Logga dagens mående</span>
          <span className="mt-1 block text-sm opacity-90">
            Ångest, depression och oro för panik, 0–10
          </span>
        </Link>
        <Link
          href="/panik"
          className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:bg-surface-hover"
        >
          <span className="block text-lg font-semibold">Logga panikattack</span>
          <span className="mt-1 block text-sm text-muted">
            Triggers, symtom, tankar och beteenden
          </span>
        </Link>
      </div>
    </div>
  );
}
