import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { FranchiseGrid } from "@/components/FranchiseGrid";

export const metadata: Metadata = {
  title: "Franchises",
};

export default function FranchisesPage() {
  return (
    <>
      <PageHero
        eyebrow="8 Exclusive Franchises"
        title="Own the badge. Build the legacy."
        subtitle="Official USCL franchise identities — from Texas Thunder to Arizona Avengers."
        cta={{ href: "/franchise", label: "Own a Franchise" }}
        secondaryCta={{ href: "/register", label: "Register to Play" }}
      />

      <FranchiseGrid showCta={false} />

      <section className="bg-ink px-4 py-14 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 rounded-2xl border border-white/10 bg-ink-card p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-40 overflow-hidden rounded-lg bg-white p-2">
              <Image
                src="/brand/wesley-elite-sports.png"
                alt="Wesley Elite Sports"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Organized by
              </p>
              <p className="font-display mt-1 text-2xl text-white">Wesley Elite Sports</p>
            </div>
          </div>
          <Link href="/wesley" className="btn-primary">
            About Wesley Elite
          </Link>
        </div>
      </section>
    </>
  );
}
