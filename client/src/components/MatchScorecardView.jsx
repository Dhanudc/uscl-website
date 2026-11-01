import { parseMatchScorecard, scorecardHeadline } from "../utils/matchScorecard";

function cell(value) {
  if (value === 0 || value === "0") return "0";
  return value === "" || value == null ? "—" : value;
}

export default function MatchScorecardView({ scorecardRaw, teamName, fallbackScore, resultSummary }) {
  const scorecard = parseMatchScorecard(scorecardRaw);
  const headline = scorecardHeadline(scorecard, fallbackScore);

  if (!headline && !scorecard) {
    return null;
  }

  const batting = scorecard?.batting || [];
  const bowling = scorecard?.bowling || [];
  const fall = scorecard?.fallOfWickets || [];

  return (
    <section className="match-scorecard overflow-hidden rounded-xl border border-[color:var(--border)] bg-ink-card">
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] bg-ink-soft px-3 py-2.5">
        <p className="truncate text-sm font-semibold text-[color:var(--title)]">{teamName}</p>
        <p className="shrink-0 text-sm font-bold tabular-nums text-accent">{headline || fallbackScore}</p>
      </div>

      {batting.length > 0 ? (
        <div className="border-b border-[color:var(--border)]">
          <p className="bg-ink-soft px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Batting
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[11px] sm:text-xs">
              <thead className="border-b border-[color:var(--border)] text-[color:var(--text-muted)]">
                <tr>
                  <th className="px-2 py-1.5 font-semibold">Batters</th>
                  <th className="px-1.5 py-1.5 text-right font-semibold">R</th>
                  <th className="px-1.5 py-1.5 text-right font-semibold">B</th>
                  <th className="px-1.5 py-1.5 text-right font-semibold">4s</th>
                  <th className="px-1.5 py-1.5 text-right font-semibold">6s</th>
                  <th className="px-1.5 py-1.5 text-right font-semibold">SR</th>
                  <th className="hidden px-1.5 py-1.5 text-right font-semibold sm:table-cell">Min</th>
                </tr>
              </thead>
              <tbody>
                {batting.map((row, i) => (
                  <tr key={i} className="border-b border-[color:var(--border)]/60 align-top">
                    <td className="px-2 py-2">
                      <p className="font-semibold text-accent">{row.name || "—"}</p>
                      {row.dismissal ? (
                        <p className="mt-0.5 text-[10px] leading-snug text-[color:var(--text-muted)]">
                          {row.dismissal}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-1.5 py-2 text-right tabular-nums">{cell(row.runs)}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">{cell(row.balls)}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">{cell(row.fours)}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">{cell(row.sixes)}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">{cell(row.strikeRate)}</td>
                    <td className="hidden px-1.5 py-2 text-right tabular-nums sm:table-cell">{cell(row.minutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {scorecard?.extras || scorecard?.total ? (
            <div className="border-t border-[color:var(--border)] px-2 py-2 text-[11px] sm:text-xs">
              {scorecard.extras ? (
                <div className="flex justify-between gap-2 py-1">
                  <span className="text-[color:var(--text-muted)]">Extras</span>
                  <span className="tabular-nums text-[color:var(--title)]">
                    {scorecard.extras.total}
                    {scorecard.extras.detail ? (
                      <span className="text-[color:var(--text-muted)]"> ({scorecard.extras.detail})</span>
                    ) : null}
                  </span>
                </div>
              ) : null}
              {scorecard.total ? (
                <div className="flex justify-between gap-2 border-t border-[color:var(--border)]/60 py-1 font-semibold">
                  <span className="text-[color:var(--title)]">Total</span>
                  <span className="tabular-nums text-[color:var(--title)]">
                    {scorecard.total.label}
                    {scorecard.total.overs ? ` (${scorecard.total.overs})` : ""}
                    {scorecard.total.crr ? (
                      <span className="font-normal text-[color:var(--text-muted)]">
                        {" "}
                        CRR {scorecard.total.crr}
                      </span>
                    ) : null}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {scorecard?.toBat?.length > 0 ? (
            <p className="border-t border-[color:var(--border)] px-2 py-2 text-[10px] italic text-[color:var(--text-muted)]">
              <span className="font-semibold not-italic">To bat: </span>
              {scorecard.toBat.join(", ")}
            </p>
          ) : null}
        </div>
      ) : headline ? (
        <div className="border-b border-[color:var(--border)] px-3 py-3">
          <p className="font-display text-xl text-[color:var(--title)]">{headline}</p>
          {resultSummary ? <p className="mt-1 text-xs text-[color:var(--text-muted)]">{resultSummary}</p> : null}
        </div>
      ) : null}

      {bowling.length > 0 ? (
        <div className="border-b border-[color:var(--border)]">
          <p className="bg-ink-soft px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Bowling
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[11px] sm:text-xs">
              <thead className="border-b border-[color:var(--border)] text-[color:var(--text-muted)]">
                <tr>
                  <th className="px-2 py-1.5 font-semibold">Bowlers</th>
                  <th className="px-1.5 py-1.5 text-right font-semibold">O</th>
                  <th className="px-1.5 py-1.5 text-right font-semibold">M</th>
                  <th className="px-1.5 py-1.5 text-right font-semibold">R</th>
                  <th className="px-1.5 py-1.5 text-right font-semibold">W</th>
                  <th className="px-1.5 py-1.5 text-right font-semibold">Eco</th>
                </tr>
              </thead>
              <tbody>
                {bowling.map((row, i) => (
                  <tr key={i} className="border-b border-[color:var(--border)]/60">
                    <td className="px-2 py-2 font-semibold text-accent">{row.name || "—"}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">{cell(row.overs)}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">{cell(row.maidens)}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">{cell(row.runs)}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">{cell(row.wickets)}</td>
                    <td className="px-1.5 py-2 text-right tabular-nums">{cell(row.economy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {fall.length > 0 ? (
        <div>
          <p className="bg-ink-soft px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--text-muted)]">
            Fall of wickets
          </p>
          <ul className="divide-y divide-[color:var(--border)]/60 text-[11px] sm:text-xs">
            {fall.map((row, i) => (
              <li key={i} className="flex justify-between gap-2 px-2 py-2">
                <span className="text-[color:var(--title)]">
                  {row.text ||
                    `${row.wicket != null && row.wicket !== "" ? `${row.wicket} ` : ""}${row.batter}${row.score ? ` ${row.score}` : ""}`}
                </span>
                {row.over ? <span className="shrink-0 text-[color:var(--text-muted)]">({row.over})</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
