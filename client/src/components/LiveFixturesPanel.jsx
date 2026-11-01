import { useMemo } from "react";
import { findNextMatch } from "../utils/liveMatches";
import { LiveMatchFaceoff } from "./LiveMatchFaceoff";

export default function LiveFixturesPanel({ schedule, onViewSchedule, onOpenMatch }) {
  const next = useMemo(() => findNextMatch(schedule), [schedule]);

  if (!next) {
    return (
      <p className="rounded-xl border border-[color:var(--border)] bg-ink-card px-4 py-8 text-center text-sm text-[color:var(--text-muted)]">
        No upcoming fixtures right now.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <LiveMatchFaceoff
        match={next}
        variant="hero"
        onOpen={(side) => onOpenMatch?.(next, side)}
      />
      <p className="text-center">
        <button type="button" onClick={onViewSchedule} className="text-xs font-semibold text-accent hover:underline">
          View full schedule →
        </button>
      </p>
    </div>
  );
}
