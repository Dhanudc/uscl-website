import CricHeroesEmbed from "../components/CricHeroesEmbed";
import KeyDatesSection from "../components/KeyDatesSection";
import PageShell from "../components/PageShell";

export default function LiveUpdates() {
  return (
    <PageShell
      eyebrow="Match centre"
      title="Live Updates"
      subtitle="Fixtures, results, and standings for USCL T20 Season 2026 — powered by CricHeroes."
    >
      <KeyDatesSection className="mb-10" />

      <div className="mt-2">
        <CricHeroesEmbed />
      </div>
    </PageShell>
  );
}
