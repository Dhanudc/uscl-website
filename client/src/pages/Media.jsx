import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import ZoomableImage from "../components/ZoomableImage";
import { mediaNewsItems } from "../data/siteContent";
import { api } from "../api";
import { portalMediaImageUrl, portalMediaVideoUrl } from "../utils/media";

function MediaTabButton({ active, onClick, children, count }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`media-page-tab ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      {children}
      {typeof count === "number" ? <span className="media-page-tab__count">{count}</span> : null}
    </button>
  );
}

function GallerySection({ section }) {
  const images = section.images || [];
  if (!images.length) {
    return (
      <article className="media-gallery-section media-gallery-section--empty">
        <div className="media-gallery-section__head">
          <h3 className="media-gallery-section__title">{section.title}</h3>
          <p className="media-gallery-section__body">{section.body}</p>
        </div>
        <p className="media-empty-note">Photos coming soon.</p>
      </article>
    );
  }

  return (
    <article className="media-gallery-section" id={section.id}>
      <div className="media-gallery-section__head">
        <p className="eyebrow text-accent">Gallery</p>
        <h3 className="media-gallery-section__title">{section.title}</h3>
        <p className="media-gallery-section__body">{section.body}</p>
        <p className="media-gallery-section__count">{images.length} photo{images.length === 1 ? "" : "s"}</p>
      </div>

      <div className="media-photo-grid">
        {images.map((image) => (
          <figure key={image.id} className="media-photo-card">
            <ZoomableImage
              src={portalMediaImageUrl(image)}
              alt={image.title || section.title}
              className="media-photo-card__img"
            />
            {(image.title || image.caption) && (
              <figcaption className="media-photo-card__caption">
                {image.title ? <strong>{image.title}</strong> : null}
                {image.caption ? <span>{image.caption}</span> : null}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </article>
  );
}

function VideoSection({ section }) {
  const video = section.video;
  if (!video) {
    return (
      <article className="media-video-card media-video-card--empty">
        <div className="media-video-card__copy">
          <h3 className="media-video-card__title">{section.title}</h3>
          <p className="media-video-card__body">{section.body}</p>
        </div>
        <p className="media-empty-note">Video coming soon.</p>
      </article>
    );
  }

  return (
    <article className="media-video-card" id={section.id}>
      <div className="media-video-card__player-wrap">
        <video
          src={portalMediaVideoUrl(video)}
          controls
          className="media-video-card__player"
          preload="metadata"
          playsInline
        />
      </div>
      <div className="media-video-card__copy">
        <p className="eyebrow text-accent">Video</p>
        <h3 className="media-video-card__title">{video.title || section.title}</h3>
        <p className="media-video-card__body">{video.caption || section.body}</p>
      </div>
    </article>
  );
}

export default function Media() {
  const [gallery, setGallery] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("gallery");

  useEffect(() => {
    api("/api/settings/portal-media")
      .then((data) => {
        setGallery(data.portalMedia?.gallery || []);
        setVideos(data.portalMedia?.videos || []);
      })
      .catch((err) => setError(err.message || "Unable to load media."))
      .finally(() => setLoading(false));
  }, []);

  const photoCount = useMemo(
    () => gallery.reduce((sum, section) => sum + (section.images?.length || 0), 0),
    [gallery]
  );
  const videoCount = useMemo(() => videos.filter((section) => section.video).length, [videos]);

  useEffect(() => {
    if (loading) return;
    if (photoCount > 0) setActiveTab("gallery");
    else if (videoCount > 0) setActiveTab("videos");
    else setActiveTab("news");
  }, [loading, photoCount, videoCount]);

  return (
    <PageShell
      eyebrow="Coverage"
      title="Media"
      subtitle="News, gallery, and videos from USCL T20 — auctions, fixtures, and finals."
    >
      <div className="media-page">
        <div className="media-page-nav" role="tablist" aria-label="Media sections">
          <MediaTabButton active={activeTab === "news"} onClick={() => setActiveTab("news")}>
            News
          </MediaTabButton>
          <MediaTabButton active={activeTab === "gallery"} onClick={() => setActiveTab("gallery")} count={photoCount}>
            Gallery
          </MediaTabButton>
          <MediaTabButton active={activeTab === "videos"} onClick={() => setActiveTab("videos")} count={videoCount}>
            Videos
          </MediaTabButton>
        </div>

        {error ? (
          <p className="media-page-error" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="media-page-loading" aria-live="polite">
            <div className="media-page-loading__grid">
              {[1, 2, 3].map((n) => (
                <div key={n} className="media-skeleton media-skeleton--card" />
              ))}
            </div>
            <p className="media-page-loading__text">Loading media…</p>
          </div>
        ) : (
          <>
            {activeTab === "news" ? (
              <section id="news" className="media-panel" role="tabpanel">
                <header className="media-panel__head">
                  <p className="eyebrow text-accent">Latest</p>
                  <h2 className="media-panel__title">News & updates</h2>
                  <p className="media-panel__subtitle">
                    Match reports, auction updates, franchise announcements, and league stories.
                  </p>
                </header>
                <div className="media-news-grid">
                  {mediaNewsItems.map((item, index) => (
                    <article key={item} className="media-news-card">
                      <span className="media-news-card__index">{String(index + 1).padStart(2, "0")}</span>
                      <p className="media-news-card__title">{item}</p>
                      <p className="media-news-card__tag">News</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            {activeTab === "gallery" ? (
              <section id="gallery" className="media-panel" role="tabpanel">
                <header className="media-panel__head">
                  <p className="eyebrow text-accent">Photos</p>
                  <h2 className="media-panel__title">Gallery</h2>
                  <p className="media-panel__subtitle">
                    Photos from auctions, league fixtures, and finals night. Tap any image to view full size.
                  </p>
                </header>
                <div className="media-gallery-stack">
                  {gallery.map((section) => (
                    <GallerySection key={section.id} section={section} />
                  ))}
                </div>
              </section>
            ) : null}

            {activeTab === "videos" ? (
              <section id="videos" className="media-panel" role="tabpanel">
                <header className="media-panel__head">
                  <p className="eyebrow text-accent">Watch</p>
                  <h2 className="media-panel__title">Videos</h2>
                  <p className="media-panel__subtitle">
                    Season trailers, franchise unveils, and player journey films from USCL T20.
                  </p>
                </header>
                <div className="media-video-grid">
                  {videos.map((section) => (
                    <VideoSection key={section.id} section={section} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </PageShell>
  );
}
