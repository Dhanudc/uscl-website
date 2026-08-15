import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { StatStrip } from "@/components/StatStrip";

export const metadata: Metadata = { title: "About USCL" };

const values = [
  { title: "Excellence", body: "Professional sporting experiences with uncompromising quality." },
  { title: "Integrity", body: "Fairness, transparency, and respect throughout the tournament." },
  { title: "Innovation", body: "First-of-its-kind franchise model for the staffing industry." },
  { title: "Collaboration", body: "Strengthening business relationships through sport." },
  { title: "Leadership", body: "Opportunities to lead, compete, and inspire." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About Us"
        title="The league that unites staffing."
        subtitle="India’s premier franchise cricket property for US Staffing — owned and managed by Wesley Elite Sports."
      />

      <section className="bg-ink px-4 py-12 md:px-6">
        <div className="mx-auto max-w-2xl text-[15px] leading-relaxed text-white/60">
          <p>
            USCL is India’s first franchise-based corporate cricket league for US Staffing,
            Recruitment, Talent Acquisition, HR Technology, and Workforce Solutions.
          </p>
          <p className="mt-4">
            Live auction. Pro franchises. Premium streaming. High-impact digital — every detail
            mirrors the industry’s standard of excellence.
          </p>
        </div>
      </section>

      <StatStrip
        stats={[
          { value: "08", label: "Franchises" },
          { value: "31", label: "Matches" },
          { value: "16", label: "Days" },
          { value: "15L", label: "Prize Pool ₹" },
        ]}
      />

      <section className="border-y border-white/10 bg-ink-soft px-4 py-12 md:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {[
            {
              t: "Purpose",
              b: "Unite the industry through sport that builds relationships beyond the field.",
            },
            {
              t: "Vision",
              b: "Become India’s most prestigious corporate franchise cricket property for staffing.",
            },
            {
              t: "Mission",
              b: "World-class cricket, elite networking, employer branding, and an annual flagship.",
            },
          ].map((item) => (
            <div key={item.t} className="panel rounded-2xl p-5">
              <h2 className="font-display text-xl text-white">{item.t}</h2>
              <p className="mt-2 text-sm text-white/55">{item.b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-ink px-4 py-12 md:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl text-white">Core values</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {values.map((value) => (
              <div key={value.title} className="panel rounded-2xl p-4">
                <h3 className="font-display text-lg text-accent">{value.title}</h3>
                <p className="mt-2 text-xs text-white/55">{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
