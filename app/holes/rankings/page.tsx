import Link from "next/link";

import { ExportHoleRankingsPdfButton } from "@/components/holes/ExportHoleRankingsPdfButton";
import {
  GOODRICH_TEE_COLORS,
  getGoodrichHoleRankingReport,
  type GoodrichTeeColor,
} from "@/services/holeRankingService";

type PageProps = {
  searchParams?: Promise<{ tee?: string; hole?: string }>;
};

const TEE_CLASSES: Record<GoodrichTeeColor, { active: string; idle: string }> = {
  Red: {
    active: "border-red-700 bg-red-700 text-white",
    idle: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100",
  },
  Yellow: {
    active: "border-amber-500 bg-amber-400 text-slate-950",
    idle: "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100",
  },
  White: {
    active: "border-slate-700 bg-white text-slate-950 ring-2 ring-slate-700",
    idle: "border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
  },
  Blue: {
    active: "border-blue-700 bg-blue-700 text-white",
    idle: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
  },
};

function selectedTee(value: string | undefined): GoodrichTeeColor {
  return (
    GOODRICH_TEE_COLORS.find(
      (tee) => tee.toLowerCase() === value?.toLowerCase()
    ) ?? "Red"
  );
}

function selectedHole(value: string | undefined) {
  const hole = Number(value);
  return Number.isInteger(hole) && hole >= 1 && hole <= 18 ? hole : 1;
}

function signed(value: number | null, decimals = 2) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(decimals)}`;
}

function multiplier(value: number | null, decimals = 3) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(decimals)}x`;
}

function signedPercent(value: number | null, decimals = 1) {
  if (value === null || !Number.isFinite(value)) return "-";
  const percentage = value * 100;
  return `${percentage > 0 ? "+" : ""}${percentage.toFixed(decimals)}%`;
}

function performanceClass(value: number) {
  if (value >= 1.2) return "bg-red-100 text-red-900";
  if (value > 1) return "bg-amber-50 text-amber-900";
  if (value <= 0.85) return "bg-green-100 text-green-900";
  return "bg-slate-50 text-slate-900";
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  if (value % 10 === 1) return `${value}st`;
  if (value % 10 === 2) return `${value}nd`;
  if (value % 10 === 3) return `${value}rd`;
  return `${value}th`;
}

