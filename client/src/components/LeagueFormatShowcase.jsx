/** Immersive League Format section: highlight stats + a numbered stage rail. */
export default function LeagueFormatShowcase({ block }) {
  const highlights = block.highlights || [];
  const stages = block.stages || [];

  return (
    <article className="format-showcase">
      <div className="format-showcase__glow" aria-hidden="true" />

      <div className="format-showcase__inner">
        <div className="format-showcase__head">
          <div>
            <p className="eyebrow text-accent">Season 2026</p>
            <h2 className="format-showcase__title">{block.title}</h2>
            <p className="format-showcase__lead">{block.body}</p>
          </div>

          {highlights.length ? (
            <div className="format-highlights">
              {highlights.map((item) => (
                <div key={item.label} className="format-highlight">
                  <p className="format-highlight__value">{item.value}</p>
                  <p className="format-highlight__label">{item.label}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {stages.length ? (
          <ol className="format-stages">
            {stages.map((stage, index) => (
              <li
                key={stage.id}
                className="format-stage"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <span className="format-stage__step">{stage.step}</span>
                <span className="format-stage__dot" aria-hidden="true" />
                <div className="format-stage__body">
                  <div className="format-stage__row">
                    <h3 className="format-stage__title">{stage.title}</h3>
                    <span className="format-stage__meta">{stage.meta}</span>
                  </div>
                  <p className="format-stage__detail">{stage.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </article>
  );
}
