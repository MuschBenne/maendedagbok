export function ComingSoon({ title, step }: { title: string; step: number }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-muted">Den här sidan byggs i steg {step}.</p>
    </section>
  );
}
