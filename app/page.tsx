// app/page.tsx

import Link from "next/link";

const dashboardCards = [
  {
    href: "/dashboard",
    title: "Dashboard",
    emoji: "📊",
    description:
      "Club overview with player rankings, handicap summaries, scoring trends, and key league metrics.",
    badge: "Overview",
  },
  {
    href: "/players",
    title: "Players",
    emoji: "👤",
    description:
      "View every member, current Handicap Index, recent rounds, differentials, and player profiles.",
    badge: "Roster",
  },
  {
    href: "/audit",
    title: "Handicap Audit",
    emoji: "⚖️",
    description:
      "GHIN-centric audit using handicap differentials, competition/casual gaps, and Goodrich vs other course trends.",
    badge: "Review",
  },
  {
    href: "/holes",
    title: "Hole Stats",
    emoji: "⛳",
    description:
      "Goodrich hole-by-hole scoring analysis including averages, birdie rates, pars, bogeys, and double+ rates.",
    badge: "Course",
  },
  {
    href: "/compare",
    title: "Compare Players",
    emoji: "📈",
    description:
      "Compare golfers side-by-side using scoring, differentials, and hole-by-hole performance.",
    badge: "Compare",
  },
  {
    href: "/import",
    title: "Import Center",
    emoji: "⬆️",
    description:
      "Upload weekly Scores Posted Reports and Goodrich hole-by-hole files to keep the dashboard current.",
    badge: "Admin",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-4 text-gray-900 md:p-8">
      <section className="rounded-2xl bg-slate-950 px-6 py-8 text-white shadow-lg md:px-10 md:py-12">
        <p className="text-sm font-bold uppercase tracking-wide text-blue-300">
          Goodrich Men&apos;s Club
        </p>

        <h1 className="mt-3 text-3xl font-bold md:text-5xl">
          Handicap & Performance Dashboard
        </h1>

        <p className="mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
          A GHIN-focused analytics hub for player profiles, handicap review,
          Goodrich hole statistics, weekly imports, and scoring trends.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/audit"
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            View Handicap Audit
          </Link>

          <Link
            href="/players"
            className="rounded-lg bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-100"
          >
            View Players
          </Link>

          <Link
            href="/import"
            className="rounded-lg border border-slate-500 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
          >
            Import Weekly Scores
          </Link>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard label="Primary Data Source" value="GHIN Reports" />
        <MetricCard label="Audit Method" value="Differentials" />
        <MetricCard label="Goodrich Detail" value="Hole-by-Hole" />
      </section>

      <section className="mt-8">
        <h2 className="text-2xl font-bold text-gray-950">Dashboard Sections</h2>

        <p className="mt-1 text-sm font-medium text-gray-600">
          Start with the audit, browse player profiles, or update the system
          with the latest weekly reports.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {dashboardCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-3xl">{card.emoji}</div>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                  {card.badge}
                </span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-gray-950">
                {card.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-300 bg-white p-5 shadow-sm">
      <div className="text-sm font-bold text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-950">{value}</div>
    </div>
  );
}
