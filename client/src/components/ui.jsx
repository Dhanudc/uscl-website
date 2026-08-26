export function PageLoader({ message = "Loading…" }) {
  return (
    <div className="ui-page-loader" role="status" aria-live="polite">
      <span className="ui-spinner" aria-hidden="true" />
      <p className="ui-page-loader__text">{message}</p>
    </div>
  );
}

export function AlertBanner({ tone = "error", children, onDismiss }) {
  if (!children) return null;
  const tones = {
    error: "ui-alert ui-alert--error",
    ok: "ui-alert ui-alert--ok",
    info: "ui-alert ui-alert--info",
  };
  return (
    <div className={tones[tone] || tones.error} role="status">
      <span>{children}</span>
      {onDismiss ? (
        <button type="button" className="ui-alert__dismiss" onClick={onDismiss} aria-label="Dismiss">
          ×
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="ui-empty-state">
      <p className="ui-empty-state__title">{title}</p>
      {description ? <p className="ui-empty-state__desc">{description}</p> : null}
      {action ? <div className="ui-empty-state__action">{action}</div> : null}
    </div>
  );
}

export function SkeletonBlock({ className = "" }) {
  return <div className={`ui-skeleton ${className}`.trim()} aria-hidden="true" />;
}

export function StatGridSkeleton({ count = 8 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-[color:var(--border)] bg-ink-card p-4">
          <SkeletonBlock className="ui-skeleton--line ui-skeleton--short" />
          <SkeletonBlock className="ui-skeleton--line ui-skeleton--value mt-3" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 4, tall = false }) {
  return (
    <div className="grid gap-4 md:grid-cols-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBlock key={i} className={tall ? "ui-skeleton--card-tall" : "ui-skeleton--card"} />
      ))}
    </div>
  );
}

export function StatusPill({ tone = "muted", children }) {
  const tones = {
    success: "ui-pill ui-pill--success",
    warning: "ui-pill ui-pill--warning",
    danger: "ui-pill ui-pill--danger",
    muted: "ui-pill ui-pill--muted",
    accent: "ui-pill ui-pill--accent",
  };
  return <span className={tones[tone] || tones.muted}>{children}</span>;
}
