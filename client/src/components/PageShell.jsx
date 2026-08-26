export default function PageShell({ title, subtitle, children, eyebrow }) {
  return (
    <>
      <section className="arena border-b border-[color:var(--border)] px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          {eyebrow ? <p className="eyebrow text-accent">{eyebrow}</p> : null}
          <h1 className="page-title mt-1">{title}</h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--text-muted)]">{subtitle}</p>
          ) : null}
        </div>
      </section>
      <section className="bg-ink px-4 py-6 sm:py-8 md:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </section>
    </>
  );
}
