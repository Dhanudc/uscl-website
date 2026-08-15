import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: "Wesley Elite Sports" };

const timeline = [
  { when: "2019", title: "Teletext Cricket League" },
  { when: "Mar 2024", title: "IT Staffing Cricket League" },
  { when: "Dec 2024", title: "IT Staffing Cricket League" },
  { when: "Feb 2025", title: "Ceipal Cricket League" },
  { when: "Feb 2026", title: "Corporate Cricket League" },
  { when: "2026", title: "USCL Flagship", highlight: true },
];

export default function WesleyPage() {
  return (
    <>
      <PageHero
        eyebrow="Wesley Elite Sports"
        title="Building corporate sports. Creating lasting connections."
        subtitle="Hyderabad-based sports management delivering professionally run corporate cricket."
        cta={{ href: "/franchise", label: "Explore Franchises" }}
      />

      <section className="bg-ink px-4 py-10 md:px-6">
        <div className="mx-auto flex max-w-6xl justify-center">
          <div className="relative h-24 w-72 overflow-hidden rounded-xl bg-white p-3 shadow-lg shadow-black/30">
            <Image
              src="/brand/wesley-elite-sports.png"
              alt="Wesley Elite Sports logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
      </section>

      <section className="bg-ink px-4 py-12 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Tournament Ops", "Live Streaming", "Networking", "Sports Marketing"].map((t) => (
            <div key={t} className="panel rounded-2xl px-4 py-5">
              <p className="font-display text-lg text-white">{t}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-ink-soft px-4 py-12 md:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl text-white">Journey</h2>
          <div className="mt-6 grid gap-2 md:grid-cols-3 lg:grid-cols-6">
            {timeline.map((item) => (
              <div
                key={`${item.when}-${item.title}`}
                className={`rounded-xl border px-3 py-4 ${
                  item.highlight
                    ? "border-accent bg-accent text-white"
                    : "border-white/10 bg-ink-card"
                }`}
              >
                <p
                  className={`text-[10px] uppercase tracking-[0.16em] ${
                    item.highlight ? "text-white/70" : "text-accent"
                  }`}
                >
                  {item.when}
                </p>
                <p className="mt-2 text-[13px] font-medium leading-snug text-white">{item.title}</p>
              </div>
            ))}
          </div>
          <Link href="/about" className="btn-primary mt-8 inline-flex">
            Discover USCL
          </Link>
        </div>
      </section>
    </>
  );
}
