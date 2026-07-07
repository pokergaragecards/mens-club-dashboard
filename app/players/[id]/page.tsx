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

type StatSet = {
  label: string;
  rounds: number;
  avgScore: number | null;
  avgDiff: number | null;
  bestDiff: number | null;
  worstDiff: number | null;
  compDiff: number | null;
  casualDiff: number | null;
  goodrichDiff: number | null;
  otherDiff: number | null;
};

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toFixed(decimals);
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getSeasonStart() {
  return `${new Date().getFullYear()}-01-01`;
}

function getThirtyDaysAgo() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function isCompetition(scoreType: string | null | undefined) {
  return ["C", "CH", "CA", "ECH"].includes(scoreType ?? "");
}

function isGoodrich(round: RoundLike) {
  return (
    round.source === "GHIN_HBH_PDF" ||
    String(round.course_name ?? "").toLowerCase().includes("goodrich")
  );
}

function getDiff(round: RoundLike) {
  if (round.differential != null) return Number(round.differential);

  const score = Number(round.adjusted_gross_score ?? round.gross_score);
  const rating = Number(round.course_rating);
  const slope = Number(round.slope_rating);

  if (
    !Number.isFinite(score) ||
    !Number.isFinite(rating) ||
    !Number.isFinite(slope) ||
    slope <= 0
  ) {
    return null;
  }

  return ((score - rating) * 113) / slope;
}

function buildStatSet(label: string, rounds: RoundLike[]): StatSet {
  const scoredRounds = rounds.filter(
    (round) =>
      round.gross_score != null || round.adjusted_gross_score != null
  );

  const scores = scoredRounds
    .map((round) => Number(round.adjusted_gross_score ?? round.gross_score))
    .filter(Number.isFinite);

  const diffRows = scoredRounds
    .map((round) => ({
      round,
      diff: getDiff(round),
    }))
    .filter((row): row is { round: RoundLike; diff: number } => row.diff != null);

  const diffs = diffRows.map((row) => row.diff);

  const compDiffs = diffRows
    .filter(({ round }) => isCompetition(round.score_type))
    .map((row) => row.diff);

  const casualDiffs = diffRows
    .filter(({ round }) => !isCompetition(round.score_type))
    .map((row) => row.diff);

  const goodrichDiffs = diffRows
    .filter(({ round }) => isGoodrich(round))
    .map((row) => row.diff);

  const otherDiffs = diffRows
    .filter(({ round }) => !isGoodrich(round))
    .map((row) => row.diff);

  return {
    label,
    rounds: scoredRounds.length,
    avgScore: average(scores),
    avgDiff: average(diffs),
    bestDiff: diffs.length ? Math.min(...diffs) : null,
    worstDiff: diffs.length ? Math.max(...diffs) : null,
    compDiff: average(compDiffs),
    casualDiff: average(casualDiffs),
    goodrichDiff: average(goodrichDiffs),
    otherDiff: average(otherDiffs),
  };
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-3 shadow-sm">
      <div className="text-xs font-bold text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-950">{value}</div>
    </div>
  );
}

function StatSection({ stat }: { stat: StatSet }) {
  return (
    <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-gray-950">{stat.label}</h2>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Rounds" value={stat.rounds} />
        <StatCard label="Avg Score" value={formatNumber(stat.avgScore)} />
        <StatCard label="Avg Diff" value={formatNumber(stat.avgDiff)} />
        <StatCard label="Best Diff" value={formatNumber(stat.bestDiff)} />
        <StatCard label="Worst Diff" value={formatNumber(stat.worstDiff)} />
        <StatCard label="Comp Diff" value={formatNumber(stat.compDiff)} />
        <StatCard label="Casual Diff" value={formatNumber(stat.casualDiff)} />
        <StatCard label="Goodrich Diff" value={formatNumber(stat.goodrichDiff)} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <StatCard label="Other Course Diff" value={formatNumber(stat.otherDiff)} />
      </div>
    </section>
  );
}

export default async function PlayerDetailPage({ params }: PageProps) {
  const { id } = await params;

  const [summary, rounds, seasonHoles, thirtyDayHoles, scoring] =
    await Promise.all([
      playerStatsService.getSummary(id),
      playerStatsService.getRoundHistory(id, 500, "GHIN"),
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

  const sortedRounds = [...(rounds as RoundLike[])].sort(
    (a, b) =>
      new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
  );

  const seasonStart = getSeasonStart();

  const last20Stats = buildStatSet("Last 20 Rounds", sortedRounds.slice(0, 20));

  const seasonStats = buildStatSet(
    "This Season",
    sortedRounds.filter((round) => round.played_at >= seasonStart)
  );

  const allStats = buildStatSet("All Rounds", sortedRounds);

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
          GHIN #{summary.ghinNumber ?? "-"} • Current Handicap Index{" "}
          <span className="font-bold text-gray-950">
            {formatNumber(summary.handicap)}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <StatSection stat={last20Stats} />
        <StatSection stat={seasonStats} />
        <StatSection stat={allStats} />
      </div>

      <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm md:p-5">
        <h2 className="text-lg font-bold text-gray-950 md:text-xl">
          Goodrich Hole Scoring Breakdown
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