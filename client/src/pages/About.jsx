import { useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { aboutSections, boardMembers, siteStats } from "../data/siteContent";

export default function About() {
  const [openMember, setOpenMember] = useState(null);

  return (
    <PageShell
      eyebrow="About USCL"
      title="US Staffing Champions League"
      subtitle="India's biggest staffing franchise cricket league — 8 franchises, live auction, and a national T20 stage."
    >
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {siteStats.map((s) => (
          <div key={s.label} className="rounded-lg border border-[color:var(--border)] bg-ink-card px-3 py-4 text-center">
            <p className="font-display text-2xl text-accent">{s.value}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--text-muted)]">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-6">
        {aboutSections.map((block) =>
          block.id === "vision" ? (
            <article
              key={block.id}
              className="grid items-center gap-6 border-b border-[color:var(--border)] pb-10 md:grid-cols-2 md:gap-10"
            >
              <img
                src={block.image}
                alt=""
                className="h-56 w-full rounded-xl object-cover sm:h-72 md:h-[22rem]"
              />
              <div>
                <h2 className="font-display text-3xl text-[color:var(--title)] md:text-4xl">
                  {block.title}
                </h2>
                <div className="mt-4 space-y-4 text-[color:var(--text-muted)]">
                  {block.paragraphs.map((p) => (
                    <p key={p.slice(0, 32)}>{p}</p>
                  ))}
                </div>
              </div>
            </article>
          ) : (
          <article key={block.id} className="border-b border-[color:var(--border)] pb-6 last:border-0">
            <h2 className="font-display text-2xl text-[color:var(--title)]">{block.title}</h2>
            <p className="mt-2 max-w-3xl text-[color:var(--text-muted)]">{block.body}</p>

            {block.id === "members" ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {boardMembers.map((member) => (
                  <article
                    key={member.id}
                    className="rounded-xl border border-[color:var(--border)] bg-ink-card p-5"
                  >
                    <img
                      src={member.image}
                      alt={member.name}
                      className="mx-auto h-24 w-24 rounded-full border border-[color:var(--border)] object-cover sm:mx-0"
                    />
                    <h3 className="mt-4 font-display text-lg text-[color:var(--title)]">{member.name}</h3>
                    <p className="mt-0.5 text-sm italic text-[color:var(--text-muted)]">{member.role}</p>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-[color:var(--text-muted)]">
                      {member.summary}
                    </p>
                    <button
                      type="button"
                      className="mt-3 text-sm font-semibold text-accent-soft"
                      onClick={() => setOpenMember(member)}
                    >
                      Read more →
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </article>
          )
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link to="/register" className="btn-primary">
          Register as Player
        </Link>
        <Link to="/franchise" className="btn-ghost">
          Own a Franchise
        </Link>
      </div>

      {openMember ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setOpenMember(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-modal-title"
            className="panel max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <img
                src={openMember.image}
                alt={openMember.name}
                className="h-20 w-20 shrink-0 rounded-full border border-[color:var(--border)] object-cover"
              />
              <div className="min-w-0">
                <h3 id="member-modal-title" className="font-display text-2xl text-[color:var(--title)]">
                  {openMember.name}
                </h3>
                <p className="mt-1 text-sm italic text-[color:var(--text-muted)]">{openMember.role}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--text)]">{openMember.bio}</p>
            <button
              type="button"
              className="btn-ghost mt-5"
              onClick={() => setOpenMember(null)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
