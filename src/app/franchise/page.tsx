import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { franchises } from "@/data/franchises";

export const metadata: Metadata = { title: "Own a Franchise" };

const included = [
  "Ownership + naming rights",
  "Live auction participation",
  "Team kit & branding",
  "Photo / video / stream",
  "Website + social presence",
  "Press & awards night",
  "Onboard team sponsors",
  "Compete for ₹15L pool",
];

export default function FranchisePage() {
  return (
    <>
      <PageHero
        eyebrow="Franchise 2026"
        title="Eight seats. One legacy."
        subtitle="Own a professionally branded franchise in India’s first staffing cricket league."
        cta={{ href: "/signup", label: "Create Account" }}
        secondaryCta={{ href: "/franchises", label: "See Team Logos" }}
      />

      <section className="border-b border-white/10 bg-ink-soft px-4 py-10 md:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
            Available franchise identities
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
            {franchises.map((team) => (
              <div
                key={team.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-white"
                title={team.name}
              >
                <div className="relative aspect-square">
                  <Image
                    src={team.image}
                    alt={team.name}
                    fill
                    className="object-contain p-1.5"
                    sizes="120px"
                  />
                </div>
              </div>
            ))}
          </div>
          <Link href="/franchises" className="mt-5 inline-block text-sm text-accent hover:underline">
            Open full franchise gallery →
          </Link>
        </div>
      </section>

      <section className="bg-ink px-4 py-12 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="font-display text-3xl text-white">What’s included</h2>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {included.map((item) => (
                <div key={item} className="panel rounded-xl px-3.5 py-3 text-sm text-white/80">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border-2 border-accent bg-accent p-6 text-white">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/70">Investment</p>
            <p className="font-display mt-2 text-5xl tracking-tight">₹5,00,000</p>
            <p className="mt-1 text-sm text-white/80">Only 8 franchises</p>
            <div className="mt-6 border-t border-white/25 pt-5 text-sm">
              <p>Champion — ₹10,00,000</p>
              <p className="mt-1">Runner-up — ₹5,00,000</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
