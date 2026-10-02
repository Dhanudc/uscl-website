import { useEffect, useState } from "react";
import { api } from "../../api";
import { CropUploadButton } from "../ImageCropper";
import ZoomableImage from "../ZoomableImage";
import { formatEventWhen } from "../UpcomingEvents";
import KeyDatesEditor from "./KeyDatesEditor";
import { AlertBanner, PageLoader } from "../ui";

function inputDate(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function blankEvent() {
  return {
    id: `evt-${Date.now()}`,
    title: "",
    caption: "",
    imageUrl: "",
    eventDate: "",
    location: "",
    link: "",
    published: true,
    isNew: true,
  };
}

export default function EventsAdmin({ AdminShell }) {
  const [events, setEvents] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    setLoading(true);
    api("/api/admin/settings")
      .then((data) => setEvents(Array.isArray(data.settings?.upcomingEvents) ? data.settings.upcomingEvents : []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function persist(nextEvents, message) {
    setSaving(true);
    setError("");
    setOk("");
    try {
      const data = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          upcomingEvents: nextEvents.map(({ isNew, ...row }) => ({
            ...row,
            eventDate: inputDate(row.eventDate) || row.eventDate,
            published: row.published !== false,
          })),
        }),
      });
      setEvents(data.settings?.upcomingEvents || []);
      setOk(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function moveEvent(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= events.length) return;
    const next = [...events];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    persist(next, "Order updated.");
  }

  function removeEvent(id) {
    persist(
      events.filter((row) => row.id !== id),
      "Event removed."
    );
  }

  async function uploadImage(file) {
    if (!file || !draft) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const data = await api("/api/admin/settings/event-image", { method: "POST", body });
      setDraft((prev) => (prev ? { ...prev, imageUrl: data.imageUrl || "" } : prev));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function saveDraft(e) {
    e.preventDefault();
    if (!draft?.title?.trim()) return;
    const row = {
      ...draft,
      title: draft.title.trim(),
      eventDate: inputDate(draft.eventDate) || draft.eventDate,
    };
    delete row.isNew;
    const next = draft.isNew ? [...events, row] : events.map((event) => (event.id === row.id ? row : event));
    setDraft(null);
    persist(next, "Event saved. It shows on the site once it has a photo.");
  }

  return (
    <AdminShell
      title="Photos"
      subtitle="Season dates stay above. Each photo post is a row. Edit opens the image and the details that show with it."
    >
      <style>{`.no-scrollbar{scrollbar-width:none;-ms-overflow-style:none}.no-scrollbar::-webkit-scrollbar{display:none;width:0;height:0}`}</style>
      <div className="mb-10 border-b border-[color:var(--border)] pb-10">
        <KeyDatesEditor />
      </div>
      {loading ? (
        <PageLoader message="Loading events…" />
      ) : (
        <div className="max-w-5xl space-y-5">
          {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
          {ok ? <AlertBanner tone="ok">{ok}</AlertBanner> : null}

          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-[color:var(--title)]">Event posts</h2>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Each row is one post. Add the photo with the title and caption.
              </p>
            </div>
            <button type="button" className="btn-primary shrink-0" onClick={() => setDraft(blankEvent())}>
              Add event
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[color:var(--border)]">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-ink-soft text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Photo</th>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Place</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-[color:var(--text-muted)]">
                      No events yet.
                    </td>
                  </tr>
                ) : (
                  events.map((event, index) => (
                    <tr key={event.id} className="border-t border-[color:var(--border)]">
                      <td className="px-4 py-3">
                        {event.imageUrl ? (
                          <ZoomableImage
                            src={event.imageUrl}
                            alt={event.title || ""}
                            buttonClassName="h-12 w-12 overflow-hidden rounded-lg"
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-[color:var(--border)] text-[10px] text-[color:var(--text-muted)]">
                            Photo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[color:var(--title)]">{event.title}</td>
                      <td className="px-4 py-3 text-[color:var(--text-muted)]">
                        {formatEventWhen(event.eventDate) || "—"}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-muted)]">{event.location || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                            disabled={saving || index === 0}
                            onClick={() => moveEvent(index, -1)}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                            disabled={saving || index === events.length - 1}
                            onClick={() => moveEvent(index, 1)}
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                            onClick={() => setDraft({ ...event, eventDate: inputDate(event.eventDate), isNew: false })}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                            disabled={saving}
                            onClick={() => removeEvent(event.id)}
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
        </div>
      )}

      {draft ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setDraft(null)}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-edit-title"
            className="panel no-scrollbar max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveDraft}
          >
            <h2 id="event-edit-title" className="font-display text-2xl text-[color:var(--title)]">
              {draft.isNew ? "Add event" : "Edit event"}
            </h2>
            <div className="mt-4 grid gap-4">
              <div className="flex items-center gap-4">
                {draft.imageUrl ? (
                  <ZoomableImage
                    src={draft.imageUrl}
                    alt=""
                    buttonClassName="h-20 w-20 overflow-hidden rounded-lg"
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                ) : (
                  <span className="inline-flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-[color:var(--border)] text-xs text-[color:var(--text-muted)]">
                    Photo
                  </span>
                )}
                <CropUploadButton
                  label={uploading ? "Uploading…" : "Upload photo"}
                  aspect={1}
                  disabled={uploading}
                  onFile={uploadImage}
                />
              </div>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Title</span>
                <input
                  required
                  className="input-dark mt-1.5"
                  value={draft.title}
                  placeholder="Auction day"
                  onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Caption</span>
                <textarea
                  className="input-dark mt-1.5 min-h-24"
                  value={draft.caption}
                  placeholder="Write the announcement…"
                  onChange={(e) => setDraft((prev) => ({ ...prev, caption: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Date and time</span>
                <input
                  type="datetime-local"
                  className="input-dark mt-1.5"
                  value={inputDate(draft.eventDate)}
                  onChange={(e) => setDraft((prev) => ({ ...prev, eventDate: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Place</span>
                <input
                  className="input-dark mt-1.5"
                  value={draft.location}
                  placeholder="Hyderabad"
                  onChange={(e) => setDraft((prev) => ({ ...prev, location: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Link</span>
                <input
                  className="input-dark mt-1.5"
                  value={draft.link}
                  placeholder="https:// or /register"
                  onChange={(e) => setDraft((prev) => ({ ...prev, link: e.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.published !== false}
                  onChange={(e) => setDraft((prev) => ({ ...prev, published: e.target.checked }))}
                />
                <span className="text-[color:var(--text)]">Show on the public site</span>
              </label>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" className="btn-primary" disabled={saving || uploading}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AdminShell>
  );
}
