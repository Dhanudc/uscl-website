import { useEffect, useRef, useState } from "react";
import { api } from "../../api";
import { AlertBanner, PageLoader } from "../ui";

const EMPTY_WINNER = {
  place: "",
  playerCode: "",
  name: "",
  company: "",
  gift: "",
  image: "",
  section: "referral",
};

function blankChallenge() {
  return {
    title: "Winners Announcement",
    subtitle: "Of Referral Challenge",
    thankYou: "To everyone who participated in the referral challenge!",
    supportLine: "Your support and enthusiasm made this a huge success.",
    closingLine: "Stay tuned for more exciting opportunities!",
    winners: [{ place: 1, name: "", company: "", gift: "" }],
  };
}

export default function ReferralChallengeAdmin({ AdminShell }) {
  const [challenge, setChallenge] = useState(blankChallenge);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [lookingUp, setLookingUp] = useState({});
  const lookupTimers = useRef({});

  useEffect(() => {
    setLoading(true);
    api("/api/admin/settings")
      .then((data) => {
        const incoming = data.settings?.referralChallenge;
        if (incoming) {
          setChallenge({
            title: incoming.title || "",
            subtitle: incoming.subtitle || "",
            thankYou: incoming.thankYou || "",
            supportLine: incoming.supportLine || "",
            closingLine: incoming.closingLine || "",
            winners: (incoming.winners || []).map((row) => ({
              place: row.place ?? "",
              section: row.section === "giveaway" ? "giveaway" : "referral",
              playerCode: row.playerCode || "",
              name: row.name || "",
              company: row.company || "",
              gift: row.gift || "",
              image: row.image || "",
            })),
          });
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateWinner(index, field, value) {
    setChallenge((prev) => ({
      ...prev,
      winners: prev.winners.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  }

  function addWinner(section) {
    setChallenge((prev) => {
      const count = prev.winners.filter((row) => (row.section || "referral") === section).length;
      return {
        ...prev,
        winners: [...prev.winners, { ...EMPTY_WINNER, section, place: count + 1 }],
      };
    });
  }

  function removeWinner(index) {
    setChallenge((prev) => ({
      ...prev,
      winners: prev.winners.filter((_, i) => i !== index),
    }));
  }

  async function lookupPlayer(index, rawCode) {
    const code = String(rawCode || "").trim();
    if (!code) return;
    setLookingUp((prev) => ({ ...prev, [index]: true }));
    setError("");
    try {
      const data = await api(`/api/admin/player-lookup?playerCode=${encodeURIComponent(code)}`);
      const player = data.player;
      setChallenge((prev) => ({
        ...prev,
        winners: prev.winners.map((row, i) =>
          i === index
            ? {
                ...row,
                playerCode: player.playerCode,
                name: player.name,
                company: player.company,
                image: player.image,
                lookupError: "",
              }
            : row
        ),
      }));
    } catch (err) {
      setChallenge((prev) => ({
        ...prev,
        winners: prev.winners.map((row, i) =>
          i === index ? { ...row, name: "", company: "", image: "", lookupError: err.message } : row
        ),
      }));
    } finally {
      setLookingUp((prev) => ({ ...prev, [index]: false }));
    }
  }

  function onPlayerCodeChange(index, value) {
    setChallenge((prev) => ({
      ...prev,
      winners: prev.winners.map((row, i) =>
        i === index
          ? { ...row, playerCode: value, name: "", company: "", image: "", lookupError: "" }
          : row
      ),
    }));
    clearTimeout(lookupTimers.current[index]);
    const code = value.trim();
    if (!code) return;
    lookupTimers.current[index] = setTimeout(() => lookupPlayer(index, code), 400);
  }

  async function onSave(e) {
    e.preventDefault();
    setError("");
    setOk("");
    setSaving(true);
    try {
      const winners = challenge.winners.map((row) => ({
        place: Math.round(Number(row.place)),
        section: row.section === "giveaway" ? "giveaway" : "referral",
        playerCode: String(row.playerCode || "").trim(),
        name: String(row.name || "").trim(),
        company: String(row.company || "").trim(),
        gift: String(row.gift || "").trim(),
      }));
      if (winners.some((row) => !Number.isFinite(row.place) || row.place <= 0)) {
        throw new Error("Each winner needs a place number (1, 2, 3…).");
      }
      if (winners.some((row) => !row.gift || (!row.playerCode && !row.name))) {
        throw new Error("Each winner needs a gift and a Player ID.");
      }
      const data = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          referralChallenge: {
            title: challenge.title,
            subtitle: challenge.subtitle,
            thankYou: challenge.thankYou,
            supportLine: challenge.supportLine,
            closingLine: challenge.closingLine,
            winners,
          },
        }),
      });
      const saved = data.settings?.referralChallenge;
      if (saved) {
        setChallenge({
          title: saved.title || "",
          subtitle: saved.subtitle || "",
          thankYou: saved.thankYou || "",
          supportLine: saved.supportLine || "",
          closingLine: saved.closingLine || "",
          winners: (saved.winners || []).map((row) => ({
            place: row.place,
            section: row.section === "giveaway" ? "giveaway" : "referral",
            playerCode: row.playerCode || "",
            name: row.name,
            company: row.company || "",
            gift: row.gift,
            image: row.image || "",
          })),
        });
      }
      setOk("Referral winners saved. They show on the Referrals page when that module is on.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Rewards"
      subtitle="Edit Referrals and Giveaways separately. Turn the page on or off under Settings → Modules."
    >
      {loading ? (
        <PageLoader message="Loading winners…" />
      ) : (
        <form onSubmit={onSave} className="max-w-3xl space-y-5">
          <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
            <div className="border-b border-[color:var(--border)] px-5 py-4">
              <p className="eyebrow text-accent">Announcement</p>
              <h2 className="font-display mt-1 text-xl text-[color:var(--title)]">Page copy</h2>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {[
                ["title", "Heading", "Winners Announcement"],
                ["subtitle", "Ribbon", "Of Referral Challenge"],
                ["thankYou", "Thank-you line", "To everyone who participated…"],
                ["supportLine", "Support line", "Your support and enthusiasm…"],
                ["closingLine", "Closing line", "Stay tuned…"],
              ].map(([key, label, placeholder]) => (
                <label key={key} className={`block text-sm ${key === "title" || key === "subtitle" ? "" : "sm:col-span-2"}`}>
                  <span className="font-medium text-[color:var(--title)]">{label}</span>
                  <input
                    className="input-dark mt-1.5"
                    value={challenge[key]}
                    placeholder={placeholder}
                    onChange={(e) => setChallenge((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
          </section>

          {["referral", "giveaway"].map((section) => {
            const rows = challenge.winners
              .map((row, index) => ({ row, index }))
              .filter((item) => (item.row.section || "referral") === section);
            return (
          <section key={section} className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4">
              <div>
                <p className="eyebrow text-accent">{section === "giveaway" ? "Section 02" : "Section 01"}</p>
                <h2 className="font-display mt-1 text-xl text-[color:var(--title)]">
                  {section === "giveaway" ? "Giveaways" : "Referrals"}
                </h2>
              </div>
              <button type="button" className="btn-ghost !py-2 !text-xs" onClick={() => addWinner(section)}>
                Add winner
              </button>
            </div>
            <div className="space-y-4 p-5">
              {rows.length === 0 ? (
                <p className="text-sm text-[color:var(--text-muted)]">No winners in this section yet.</p>
              ) : null}
              {rows.map(({ row, index }) => (
                <div key={index} className="grid gap-3 rounded-lg border border-[color:var(--border)] p-4 sm:grid-cols-12">
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-[color:var(--text-muted)]">Place</span>
                    <input
                      type="number"
                      min="1"
                      required
                      className="input-dark mt-1.5"
                      value={row.place}
                      onChange={(e) => updateWinner(index, "place", e.target.value)}
                    />
                  </label>
                  <label className="block text-sm sm:col-span-5">
                    <span className="text-[color:var(--text-muted)]">Player ID</span>
                    <input
                      className="input-dark mt-1.5"
                      value={row.playerCode}
                      placeholder="Type Player ID"
                      inputMode="numeric"
                      onChange={(e) => onPlayerCodeChange(index, e.target.value)}
                      onBlur={(e) => lookupPlayer(index, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          lookupPlayer(index, e.currentTarget.value);
                        }
                      }}
                    />
                  </label>
                  <label className="block text-sm sm:col-span-6">
                    <span className="text-[color:var(--text-muted)]">Gift</span>
                    <input
                      required
                      className="input-dark mt-1.5"
                      value={row.gift}
                      onChange={(e) => updateWinner(index, "gift", e.target.value)}
                    />
                  </label>
                  <div className="flex items-center justify-between gap-3 sm:col-span-12">
                    {row.name ? (
                      <div className="flex min-w-0 items-center gap-3">
                        {row.image ? (
                          <img
                            src={row.image}
                            alt=""
                            className="h-12 w-12 rounded-full border border-[color:var(--border)] object-cover"
                          />
                        ) : (
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-[color:var(--border)] text-[10px] text-[color:var(--text-muted)]">
                            No photo
                          </span>
                        )}
                        <p className="min-w-0 text-sm text-[color:var(--title)]">
                          <span className="font-semibold">{row.name}</span>
                          {row.company ? (
                            <span className="mt-0.5 block text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                              {row.company}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    ) : lookingUp[index] ? (
                      <p className="text-xs text-[color:var(--text-muted)]">Fetching player…</p>
                    ) : (
                      <p className="text-xs text-accent">
                        {row.lookupError || "Enter a Player ID to load the photo, name, and company."}
                      </p>
                    )}
                    <button type="button" className="text-xs font-semibold text-accent" onClick={() => removeWinner(index)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
            );
          })}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save rewards"}
            </button>
            {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
            {ok ? <AlertBanner tone="ok">{ok}</AlertBanner> : null}
          </div>
        </form>
      )}
    </AdminShell>
  );
}
