import Link from "next/link";
import { playerStatsService } from "@/services/playerStatsService";
import { PlayerProfileTabs } from "@/components/players/PlayerProfileTabs";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toFixed(decimals);
}

function getSeasonStart() {
  return `${new Date().getFullYear()}-01-01`;
}

function getThirtyDaysAgo() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="text-sm font-bold text-gray-600">{label}</div>
      <div className="mt-1 text-3xl font-bold text-gray-950">{value}</div>
    </div>
  );
}

export default async function PlayerDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [summary, rounds, seasonHoles, thirtyDayHoles, scoring] =
    await Promise.all([
      playerStatsService.getSummary(id),
      playerStatsService.getRoundHistory(id, 20),
      playerStatsService.getHoleStats(id, getSeasonStart()),
      playerStatsService.getHoleStats(id, getThirtyDaysAgo()),
      playerStatsService.getScoringBreakdown(id),
    ]);

  if (!summary) {
    return (
      <main className="p-8 text-gray-900">
        <Link href="/players" className="font-bold text-blue-800 hover:underline">
          ← Back to Players
        </Link>
        <p className="mt-4 font-medium text-red-700">Player not found.</p>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-8 text-gray-900">
      <div>
        <Link href="/players" className="font-bold text-blue-800 hover:underline">
          ← Back to Players
        </Link>

        <h1 className="mt-4 text-4xl font-bold text-gray-950">
          {summary.name}
        </h1>

        <p className="mt-1 text-gray-600">Player performance profile</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Handicap" value={formatNumber(summary.handicap)} />
        <StatCard label="Rounds" value={summary.rounds} />
        <StatCard label="Average" value={formatNumber(summary.average)} />
        <StatCard label="Best Round" value={summary.best ?? "-"} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PlayerProfileTabs
          rounds={rounds}
          seasonHoles={seasonHoles}
          thirtyDayHoles={thirtyDayHoles}
        />

        <section className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-bold text-gray-950">Scoring Breakdown</h2>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Birdies" value={scoring.birdies} />
            <StatCard label="Pars" value={scoring.pars} />
            <StatCard label="Bogeys" value={scoring.bogeys} />
            <StatCard label="Double+" value={scoring.doubles} />
          </div>
        </section>
      </div>
    </main>
  );
}