export default async function HoleRankingsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const tee = selectedTee(params.tee);
  const holeNumber = selectedHole(params.hole);
  const report = await getGoodrichHoleRankingReport();
  const teeReport = report.tees.find((item) => item.tee === tee) ?? report.tees[0];
  const hole = teeReport.holes.find((item) => item.holeNumber === holeNumber)!;

  return (
    <main className="space-y-6 p-4 text-base text-slate-900 lg:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-slate-950">
              Goodrich Handicap-Adjusted Hole Rankings
            </h1>
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-black text-red-800">
              Worst performance ranks first
            </span>
          </div>
          <p className="mt-2 max-w-4xl text-lg text-slate-600">
            Red, Yellow, White, and Blue tees are compared separately. Every
            score is measured against the number of handicap strokes the player
            was expected to receive on that hole.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <ExportHoleRankingsPdfButton />
          <Link
            href="/holes"
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Player Hole Stats
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h2 className="font-black text-blue-950">How the comparison works</h2>
        <p className="mt-1 leading-relaxed text-blue-950">
          <strong>
            Expected score = hole par × ((tee par + Course Handicap) / tee par).
          </strong>{" "}
          The handicap allowance is spread continuously across all 18 holes in
          proportion to par. On a par-70 tee, a 17 Course Handicap produces a
          1.243 round factor: expected scores are 3.73 on a par 3, 4.97 on a par
          4, and 6.21 on a par 5, adding up to 87 for the round. Stroke index is
          shown as course information but does not affect this calculation.{" "}
          The primary ranking value is the <strong>Performance Multiplier =
          Average Gross / Expected Average</strong>. A value of 1.00x matches
          expectation, 1.10x is 10% worse, and 0.90x is 10% better. The raw
          stroke difference remains visible as supporting detail. A player must
          have at least{" "}
          <strong>{report.minimumScores} scores on the exact tee and hole</strong>.
          The club average gives every qualifying player equal weight so a
          player with more imported rounds cannot dominate the benchmark.
        </p>
      </section>

      <nav aria-label="Tee selection" className="flex flex-wrap gap-3">
        {GOODRICH_TEE_COLORS.map((option) => (
          <Link
            key={option}
            href={`/holes/rankings?tee=${option}&hole=${holeNumber}`}
            className={`min-w-24 rounded-lg border px-5 py-3 text-center text-lg font-black transition-colors ${
              option === tee ? TEE_CLASSES[option].active : TEE_CLASSES[option].idle
            }`}
          >
            {option}
          </Link>
        ))}
      </nav>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-black">Worst player by hole - {tee} tees</h2>
            <p className="text-slate-600">Select a hole to see the complete club ranking.</p>
          </div>
          <div className="text-sm font-bold text-slate-500">
            All available imported Goodrich rounds
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 xl:grid-cols-9">
          {teeReport.holes.map((item) => {
            const worst = item.players[0];
            const active = item.holeNumber === holeNumber;

            return (
              <Link
                key={item.holeNumber}
                href={`/holes/rankings?tee=${tee}&hole=${item.holeNumber}`}
                className={`rounded-xl border p-3 shadow-sm transition-colors ${
                  active
                    ? "border-red-600 bg-red-50 ring-2 ring-red-600"
                    : "border-slate-200 bg-white hover:border-red-300 hover:bg-red-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black">Hole {item.holeNumber}</span>
                  <span className="text-xs font-bold text-slate-500">
                    {item.players.length} ranked
                  </span>
                </div>
                {worst ? (
                  <>
                    <div className="mt-3 truncate font-black text-red-800">
                      {worst.playerName}
                    </div>
                    <div className="mt-1 text-2xl font-black text-red-700">
                      {multiplier(worst.performanceMultiplier, 2)}
                    </div>
                    <div className="text-xs font-bold text-slate-500">
                      of expected score
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-sm font-semibold text-slate-500">
                    No qualifying players
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-300 bg-slate-100 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">
              {tee} tees - Hole {hole.holeNumber}
            </h2>
            <p className="mt-1 font-semibold text-slate-600">
              Par {hole.par ?? "-"} | Stroke index {hole.strokeIndex ?? "-"} |{" "}
              {hole.yardage ? `${hole.yardage} yards` : "Yardage unavailable"}
            </p>
          </div>
          <div className="text-base font-black text-red-700">
            Club average multiplier: {multiplier(hole.clubAverageMultiplier)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1220px] text-left">
            <thead className="border-b border-slate-300 bg-slate-900 text-white">
              <tr>
                <th className="p-3 text-center">Worst Rank</th>
                <th className="p-3">Player</th>
                <th className="p-3 text-right">Scores</th>
                <th className="p-3 text-right">Avg Gross</th>
                <th className="p-3 text-right">Expected Avg</th>
                <th className="p-3 text-right">Performance Multiplier</th>
                <th className="p-3 text-right">Raw Avg vs Handicap</th>
                <th className="p-3 text-right">Above Club Multiplier</th>
                <th className="p-3 text-right">Worst Percentile</th>
              </tr>
            </thead>
            <tbody>
              {hole.players.map((player) => (
                <tr
                  key={player.playerId}
                  className="border-b border-slate-200 last:border-b-0 hover:bg-blue-50"
                >
                  <td className="p-3 text-center text-2xl font-black">
                    #{player.rank}
                    <span className="ml-1 text-sm text-slate-500">
                      / {player.qualifyingPlayers}
                    </span>
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/players/${player.playerId}`}
                      className="text-xl font-black text-blue-800 hover:underline"
                    >
                      {player.playerName}
                    </Link>
                  </td>
                  <td className="p-3 text-right text-lg font-bold">
                    {player.scoreCount}
                  </td>
                  <td className="p-3 text-right text-lg font-bold">
                    {player.averageGrossScore.toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-lg font-bold">
                    {player.averageExpectedScore.toFixed(2)}
                  </td>
                  <td
                    className={`p-3 text-right text-2xl font-black ${performanceClass(
                      player.performanceMultiplier
                    )}`}
                  >
                    {multiplier(player.performanceMultiplier)}
                  </td>
                  <td className="p-3 text-right text-lg font-black">
                    {signed(player.averageVsHandicap)}
                  </td>
                  <td className="p-3 text-right text-lg font-black">
                    {signedPercent(player.vsClubMultiplier)}
                  </td>
                  <td className="p-3 text-right text-lg font-black">
                    {ordinal(Math.round(player.worstPercentile))}
                  </td>
                </tr>
              ))}
              {!hole.players.length && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-lg font-bold text-slate-500">
                    No active player has three qualifying {tee}-tee scores on
                    this hole yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
        This is a relative club performance screen, not an automatic handicap
        adjustment. It does not change any player&apos;s official GHIN Handicap Index.
      </p>
    </main>
  );
}
