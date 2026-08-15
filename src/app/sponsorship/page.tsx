import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";

export const metadata: Metadata = { title: "Sponsorship" };

const tiers = [
  {
    name: "Title",
    price: "₹25L",
    highlights: ["Naming rights", "Largest logo", "50+ collab reels", "VIP hospitality"],
  },
  {
    name: "Co-Sponsor",
    price: "₹15L",
    highlights: ["Below title", "Cap awards", "Ground branding", "Press access"],
  },
  {
    name: "Powered By",
    price: "₹10L",
    highlights: ["MVP partner", "Stream branding", "Brand videos", "Booth space"],
  },
  {
    name: "Associate",
    price: "₹3L",
    highlights: ["30 brand limit", "Chief guest match", "Award rights", "Media assets"],
  },
];

export default function SponsorshipPage() {
  return (
    <>
      <PageHero
        eyebrow="Sponsorship"
        title="Partner where staffing watches."
        subtitle="Visibility across 31 matches, live stream, and a room full of decision makers."
        cta={{ href: "/signup", label: "Create Account" }}
      />

      <section className="bg-ink px-4 py-12 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-3 md:grid-cols-2">
          {tiers.map((tier) => (
            <article key={tier.name} className="panel rounded-2xl p-5">
              <div className="flex items-end justify-between gap-3">
                <h3 className="font-display text-2xl text-white">{tier.name}</h3>
                <p className="font-display text-xl text-accent">{tier.price}</p>
              </div>
              <ul className="mt-4 grid grid-cols-2 gap-2 text-[12px] text-white/55">
                {tier.highlights.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
