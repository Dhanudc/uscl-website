import Link from "next/link";
import { ArenaArt } from "@/components/ArenaArt";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  cta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
};

export function PageHero({
  eyebrow,
  title,
  subtitle,
  cta,
  secondaryCta,
}: PageHeroProps) {
  return (
    <section className="arena relative border-b border-white/10">
      <ArenaArt compact />
      <div className="relative mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        {eyebrow && (
          <p className="anim-up inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-accent-soft">
            <span className="live-dot h-2 w-2 rounded-full bg-accent" />
            {eyebrow}
          </p>
        )}
        <h1 className="anim-up-d1 font-display mt-5 max-w-3xl text-5xl leading-[0.95] text-white md:text-6xl lg:text-7xl">
          {title}
        </h1>
        {subtitle && (
          <p className="anim-up-d2 mt-5 max-w-xl text-base text-white/65 md:text-lg">{subtitle}</p>
        )}
        {(cta || secondaryCta) && (
          <div className="anim-up-d3 mt-8 flex flex-wrap gap-3">
            {cta && (
              <Link href={cta.href} className="btn-primary">
                {cta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link href={secondaryCta.href} className="btn-ghost">
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
