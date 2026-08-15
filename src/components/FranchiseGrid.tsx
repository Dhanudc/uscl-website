import Image from "next/image";
import Link from "next/link";
import { franchises } from "@/data/franchises";

export function FranchiseGrid({
  limit,
  showCta = true,
}: {
  limit?: number;
  showCta?: boolean;
}) {
  const list = typeof limit === "number" ? franchises.slice(0, limit) : franchises;

  return (
    <section className="border-y border-white/10 bg-ink-soft px-4 py-16 md:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">
              Season 2026 Franchises
            </p>
            <h2 className="font-display mt-2 text-4xl text-white md:text-5xl">
              Meet the 8 teams
            </h2>
          </div>
          {showCta && (
            <Link href="/franchises" className="btn-ghost !border-white/25 !text-white">
              View all franchises
            </Link>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((team) => (
            <article
              key={team.id}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-ink transition hover:border-accent/60"
            >
              <div className="relative aspect-square bg-white p-3">
                <Image
                  src={team.image}
                  alt={`${team.name} logo`}
                  fill
                  className="object-contain p-2 transition duration-300 group-hover:scale-[1.03]"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
              <div
                className="border-t border-white/10 px-4 py-3"
                style={{ boxShadow: `inset 3px 0 0 ${team.accent}` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
                  {team.city}
                </p>
                <h3 className="font-display mt-1 text-2xl text-white">{team.shortName}</h3>
                <p className="text-xs text-white/50">{team.name}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
