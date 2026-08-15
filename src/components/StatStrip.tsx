type Stat = { value: string; label: string };

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <section className="border-b border-white/10 bg-ink-soft">
      <div className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden px-5 py-7 md:px-7 ${
              i > 0 ? "border-l border-white/10" : ""
            }`}
          >
            <p className="jersey-num font-display absolute -right-1 -top-2 text-6xl md:text-7xl">
              {stat.value}
            </p>
            <p className="font-display relative text-4xl text-accent md:text-5xl">{stat.value}</p>
            <p className="relative mt-1 text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
