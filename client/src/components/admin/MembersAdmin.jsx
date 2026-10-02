import { useEffect, useState } from "react";
import { api } from "../../api";
import { CropUploadButton } from "../ImageCropper";
import ZoomableImage from "../ZoomableImage";
import { AlertBanner, PageLoader } from "../ui";

function blankMember() {
  return {
    id: `member-${Date.now()}`,
    name: "",
    role: "",
    image: "",
    summary: "",
    bio: "",
    isNew: true,
  };
}

export default function MembersAdmin({ AdminShell }) {
  const [intro, setIntro] = useState({ title: "Members", body: "" });
  const [members, setMembers] = useState([]);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    setLoading(true);
    api("/api/admin/settings")
      .then((data) => {
        setIntro({
          title: data.settings?.membersIntro?.title || "Members",
          body: data.settings?.membersIntro?.body || "",
        });
        setMembers(Array.isArray(data.settings?.boardMembers) ? data.settings.boardMembers : []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function persist(nextMembers, nextIntro = intro, message = "Members saved.") {
    setSaving(true);
    setError("");
    setOk("");
    try {
      const data = await api("/api/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          membersIntro: nextIntro,
          boardMembers: nextMembers.map(({ isNew, ...row }) => row),
        }),
      });
      setIntro(data.settings?.membersIntro || nextIntro);
      setMembers(data.settings?.boardMembers || []);
      setOk(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function moveMember(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= members.length) return;
    const next = [...members];
    const [row] = next.splice(index, 1);
    next.splice(target, 0, row);
    persist(next, intro, "Order updated.");
  }

  function removeMember(id) {
    persist(
      members.filter((row) => row.id !== id),
      intro,
      "Member removed."
    );
  }

  async function uploadImage(file) {
    if (!file || !draft) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", file);
      const data = await api("/api/admin/settings/member-image", { method: "POST", body });
      setDraft((prev) => (prev ? { ...prev, image: data.imageUrl || "" } : prev));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function saveDraft(e) {
    e.preventDefault();
    if (!draft?.name?.trim()) return;
    const row = { ...draft, name: draft.name.trim() };
    delete row.isNew;
    const next = draft.isNew
      ? [...members, row]
      : members.map((member) => (member.id === row.id ? row : member));
    setDraft(null);
    persist(next, intro, "Member saved.");
  }

  return (
    <AdminShell
      title="About members"
      subtitle="The list matches the About page. Use Actions to move, edit, or remove a person. Click a photo to enlarge it."
    >
      {loading ? (
        <PageLoader message="Loading members…" />
      ) : (
        <div className="max-w-5xl space-y-5">
          {error ? <AlertBanner tone="error">{error}</AlertBanner> : null}
          {ok ? <AlertBanner tone="ok">{ok}</AlertBanner> : null}

          <section className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
            <div className="border-b border-[color:var(--border)] px-5 py-4">
              <h2 className="font-display text-xl text-[color:var(--title)]">Section heading</h2>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Title</span>
                <input
                  className="input-dark mt-1.5"
                  value={intro.title}
                  onChange={(e) => setIntro((prev) => ({ ...prev, title: e.target.value }))}
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-[color:var(--title)]">Intro</span>
                <textarea
                  className="input-dark mt-1.5 min-h-20"
                  value={intro.body}
                  onChange={(e) => setIntro((prev) => ({ ...prev, body: e.target.value }))}
                />
              </label>
              <div>
                <button type="button" className="btn-primary" disabled={saving} onClick={() => persist(members)}>
                  {saving ? "Saving…" : "Save heading"}
                </button>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={() => setDraft(blankMember())}>
              Add member
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[color:var(--border)]">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-ink-soft text-xs uppercase tracking-wide text-[color:var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Photo</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-[color:var(--text-muted)]">
                      No members yet.
                    </td>
                  </tr>
                ) : (
                  members.map((member, index) => (
                    <tr key={member.id} className="border-t border-[color:var(--border)]">
                      <td className="px-4 py-3">
                        {member.image ? (
                          <ZoomableImage
                            src={member.image}
                            alt={member.name}
                            buttonClassName="h-12 w-12 overflow-hidden rounded-full"
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-[color:var(--border)] text-[10px] text-[color:var(--text-muted)]">
                            Photo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[color:var(--title)]">{member.name}</td>
                      <td className="px-4 py-3 text-[color:var(--text-muted)]">{member.role || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                            disabled={saving || index === 0}
                            onClick={() => moveMember(index, -1)}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                            disabled={saving || index === members.length - 1}
                            onClick={() => moveMember(index, 1)}
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                            onClick={() => setDraft({ ...member, isNew: false })}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn-ghost !px-2.5 !py-1.5 !text-xs"
                            disabled={saving}
                            onClick={() => removeMember(member.id)}
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
            aria-labelledby="member-edit-title"
            className="panel max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
            onSubmit={saveDraft}
          >
            <h2 id="member-edit-title" className="font-display text-2xl text-[color:var(--title)]">
              {draft.isNew ? "Add member" : "Edit member"}
            </h2>
            <div className="mt-4 grid gap-4">
              <div className="flex items-center gap-4">
                {draft.image ? (
                  <ZoomableImage
                    src={draft.image}
                    alt=""
                    buttonClassName="h-20 w-20 overflow-hidden rounded-full"
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <span className="inline-flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-[color:var(--border)] text-xs text-[color:var(--text-muted)]">
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
                <span className="font-medium text-[color:var(--title)]">Name</span>
                <input
                  required
                  className="input-dark mt-1.5"
                  value={draft.name}
                  onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Role</span>
                <input
                  className="input-dark mt-1.5"
                  value={draft.role}
                  placeholder="Brand Ambassador"
                  onChange={(e) => setDraft((prev) => ({ ...prev, role: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Short text</span>
                <textarea
                  className="input-dark mt-1.5 min-h-20"
                  value={draft.summary}
                  onChange={(e) => setDraft((prev) => ({ ...prev, summary: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[color:var(--title)]">Full bio</span>
                <textarea
                  className="input-dark mt-1.5 min-h-28"
                  value={draft.bio}
                  onChange={(e) => setDraft((prev) => ({ ...prev, bio: e.target.value }))}
                />
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
