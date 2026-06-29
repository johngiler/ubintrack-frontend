export default function WmsModulePlaceholder({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8">
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">{title}</h1>
      <p className="mt-2 max-w-2xl text-[var(--foreground-muted)]">{description}</p>
      <p className="mt-4 text-sm text-[var(--foreground-muted)]">
        Este módulo se migrará desde <code>frontend-rbcold</code> en la siguiente fase.
      </p>
    </div>
  );
}
