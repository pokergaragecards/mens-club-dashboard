import Link from "next/link";
import { playerStatsService } from "@/services/playerStatsService";
import { PlayerProfileTabs } from "@/components/players/PlayerProfileTabs";

type PageProps = {
  params: Promise<{ id: string }>;
};

type RoundLike = {
  played_at: string;
  gross_score: number | null;
  adjusted_gross_score: number | null;
  differential: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  score_type: string | null;
  source: string | null;
  course_name: string | null;
  tee_name: string | null;
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

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isCompetition(scoreType: string | null | undefined) {
  return ["C", "CH"].includes(scoreType ?? "");
}

function isGoodrich(round: RoundLike) {
  return (
    round.source === "GHIN_HBH_PDF" ||
    String(round.course_name ?? "").toLowerCase() === "goodrich"
  );
}

function getDiff(round: RoundLike) {
  if (round.differential != null) return Number(round.differential);

  const score = Number(round.adjusted_gross_score ?? round.gross_score);
  const rating = Number(round.course_rating);
  const slope = Number(round.slope_rating);

  if (!Number.isFinite(score) || !Number.isFinite(rating) || !Number.isFinite(slope) || slope <= 0) {
    return null;
  }

  return ((score - rating) * 113) / slope;
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-3 shadow-sm md:p-4">
      <div className="text-xs font-bold text-gray-600 md:text-sm">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-950 md:text-3xl">
        {value}
      </div>
    </div>
  );
}

export default async function PlayerDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [summary, rounds, seasonHoles, thirtyDayHoles, scoring] =
    await Promise.all([
      playerStatsService.getSummary(id),
      playerStatsService.getRoundHistory(id, 50),
      playerStatsService.getHoleStats(id, getSeasonStart()),
      playerStatsService.getHoleStats(id, getThirtyDaysAgo()),
      playerStatsService.getScoringBreakdown(id),
    ]);

  if (!summary) {
    return (
      <main className="p-4 text-gray-900 md:p-8">
        <Link href="/players" className="font-bold text-blue-800 hover:underline">
          ← Back to Players
        </Link>
        <p className="mt-4 font-medium text-red-700">Player not found.</p>
      </main>
    );
  }

  const diffRows = rounds
    .map((round) => ({
      round,
      differential: getDiff(round as RoundLike),
    }))
    .filter((row) => row.differential != null) as {
    round: RoundLike;
    differential: number;
  }[];

  const allDiffs = diffRows.map((row) => row.differential);
  const compDiffs = diffRows
    .filter(({ round }) => isCompetition(round.score_type))
    .map((row) => row.differential);
  const casualDiffs = diffRows
    .filter(({ round }) => !isCompetition(round.score_type))
    .map((row) => row.differential);
  const goodrichDiffs = diffRows
    .filter(({ round }) => isGoodrich(round))
    .map((row) => row.differential);
  const otherDiffs = diffRows
    .filter(({ round }) => !isGoodrich(round))
    .map((row) => row.differential);

  const bestDiff = allDiffs.length ? Math.min(...allDiffs) : null;
  const avgDiff = average(allDiffs);

  return (
    <main className="space-y-5 p-4 text-gray-900 md:space-y-6 md:p-8">
      <div>
        <Link href="/players" className="font-bold text-blue-800 hover:underline">
          ← Back to Players
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-950 md:text-4xl">
          {summary.name}
        </h1>

        <p className="mt-1 text-sm text-gray-600 md:text-base">
          GHIN-style player performance profile
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <StatCard label="Current HI" value={formatNumber(summary.handicap)} />
        <StatCard label="Rounds" value={summary.rounds} />
        <StatCard label="Avg Diff" value={formatNumber(avgDiff)} />
        <StatCard label="Best Diff" value={formatNumber(bestDiff)} />
      </div>

      <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm md:p-5">
        <h2 className="text-lg font-bold text-gray-950 md:text-xl">
          Differential Breakdown
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Comp Diff" value={formatNumber(average(compDiffs))} />
          <StatCard label="Casual Diff" value={formatNumber(average(casualDiffs))} />
          <StatCard label="Goodrich Diff" value={formatNumber(average(goodrichDiffs))} />
          <StatCard label="Other Diff" value={formatNumber(average(otherDiffs))} />
        </div>
      </section>

      <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm md:p-5">
        <h2 className="text-lg font-bold text-gray-950 md:text-xl">
          Scoring Breakdown
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Birdies" value={scoring.birdies} />
          <StatCard label="Pars" value={scoring.pars} />
          <StatCard label="Bogeys" value={scoring.bogeys} />
          <StatCard label="Double+" value={scoring.doubles} />
        </div>
      </section>

      <PlayerProfileTabs
        rounds={rounds}
        seasonHoles={seasonHoles}
        thirtyDayHoles={thirtyDayHoles}
      />
    </main>
  );
}