const items = [
  "LIVE PLAYER AUCTION",
  "8 FRANCHISES",
  "31 MATCHES",
  "₹15 LAKH PRIZE POOL",
  "US STAFFING INDUSTRY",
  "WESLEY ELITE SPORTS",
  "SEASON 2026",
];

export function Marquee() {
  const row = [...items, ...items];
  return (
    <div className="overflow-hidden border-y-2 border-ink bg-accent">
      <div className="marquee-track py-3">
        {row.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="font-display mx-6 inline-flex items-center gap-6 text-xl tracking-wide text-white md:text-2xl"
          >
            {item}
            <span className="inline-block h-2 w-2 rounded-full bg-white/70" />
          </span>
        ))}
      </div>
    </div>
  );
}
