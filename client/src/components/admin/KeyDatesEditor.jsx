import { useEffect, useState } from "react";
import { api } from "../../api";
import { formatEventWhen } from "../UpcomingEvents";
import { AlertBanner } from "../ui";

function inputDate(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function blankDate() {
  return {
    id: `date-${Date.now()}`,
    dateLabel: "",
    timeLabel: "",
    title: "",
    body: "",
    eventDate: "",
    isNew: true,
  };
}

export default function KeyDatesEditor() {
  const [dates, setDates] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    api("/api/admin/settings")
      .then((data) => setDates(Array.isArray(data.settings?.keyDates) ? data.settings.keyDates : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function persist(nextDates, message) {
    setSaving(true);
    setError("");
    setOk("");
    try {
      const data = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          keyDates: nextDates.map(({ isNew, ...row }) => ({
            ...row,
            eventDate: inputDate(row.eventDate) || row.eventDate,
          })),
        }),
      });
      setDates(data.settings?.keyDates || []);
      setOk(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function moveDate(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= dates.length) return;
    const next = [...dates];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    persist(next, "Order updated.");
  }

  function removeDate(id) {
    persist(
      dates.filter((row) => row.id !== id),
      "Season date removed."
    );
  }

  function saveDraft(event) {
    event.preventDefault();
    if (!draft?.title?.trim() || !inputDate(draft.eventDate)) return;
    const row = {
      ...draft,
      title: draft.title.trim(),
      eventDate: inputDate(draft.eventDate),
    };
    delete row.isNew;
    const next = draft.isNew ? [...dates, row] : dates.map((item) => (item.id === row.id ? row : item));
    setDraft(null);
    persist(next, "Season date saved. Finished dates stay on the site with a Completed label.");
  }

  if (loading) return <p className="text-sm text-[color:var(--text-muted)]">Loading season dates…</p>;

  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-accent">Above the feed</p>
          <h2 className="font-display mt-1 text-2xl text-[color:var(--title)]">Season dates</h2>
          <p className="mt-1 text-sm text-[color:var(--text-muted)]">
            Each row is one date. After the time passes, the card stays on the site with a Completed label.
          </p>
        </div>
        <button type="button" className="btn-primary shrink-0" onClick={() => setDraft(blankDate())}>
          Add date
        </button>
      </div>
      {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
      {ok ? <AlertBanner tone="ok">{ok}</AlertBanner> : null}
      <div className="overflow-x-auto rounded-xl border border-[color:var(--border)]">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-ink-soft text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Date line</th>
              <th className="px-4 py-3 font-semibold">Title</th>
              <th className="px-4 py-3 font-semibold">Ends</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dates.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-[color:var(--text-muted)]">
                  No season dates yet.
                </td>
              </tr>
            ) : (
              dates.map((row, index) => (
                <tr key={row.id} className="border-t border-[color:var(--border)]">
                  <td className="px-4 py-3 text-[color:var(--text-muted)]">{row.dateLabel || "—"}</td>
                  <td className="px-4 py-3 font-semibold text-[color:var(--title)]">{row.title}</td>
                  <td className="px-4 py-3 text-[color:var(--text-muted)]">{formatEventWhen(row.eventDate) || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                        disabled={saving || index === 0}
                        onClick={() => moveDate(index, -1)}
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                        disabled={saving || index === dates.length - 1}
                        onClick={() => moveDate(index, 1)}
                      >
                        Down
                      </button>
                      <button
                        type="button"
                        className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                        onClick={() => setDraft({ ...row, eventDate: inputDate(row.eventDate), isNew: false })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                        disabled={saving}
                        onClick={() => removeDate(row.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {draft ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setDraft(null)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="date-edit-title"
            className="panel no-scrollbar max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveDraft}
          >
            <h2 id="date-edit-title" className="font-display text-2xl text-[color:var(--title)]">
              {draft.isNew ? "Add date" : "Edit date"}
            </h2>
            <div className="mt-4 grid gap-4">
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Date line</span>
                <input
                  className="input-dark mt-1.5"
                  value={draft.dateLabel}
                  placeholder="17 October"
                  onChange={(e) => setDraft((prev) => ({ ...prev, dateLabel: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Ends</span>
                <input
                  required
                  type="datetime-local"
                  className="input-dark mt-1.5"
                  value={inputDate(draft.eventDate)}
                  onChange={(e) => setDraft((prev) => ({ ...prev, eventDate: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Small line</span>
                <input
                  className="input-dark mt-1.5"
                  value={draft.timeLabel}
                  placeholder="Player Auction"
                  onChange={(e) => setDraft((prev) => ({ ...prev, timeLabel: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Title</span>
                <input
                  required
                  className="input-dark mt-1.5"
                  value={draft.title}
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Details</span>
                <textarea
                  className="input-dark mt-1.5 min-h-20"
                  value={draft.body}
                  onChange={(e) => setDraft((prev) => ({ ...prev, body: e.target.value }))}
                />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
