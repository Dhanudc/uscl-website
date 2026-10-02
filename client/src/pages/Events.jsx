import { EmptyState, PageLoader } from "../components/ui";
import { EventPost } from "../components/UpcomingEvents";
import { useSiteSettings } from "../context/SiteSettingsContext";

export default function Events() {
  const { upcomingEvents, isModuleVisible, loading, navLabel } = useSiteSettings();
  const title = navLabel("events") || "Photos";
  const posted = upcomingEvents.filter((event) => event.imageUrl);

  if (loading) {
    return (
      <section className="bg-ink px-4 py-10">
        <PageLoader message="Loading events…" />
      </section>
    );
  }

  if (!isModuleVisible("events")) {
    return (
      <section className="bg-ink px-4 py-16 text-center">
        <EmptyState title="This page is hidden" description="An admin can turn this page back on from site settings." />
      </section>
    );
  }

  return (
    <section className="bg-ink px-4 py-10 md:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="eyebrow text-accent">USCL</p>
          <h1 className="page-title mt-2">{title}</h1>
          <p className="mt-3 text-sm text-[color:var(--text-muted)]">
            Photos and updates from the league. Each card shows the image with its details.
          </p>
        </div>
        {posted.length === 0 ? (
          <div className="mt-10">
            <EmptyState title="Nothing posted yet" description="A photo appears here after an image and its details are added." />
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posted.map((event) => (
              <EventPost key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
