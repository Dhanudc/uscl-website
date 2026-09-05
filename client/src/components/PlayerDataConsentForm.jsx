import { PLAYER_DATA_CONSENT as C } from "../data/playerDataConsent";

export default function PlayerDataConsentForm({ id = "player-data-consent", className = "" }) {
  return (
    <div id={id} className={`space-y-5 text-sm leading-relaxed text-[color:var(--text-muted)] ${className}`}>
      <p>{C.intro}</p>

      <div>
        <p className="font-semibold text-[color:var(--title)]">{C.dataTypesIntro}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {C.dataTypes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="font-display text-base text-[color:var(--title)]">{C.purposeTitle}</h3>
        <p className="mt-2">{C.purposeIntro}</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {C.purposes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>

      <div>
        <h3 className="font-display text-base text-[color:var(--title)]">{C.sharingTitle}</h3>
        <p className="mt-2">{C.sharingIntro}</p>
        <p className="mt-3 font-semibold text-[color:var(--title)]">{C.networkIntro}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {C.network.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3">{C.sharingLimit}</p>
      </div>

      <div>
        <h3 className="font-display text-base text-[color:var(--title)]">{C.sponsorTitle}</h3>
        <p className="mt-2">{C.sponsorBody}</p>
        <p className="mt-2">{C.sponsorPromo}</p>
      </div>

      <div>
        <h3 className="font-display text-base text-[color:var(--title)]">{C.mediaTitle}</h3>
        <p className="mt-2">{C.mediaBody}</p>
      </div>

      <div>
        <h3 className="font-display text-base text-[color:var(--title)]">{C.securityTitle}</h3>
        <p className="mt-2">{C.securityBody}</p>
      </div>

      <div>
        <h3 className="font-display text-base text-[color:var(--title)]">{C.withdrawalTitle}</h3>
        <p className="mt-2">{C.withdrawalBody}</p>
        <p className="mt-2">{C.withdrawalNote}</p>
      </div>

      <p className="font-medium text-[color:var(--text)]">{C.closing}</p>
    </div>
  );
}
