import { useEffect, useId, useRef, useState } from "react";
import { api } from "../../api";
import { portalMediaImageUrl, portalMediaVideoUrl } from "../../utils/media";
import {
  PORTAL_MAX_IMAGES_PER_SECTION,
  PORTAL_MAX_VIDEOS_PER_SECTION,
} from "../../data/siteContent";

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CapacityPill({ count, max, type = "image" }) {
  const full = count >= max;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        full
          ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30"
          : "bg-accent/15 text-accent ring-1 ring-accent/25"
      }`}
    >
      {count} / {max} {type === "video" ? "video" : "images"}
    </span>
  );
}

function CapacityBar({ count, max }) {
  const pct = Math.min(100, Math.round((count / max) * 100));
  return (
    <div className="portal-media-capacity" aria-hidden="true">
      <div className="portal-media-capacity__track">
        <div
          className={`portal-media-capacity__fill ${pct >= 100 ? "is-full" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AlertBanner({ tone, children, onDismiss }) {
  if (!children) return null;
  const tones = {
    error: "portal-media-alert portal-media-alert--error",
    ok: "portal-media-alert portal-media-alert--ok",
  };
  return (
    <div className={tones[tone] || tones.error} role="status">
      <span>{children}</span>
      {onDismiss ? (
        <button type="button" className="portal-media-alert__dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      ) : null}
    </div>
  );
}

function FileDropzone({ accept, file, previewUrl, hint, disabled, onPick }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function pick(next) {
    if (disabled || !next) return;
    onPick(next);
  }

  return (
    <div
      className={`portal-media-dropzone ${dragOver ? "is-dragover" : ""} ${file ? "has-file" : ""} ${
        disabled ? "is-disabled" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        pick(e.dataTransfer.files?.[0] || null);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!disabled) inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => pick(e.target.files?.[0] || null)}
      />

      {previewUrl ? (
        <div className="portal-media-dropzone__preview">
          {accept.includes("video") ? (
            <video src={previewUrl} className="portal-media-dropzone__thumb" muted playsInline />
          ) : (
            <img src={previewUrl} alt="" className="portal-media-dropzone__thumb" />
          )}
        </div>
      ) : (
        <div className="portal-media-dropzone__icon" aria-hidden="true">
          {accept.includes("video") ? "▶" : "+"}
        </div>
      )}

      <div className="portal-media-dropzone__copy">
        {file ? (
          <>
            <p className="portal-media-dropzone__filename">{file.name}</p>
            <p className="portal-media-dropzone__meta">{formatFileSize(file.size)} · Tap to change</p>
          </>
        ) : (
          <>
            <p className="portal-media-dropzone__title">Drop file here or click to browse</p>
            <p className="portal-media-dropzone__meta">{hint}</p>
          </>
        )}
      </div>
    </div>
  );
}

function MediaItemCard({ type, item, sectionTitle, busy, onEdit, onDelete }) {
  const isVideo = type === "video";
  return (
    <article className={`portal-media-item ${isVideo ? "portal-media-item--video" : ""}`}>
      <div className="portal-media-item__media">
        {isVideo ? (
          <video src={portalMediaVideoUrl(item)} className="portal-media-item__video" controls preload="metadata" />
        ) : (
          <>
            <img src={portalMediaImageUrl(item)} alt={item.title || sectionTitle} className="portal-media-item__img" />
            <div className="portal-media-item__overlay">
              <button type="button" className="portal-media-item__action" disabled={busy} onClick={() => onEdit(item)}>
                Edit
              </button>
              <button
                type="button"
                className="portal-media-item__action portal-media-item__action--danger"
                disabled={busy}
                onClick={() => onDelete(item)}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </div>
      <div className="portal-media-item__body">
        <p className="portal-media-item__title">{item.title || "Untitled"}</p>
        {item.caption ? <p className="portal-media-item__caption">{item.caption}</p> : null}
        {isVideo ? (
          <div className="portal-media-item__actions">
            <button type="button" className="portal-media-item__action" disabled={busy} onClick={() => onEdit(item)}>
              Edit
            </button>
            <button
              type="button"
              className="portal-media-item__action portal-media-item__action--danger"
              disabled={busy}
              onClick={() => onDelete(item)}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function UploadPanel({ type, section, draftKey, draft, busy, atLimit, onDraftChange, onUpload }) {
  const isVideo = type === "video";
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!draft?.file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(draft.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft?.file]);

  const accept = isVideo
    ? "video/mp4,video/webm,video/quicktime,video/x-msvideo"
    : "image/jpeg,image/png,image/webp,image/*";
  const hint = isVideo ? "MP4, WEBM, MOV · max 200 MB" : "JPG, PNG, WEBP · max 15 MB";

  if (atLimit) {
    return (
      <div className="portal-media-upload portal-media-upload--locked">
        <p className="portal-media-upload__locked-title">Section full</p>
        <p className="portal-media-upload__locked-copy">
          {isVideo
            ? "Delete the current video to upload a new one."
            : `Maximum ${PORTAL_MAX_IMAGES_PER_SECTION} images reached. Delete one to add another.`}
        </p>
      </div>
    );
  }

  return (
    <div className="portal-media-upload">
      <p className="portal-media-upload__label">{isVideo ? "Add video" : "Add image"}</p>
      <FileDropzone
        accept={accept}
        file={draft?.file || null}
        previewUrl={previewUrl}
        hint={hint}
        disabled={busy}
        onPick={(file) => onDraftChange(draftKey, { file })}
      />
      <div className="portal-media-upload__fields">
        <label className="portal-media-field">
          <span>Title</span>
          <input
            className="input-dark"
            value={draft?.title || ""}
            placeholder="Optional display title"
            onChange={(e) => onDraftChange(draftKey, { title: e.target.value })}
          />
        </label>
        <label className="portal-media-field">
          <span>Caption</span>
          <input
            className="input-dark"
            value={draft?.caption || ""}
            placeholder="Optional short caption"
            onChange={(e) => onDraftChange(draftKey, { caption: e.target.value })}
          />
        </label>
      </div>
      <button
        type="button"
        className="btn-primary portal-media-upload__submit"
        disabled={busy || !draft?.file}
        onClick={() => onUpload(section.id)}
      >
        {busy ? "Uploading…" : isVideo ? "Upload video" : "Upload image"}
      </button>
    </div>
  );
}

function SectionPanel({
  type,
  section,
  draftKey,
  draft,
  busy,
  defaultOpen,
  onDraftChange,
  onUpload,
  onEdit,
  onDelete,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isVideo = type === "video";
  const items = isVideo ? (section.video ? [section.video] : []) : section.images || [];
  const count = items.length;
  const max = isVideo ? PORTAL_MAX_VIDEOS_PER_SECTION : PORTAL_MAX_IMAGES_PER_SECTION;
  const atLimit = count >= max;

  return (
    <section className={`portal-media-section ${open ? "is-open" : ""}`}>
      <button type="button" className="portal-media-section__head" onClick={() => setOpen((v) => !v)}>
        <div className="portal-media-section__head-main">
          <span className="portal-media-section__chevron" aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
          <div className="min-w-0 text-left">
            <h3 className="portal-media-section__title">{section.title}</h3>
            <p className="portal-media-section__body">{section.body}</p>
          </div>
        </div>
        <CapacityPill count={count} max={max} type={isVideo ? "video" : "image"} />
      </button>

      {open ? (
        <div className="portal-media-section__body-wrap">
          {!isVideo ? <CapacityBar count={count} max={max} /> : null}

          {count ? (
            <div className={isVideo ? "portal-media-grid portal-media-grid--video" : "portal-media-grid"}>
              {items.map((item) => (
                <MediaItemCard
                  key={item.id}
                  type={isVideo ? "video" : "image"}
                  item={item}
                  sectionTitle={section.title}
                  busy={busy}
                  onEdit={onEdit}
                  onDelete={(target) => onDelete(isVideo ? "video" : "image", target)}
                />
              ))}
            </div>
          ) : (
            <div className="portal-media-empty">
              <p>{isVideo ? "No video uploaded yet." : "No images in this section yet."}</p>
            </div>
          )}

          <UploadPanel
            type={type}
            section={section}
            draftKey={draftKey}
            draft={draft}
            busy={busy}
            atLimit={atLimit}
            onDraftChange={onDraftChange}
            onUpload={onUpload}
          />
        </div>
      ) : null}
    </section>
  );
}

export default function PortalMediaManager({ AdminShell }) {
  const [portalMedia, setPortalMedia] = useState({ gallery: [], videos: [] });
  const [activeTab, setActiveTab] = useState("gallery");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editType, setEditType] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editFile, setEditFile] = useState(null);
  const [uploadDrafts, setUploadDrafts] = useState({});

  const imageCount = (portalMedia.gallery || []).reduce((sum, s) => sum + (s.images?.length || 0), 0);
  const videoCount = (portalMedia.videos || []).filter((s) => s.video).length;

  useEffect(() => {
    setLoading(true);
    api("/api/admin/portal-media")
      .then((data) => setPortalMedia(data.portalMedia || { gallery: [], videos: [] }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateDraft(draftKey, patch) {
    setUploadDrafts((prev) => ({
      ...prev,
      [draftKey]: { title: "", caption: "", file: null, ...(prev[draftKey] || {}), ...patch },
    }));
  }

  async function uploadImage(sectionId) {
    const draft = uploadDrafts[sectionId] || {};
    if (!draft.file) {
      setError("Choose an image file to upload.");
      return;
    }
    setError("");
    setOk("");
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("sectionId", sectionId);
      formData.set("title", draft.title || "");
      formData.set("caption", draft.caption || "");
      formData.set("file", draft.file);
      const data = await api("/api/admin/portal-media/images", { method: "POST", body: formData });
      setPortalMedia(data.portalMedia);
      setUploadDrafts((prev) => ({ ...prev, [sectionId]: { title: "", caption: "", file: null } }));
      setOk("Image uploaded successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadVideo(sectionId) {
    const draftKey = `video-${sectionId}`;
    const draft = uploadDrafts[draftKey] || {};
    if (!draft.file) {
      setError("Choose a video file to upload.");
      return;
    }
    setError("");
    setOk("");
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("sectionId", sectionId);
      formData.set("title", draft.title || "");
      formData.set("caption", draft.caption || "");
      formData.set("file", draft.file);
      const data = await api("/api/admin/portal-media/videos", { method: "POST", body: formData });
      setPortalMedia(data.portalMedia);
      setUploadDrafts((prev) => ({ ...prev, [draftKey]: { title: "", caption: "", file: null } }));
      setOk("Video uploaded successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openEdit(type, item) {
    setEditType(type);
    setEditItem(item);
    setEditTitle(item?.title || "");
    setEditCaption(item?.caption || "");
    setEditFile(null);
    setError("");
  }

  function closeEdit() {
    setEditItem(null);
    setEditType("");
    setEditTitle("");
    setEditCaption("");
    setEditFile(null);
  }

  async function saveEdit() {
    if (!editItem) return;
    setError("");
    setOk("");
    setBusy(true);
    try {
      const formData = new FormData();
      formData.set("title", editTitle);
      formData.set("caption", editCaption);
      if (editFile) formData.set("file", editFile);
      const path =
        editType === "video"
          ? `/api/admin/portal-media/videos/${editItem.id}`
          : `/api/admin/portal-media/images/${editItem.id}`;
      const data = await api(path, { method: "PATCH", body: formData });
      setPortalMedia(data.portalMedia);
      closeEdit();
      setOk(editType === "video" ? "Video updated." : "Image updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteItem(type, item) {
    const label = item.title || item.filename || "this item";
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    setError("");
    setOk("");
    setBusy(true);
    try {
      const path =
        type === "video"
          ? `/api/admin/portal-media/videos/${item.id}`
          : `/api/admin/portal-media/images/${item.id}`;
      const data = await api(path, { method: "DELETE" });
      setPortalMedia(data.portalMedia);
      if (editItem?.id === item.id) closeEdit();
      setOk(type === "video" ? "Video deleted." : "Image deleted.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const [editPreviewUrl, setEditPreviewUrl] = useState("");
  useEffect(() => {
    if (editFile) {
      const url = URL.createObjectURL(editFile);
      setEditPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (editItem) {
      setEditPreviewUrl(
        editType === "video" ? portalMediaVideoUrl(editItem) : portalMediaImageUrl(editItem)
      );
      return undefined;
    }
    setEditPreviewUrl("");
    return undefined;
  }, [editFile, editItem, editType]);

  return (
    <AdminShell
      title="Portal media"
      subtitle="Manage photos and videos shown on the public Media page. Sections are fixed — upload, edit, or delete content only."
    >
      <div className="portal-media-admin">
        <div className="portal-media-admin__top">
          <div className="portal-media-stats">
            <div className="portal-media-stat">
              <span className="portal-media-stat__value">{imageCount}</span>
              <span className="portal-media-stat__label">Gallery images</span>
            </div>
            <div className="portal-media-stat">
              <span className="portal-media-stat__value">{videoCount}</span>
              <span className="portal-media-stat__label">Videos live</span>
            </div>
            <div className="portal-media-stat portal-media-stat--muted">
              <span className="portal-media-stat__value">{PORTAL_MAX_IMAGES_PER_SECTION}</span>
              <span className="portal-media-stat__label">Max per gallery section</span>
            </div>
          </div>
          <a href="/media" target="_blank" rel="noreferrer" className="btn-ghost portal-media-preview-link">
            Preview public page ↗
          </a>
        </div>

        <AlertBanner tone="error" onDismiss={() => setError("")}>
          {error}
        </AlertBanner>
        <AlertBanner tone="ok" onDismiss={() => setOk("")}>
          {ok}
        </AlertBanner>

        <div className="portal-media-tabs" role="tablist" aria-label="Media type">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "gallery"}
            className={`portal-media-tab ${activeTab === "gallery" ? "is-active" : ""}`}
            onClick={() => setActiveTab("gallery")}
          >
            Gallery
            <span className="portal-media-tab__count">{imageCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "videos"}
            className={`portal-media-tab ${activeTab === "videos" ? "is-active" : ""}`}
            onClick={() => setActiveTab("videos")}
          >
            Videos
            <span className="portal-media-tab__count">{videoCount}</span>
          </button>
        </div>

        {loading ? (
          <div className="portal-media-loading">
            <span className="portal-media-loading__dot" />
            Loading media sections…
          </div>
        ) : activeTab === "gallery" ? (
          <div className="portal-media-sections" role="tabpanel">
            <header className="portal-media-panel-head">
              <div>
                <p className="eyebrow text-accent">Gallery</p>
                <h2 className="font-display text-xl text-[color:var(--title)]">Image sections</h2>
              </div>
              <p className="portal-media-panel-head__hint">
                3 fixed sections · up to {PORTAL_MAX_IMAGES_PER_SECTION} images each
              </p>
            </header>
            {(portalMedia.gallery || []).map((section, index) => (
              <SectionPanel
                key={section.id}
                type="image"
                section={section}
                draftKey={section.id}
                draft={uploadDrafts[section.id]}
                busy={busy}
                defaultOpen={index === 0}
                onDraftChange={updateDraft}
                onUpload={uploadImage}
                onEdit={(item) => openEdit("image", item)}
                onDelete={deleteItem}
              />
            ))}
          </div>
        ) : (
          <div className="portal-media-sections" role="tabpanel">
            <header className="portal-media-panel-head">
              <div>
                <p className="eyebrow text-accent">Videos</p>
                <h2 className="font-display text-xl text-[color:var(--title)]">Video sections</h2>
              </div>
              <p className="portal-media-panel-head__hint">
                3 fixed sections · {PORTAL_MAX_VIDEOS_PER_SECTION} video each
              </p>
            </header>
            {(portalMedia.videos || []).map((section, index) => (
              <SectionPanel
                key={section.id}
                type="video"
                section={section}
                draftKey={`video-${section.id}`}
                draft={uploadDrafts[`video-${section.id}`]}
                busy={busy}
                defaultOpen={index === 0}
                onDraftChange={updateDraft}
                onUpload={uploadVideo}
                onEdit={(item) => openEdit("video", item)}
                onDelete={deleteItem}
              />
            ))}
          </div>
        )}
      </div>

      {editItem ? (
        <div className="portal-media-modal-backdrop" onClick={closeEdit} role="presentation">
          <div
            className="portal-media-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portal-media-edit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="portal-media-modal__head">
              <h3 id="portal-media-edit-title" className="font-display text-lg text-[color:var(--title)]">
                Edit {editType === "video" ? "video" : "image"}
              </h3>
              <button type="button" className="portal-media-modal__close" onClick={closeEdit} aria-label="Close">
                ×
              </button>
            </div>

            {editPreviewUrl ? (
              <div className="portal-media-modal__preview">
                {editType === "video" ? (
                  <video src={editPreviewUrl} controls className="portal-media-modal__preview-media" preload="metadata" />
                ) : (
                  <img src={editPreviewUrl} alt="" className="portal-media-modal__preview-media" />
                )}
              </div>
            ) : null}

            <div className="portal-media-modal__fields">
              <label className="portal-media-field">
                <span>Title</span>
                <input className="input-dark" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </label>
              <label className="portal-media-field">
                <span>Caption</span>
                <input className="input-dark" value={editCaption} onChange={(e) => setEditCaption(e.target.value)} />
              </label>
              <label className="portal-media-field">
                <span>Replace file (optional)</span>
                <FileDropzone
                  accept={editType === "video" ? "video/*" : "image/*"}
                  file={editFile}
                  previewUrl={editFile ? editPreviewUrl : ""}
                  hint={editType === "video" ? "MP4, WEBM, MOV" : "JPG, PNG, WEBP"}
                  disabled={busy}
                  onPick={setEditFile}
                />
              </label>
            </div>

            <div className="portal-media-modal__actions">
              <button type="button" className="btn-ghost" disabled={busy} onClick={closeEdit}>
                Cancel
              </button>
              <button type="button" className="btn-primary" disabled={busy} onClick={saveEdit}>
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
