import { useEffect, useState } from "react";
import PasswordInput from "./PasswordInput";
import ZoomableImage from "./ZoomableImage";
import { profileImageUrl } from "../utils/media";

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   initial?: object | null;
 *   teamName?: string;
 *   onSubmit: (formData: FormData) => Promise<void>;
 *   title?: string;
 *   selfMode?: boolean;
 * }} props
 */
export default function TeamMentorModal({
  open,
  onClose,
  initial,
  teamName,
  onSubmit,
  title,
  selfMode = false,
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(initial?.fullName || "");
    setEmail(initial?.email || "");
    setPhone(initial?.phone || "");
    setPassword("");
    setPhotoFile(null);
    setPhotoPreview(profileImageUrl(initial) || "");
    setError("");
  }, [open, initial]);

  useEffect(() => {
    if (!photoFile) return undefined;
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  if (!open) return null;

  const hasMentor = Boolean(initial?._id || initial?.email);
  const modalTitle = title || (hasMentor ? "Manage mentor" : "Add mentor");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("fullName", fullName.trim());
      fd.append("email", email.trim());
      fd.append("phone", phone.trim());
      if (password.trim()) fd.append("password", password.trim());
      if (photoFile) fd.append("photo", photoFile);
      await onSubmit(fd);
      onClose();
    } catch (err) {
      setError(err.message || "Unable to save mentor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="panel w-full max-w-md rounded-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-accent">{modalTitle}</p>
            {teamName ? (
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">{teamName}</p>
            ) : null}
          </div>
          <button type="button" className="btn-ghost !py-1 !text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        {selfMode ? (
          <p className="mt-3 rounded-lg border border-[color:var(--border)] bg-ink-soft/50 px-3 py-2 text-xs text-[color:var(--text-muted)]">
            Update your name, mobile, email, or password. Use <strong className="text-[color:var(--title)]">Manage team</strong>{" "}
            to edit the playing squad like the captain.
          </p>
        ) : hasMentor ? (
          <p className="mt-3 rounded-lg border border-[color:var(--border)] bg-ink-soft/50 px-3 py-2 text-xs text-[color:var(--text-muted)]">
            One mentor per team. Update their details below, then share the <strong className="text-[color:var(--title)]">email</strong>{" "}
            and <strong className="text-[color:var(--title)]">password</strong> with your mentor so they can sign in (no
            player registration needed).
          </p>
        ) : (
          <p className="mt-3 rounded-lg border border-[color:var(--border)] bg-ink-soft/50 px-3 py-2 text-xs text-[color:var(--text-muted)]">
            Add one mentor for your franchise. After saving, share their login email and password with them.
          </p>
        )}

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3">
            {photoPreview ? (
              <ZoomableImage
                src={photoPreview}
                alt="Mentor"
                className="h-16 w-16 rounded-full border border-[color:var(--border)] object-cover"
              />
            ) : (
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-sm text-accent">
                Photo
              </span>
            )}
            <label className="min-w-0 flex-1 text-sm">
              <span className="font-medium text-[color:var(--title)]">Profile photo</span>
              <input
                type="file"
                accept="image/*"
                className="input-dark mt-1.5 w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:brightness-110"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-[color:var(--title)]">Full name</span>
            <input
              className="input-dark mt-1.5 w-full"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[color:var(--title)]">Email</span>
            <input
              type="email"
              className="input-dark mt-1.5 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[color:var(--title)]">Mobile</span>
            <input
              type="tel"
              className="input-dark mt-1.5 w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-[color:var(--title)]">
              Password{hasMentor ? " (leave blank to keep)" : ""}
            </span>
            <PasswordInput
              className="input-dark mt-1.5 w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!hasMentor}
              minLength={6}
              autoComplete="new-password"
            />
            {!hasMentor ? (
              <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
                Minimum 6 characters (required for mentor sign-in).
              </span>
            ) : (
              <span className="mt-1 block text-xs text-[color:var(--text-muted)]">
                Leave blank to keep the current password, or enter at least 6 characters to reset.
              </span>
            )}
          </label>
          {error ? <p className="text-sm text-accent">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving
              ? "Saving…"
              : selfMode
                ? "Save my details"
                : hasMentor
                  ? "Save mentor details"
                  : "Add mentor"}
          </button>
        </form>
      </div>
    </div>
  );
}
