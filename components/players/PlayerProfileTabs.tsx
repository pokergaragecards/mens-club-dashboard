"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import type { PlayerGoodrichHoleRanking } from "@/services/holeRankingService";

type RoundRow = {
  id: string;
  played_at: string;
  tee_name: string | null;
  course_name: string | null;
  score_type: string | null;
  gross_score: number | null;
  adjusted_gross_score?: number | null;
  differential: number | null;
};

type HoleRow = {
  teeName: string;
  holeNumber: number;
  par: number;
  handicap: number;
  rounds: number;
  average: number;
  best: number;
  worst: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number;
};

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toFixed(decimals);
}

function formatSlope(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return value.toFixed(Number.isInteger(value) ? 0 : 1);
}

function formatPercent(count: number, total: number) {
  if (!total) return "-";
  return `${Math.round((count / total) * 100)}%`;
}

function scoreTypeLabel(type: string | null | undefined) {
  switch (type) {
    case "H":
      return "Home";
    case "A":
      return "Away";
    case "C":
      return "Competition";
    case "CH":
      return "Competition Home";
    case "CA":
      return "Competition Away";
    case "ECH":
      return "Exceptional Competition Home";
    case "EA":
      return "Exceptional Away";
    case "EH":
      return "Exceptional Home";
    case "NA":
      return "Nine-Hole Away";
    case "NH":
      return "Nine-Hole Home";
    case "NCA":
      return "Nine-Hole Competition Away";
    case "NCH":
      return "Nine-Hole Competition Home";
    default:
      return type ?? "-";
  }
}

function groupByTee(holes: HoleRow[]) {
  const map = new Map<string, HoleRow[]>();

  holes.forEach((hole) => {
    const rows = map.get(hole.teeName) ?? [];
    rows.push(hole);
    map.set(hole.teeName, rows);
  });

  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

const RANKED_TEES = ["Red", "Gold", "White", "Blue"] as const;

function rankedTeeName(value: string) {
  const words = value
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((word) => (word === "yellow" ? "gold" : word));
  const matches = RANKED_TEES.filter((tee) =>
    words.includes(tee.toLowerCase())
  );
  return matches.length === 1 ? matches[0] : null;
}

function signedIndexPoints(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}

function adjustedIndexClass(value: number) {
  if (value >= 120) return "font-black text-red-700";
  if (value > 100) return "font-black text-amber-700";
  if (value <= 80) return "font-black text-green-700";
  return "font-black text-slate-900";
}

export function PlayerProfileTabs({
  rounds,
  seasonHoles,
  thirtyDayHoles,
  goodrichHoleRankings,
  rankingPeriodStart,
  rankingPeriodEnd,
  rankingPriorPerformanceIndex,
}: {
  rounds: RoundRow[];
  seasonHoles: HoleRow[];
  thirtyDayHoles: HoleRow[];
  goodrichHoleRankings: PlayerGoodrichHoleRanking[];
  rankingPeriodStart: string;
  rankingPeriodEnd: string;
  rankingPriorPerformanceIndex: number;
}) {
  const [tab, setTab] = useState<"rounds" | "scorecard">("rounds");
  const [range, setRange] = useState<"season" | "30">("season");

  const holes = range === "30" ? thirtyDayHoles : seasonHoles;

  return (
    <section className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          onClick={() => setTab("rounds")}
          className={`rounded-md px-4 py-2 text-sm font-bold ${
            tab === "rounds"
              ? "bg-slate-950 text-white"
              : "bg-white text-gray-800 ring-1 ring-gray-300"
          }`}
        >
          Handicap Rounds
        </button>

        <button
          type="button"
          onClick={() => setTab("scorecard")}
          className={`rounded-md px-4 py-2 text-sm font-bold ${
            tab === "scorecard"
              ? "bg-slate-950 text-white"
              : "bg-white text-gray-800 ring-1 ring-gray-300"
          }`}
        >
          Goodrich Scorecard
        </button>

        {tab === "scorecard" && (
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={() => setRange("season")}
              className={`rounded-md px-3 py-2 text-xs font-bold ${
                range === "season"
                  ? "bg-blue-700 text-white"
                  : "bg-white text-gray-800 ring-1 ring-gray-300"
              }`}
            >
              Season
            </button>

            <button
              type="button"
              onClick={() => setRange("30")}
              className={`rounded-md px-3 py-2 text-xs font-bold ${
                range === "30"
                  ? "bg-blue-700 text-white"
                  : "bg-white text-gray-800 ring-1 ring-gray-300"
              }`}
            >
              30 Days
            </button>
          </div>
        )}
      </div>

      {tab === "rounds" ? (
        <HandicapRounds rounds={rounds} />
      ) : (
        <Scorecard
          holes={holes}
          range={range}
          goodrichHoleRankings={goodrichHoleRankings}
          rankingPeriodStart={rankingPeriodStart}
          rankingPeriodEnd={rankingPeriodEnd}
          rankingPriorPerformanceIndex={rankingPriorPerformanceIndex}
        />
      )}
    </section>
  );
}

function HandicapRounds({ rounds }: { rounds: RoundRow[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <p className="mb-3 text-sm text-gray-600">
        Showing official GHIN handicap-counting rounds only.
      </p>

      <table className="w-full min-w-[850px] text-sm">
        <thead className="border-b bg-gray-100 text-gray-950">
          <tr>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Course Name</th>
            <th className="p-2 text-left">Score Type</th>
            <th className="p-2 text-left">Tee</th>
            <th className="p-2 text-right">Score</th>
            <th className="p-2 text-right">Differential</th>
          </tr>
        </thead>

        <tbody>
          {rounds.length ? (
            rounds.map((round) => (
              <tr key={round.id} className="border-b hover:bg-blue-50">
                <td className="p-2">{round.played_at}</td>
                <td className="p-2">{round.course_name ?? "-"}</td>
                <td className="p-2">{scoreTypeLabel(round.score_type)}</td>
                <td className="p-2">{round.tee_name ?? "-"}</td>
                <td className="p-2 text-right font-bold">
                  {round.adjusted_gross_score ?? round.gross_score ?? "-"}
                </td>
                <td className="p-2 text-right">
                  {formatNumber(round.differential)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="p-3 text-gray-600" colSpan={6}>
                No handicap-counting rounds imported yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Scorecard({
  holes,
  range,
  goodrichHoleRankings,
  rankingPeriodStart,
  rankingPeriodEnd,
  rankingPriorPerformanceIndex,
}: {
  holes: HoleRow[];
  range: "season" | "30";
  goodrichHoleRankings: PlayerGoodrichHoleRanking[];
  rankingPeriodStart: string;
  rankingPeriodEnd: string;
  rankingPriorPerformanceIndex: number;
}) {
  const rankingByTeeAndHole = useMemo(
    () =>
      new Map(
        goodrichHoleRankings.map((ranking) => [
          `${ranking.tee}|${ranking.holeNumber}`,
          ranking,
        ])
    ),
    [goodrichHoleRankings]
  );
  const displayHoles = useMemo(() => {
    const holesByTeeAndNumber = new Map<string, HoleRow>();

    holes.forEach((hole) => {
      const tee = rankedTeeName(hole.teeName) ?? hole.teeName;
      holesByTeeAndNumber.set(`${tee}|${hole.holeNumber}`, hole);
    });

    goodrichHoleRankings.forEach((ranking) => {
      const key = `${ranking.tee}|${ranking.holeNumber}`;
      if (holesByTeeAndNumber.has(key)) return;

      holesByTeeAndNumber.set(key, {
        teeName: ranking.tee,
        holeNumber: ranking.holeNumber,
        par: ranking.par ?? 0,
        handicap: ranking.strokeIndex ?? 0,
        rounds: 0,
        average: Number.NaN,
        best: 0,
        worst: 0,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubles: 0,
      });
    });

    return Array.from(holesByTeeAndNumber.values());
  }, [goodrichHoleRankings, holes]);
  const byTee = useMemo(() => groupByTee(displayHoles), [displayHoles]);
  const rankingForHole = (hole: HoleRow) => {
    const tee = rankedTeeName(hole.teeName);
    return tee
      ? rankingByTeeAndHole.get(`${tee}|${hole.holeNumber}`)
      : undefined;
  };

  if (!byTee.length) {
    return (
      <div className="mt-4 text-sm text-gray-600">
        No hole data found for{" "}
        {range === "30" ? "the last 30 days" : "this season"}.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <div className="font-black">12-Month Handicap-Adjusted Club Ranking</div>
        <p className="mt-1 leading-relaxed">
          Ranking period: <strong>{rankingPeriodStart}</strong> through{" "}
          <strong>{rankingPeriodEnd}</strong>. The Raw Performance Index comes
          directly from the aggregate average score versus aggregate expected
          score. Expected round score is <strong>Course Rating + Current HI ×
          (Slope Rating ÷ 113)</strong>, and expected hole score is hole par ×
          (expected round ÷ tee par). The conversion is not rounded, and a
          negative index can still expect above par from a tee rated above par.
          The Adjusted Index
          moves that raw value toward the club
          baseline by only 40% of the distance at 0% confidence, 20% at 50%
          confidence, and 0% at 100% confidence. <strong>100
          matches expectation</strong>, lower is better, and higher is worse.
          Confidence is never lower than the golf sample schedule: 3 scores =
          5%, 4 = 15%, 5 = 25%, then +10 percentage points per additional score,
          capped at 100%. The learned club prior is{" "}
          <strong>{rankingPriorPerformanceIndex.toFixed(1)}</strong>. A player
          needs at least three scores on the exact tee and hole. These 12-month
          ranking rows do not change when switching between Season and 30 Days.
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-bold">
          <Link
            href="/holes/rankings?view=best"
            className="text-blue-800 hover:underline"
          >
            View Best by Hole
          </Link>
          <Link
            href="/holes/rankings?view=worst"
            className="text-blue-800 hover:underline"
          >
            View Worst by Hole
          </Link>
        </div>
      </div>

      {byTee.map(([teeName, rows]) => {
        const normalizedTee = rankedTeeName(teeName);
        const teeRanking = goodrichHoleRankings.find(
          (ranking) => ranking.tee === normalizedTee
        );

        return (
          <div
            key={teeName}
            className="overflow-x-auto rounded-lg border border-gray-300"
          >
            <div className="border-b bg-gray-50 px-3 py-2 font-bold">
              {teeName} Tee · {range === "30" ? "Last 30 Days" : "Season"}
              {teeRanking ? (
                <span className="ml-3 text-gray-600">
                  Tee par {formatNumber(teeRanking.teePar, 0)} · Course Rating{" "}
                  {formatNumber(teeRanking.courseRating, 1)} · Slope Rating{" "}
                  {formatSlope(teeRanking.slopeRating)}
                </span>
              ) : null}
            </div>

            <table className="w-full min-w-[1320px] text-xs">
              <tbody>
              <ScorecardRow
                label="Hole"
                rows={rows}
                value={(h) => h.holeNumber}
              />
              <ScorecardRow label="Par" rows={rows} value={(h) => h.par} />
              <ScorecardRow
                label="HCP"
                rows={rows}
                value={(h) => h.handicap}
              />
              <ScorecardRow
                label="Rounds"
                rows={rows}
                value={(h) => h.rounds || "-"}
              />
              <ScorecardRow
                label="Avg"
                rows={rows}
                value={(h) => formatNumber(h.average)}
                bold
              />
              <ScorecardRow
                label="Birdie %"
                rows={rows}
                value={(h) => formatPercent(h.birdies, h.rounds)}
              />
              <ScorecardRow
                label="Par %"
                rows={rows}
                value={(h) => formatPercent(h.pars, h.rounds)}
              />
              <ScorecardRow
                label="Bogey %"
                rows={rows}
                value={(h) => formatPercent(h.bogeys, h.rounds)}
              />
              <ScorecardRow
                label="Double+ %"
                rows={rows}
                value={(h) => formatPercent(h.doubles, h.rounds)}
              />
              <ScorecardRow
                label="12M Scores"
                rows={rows}
                value={(hole) => rankingForHole(hole)?.scoreCount ?? "-"}
                sectionStart
              />
              <ScorecardRow
                label="12M Avg Score"
                rows={rows}
                value={(hole) =>
                  formatNumber(rankingForHole(hole)?.averageGrossScore, 2)
                }
              />
              <ScorecardRow
                label="12M Expected"
                rows={rows}
                value={(hole) =>
                  formatNumber(rankingForHole(hole)?.averageExpectedScore, 2)
                }
              />
              <ScorecardRow
                label="12M vs Expected"
                rows={rows}
                value={(hole) => {
                  const ranking = rankingForHole(hole);
                  return ranking
                    ? `${ranking.averageVsExpected > 0 ? "+" : ""}${ranking.averageVsExpected.toFixed(2)}`
                    : "-";
                }}
              />
              <ScorecardRow
                label="Raw Index"
                rows={rows}
                value={(hole) => {
                  const ranking = rankingForHole(hole);
                  return ranking?.rawPerformanceIndex !== null &&
                    ranking?.rawPerformanceIndex !== undefined ? (
                    <span
                      className={adjustedIndexClass(
                        ranking.rawPerformanceIndex
                      )}
                    >
                      {ranking.rawPerformanceIndex.toFixed(1)}
                    </span>
                  ) : (
                    "-"
                  );
                }}
                bold
              />
              <ScorecardRow
                label="Adjusted Index"
                rows={rows}
                value={(hole) => {
                  const ranking = rankingForHole(hole);
                  return ranking ? (
                    <span
                      className={adjustedIndexClass(
                        ranking.adjustedPerformanceIndex
                      )}
                    >
                      {ranking.adjustedPerformanceIndex.toFixed(1)}
                    </span>
                  ) : (
                    "-"
                  );
                }}
                bold
              />
              <ScorecardRow
                label="Confidence"
                rows={rows}
                value={(hole) => {
                  const ranking = rankingForHole(hole);
                  return ranking
                    ? `${ranking.performanceConfidence} ${Math.round(
                        ranking.performanceReliability * 100
                      )}%`
                    : "-";
                }}
              />
              <ScorecardRow
                label="Worst Rank"
                rows={rows}
                value={(hole) => {
                  const ranking = rankingForHole(hole);
                  return ranking
                    ? `#${ranking.worstRank}/${ranking.qualifyingPlayers}`
                    : "-";
                }}
              />
              <ScorecardRow
                label="Best Rank"
                rows={rows}
                value={(hole) => {
                  const ranking = rankingForHole(hole);
                  return ranking
                    ? `#${ranking.bestRank}/${ranking.qualifyingPlayers}`
                    : "-";
                }}
              />
              <ScorecardRow
                label="Vs Club Index"
                rows={rows}
                value={(hole) => {
                  const ranking = rankingForHole(hole);
                  return ranking
                    ? signedIndexPoints(ranking.vsClubIndex)
                    : "-";
                }}
              />
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function ScorecardRow({
  label,
  rows,
  value,
  bold = false,
  sectionStart = false,
}: {
  label: string;
  rows: HoleRow[];
  value: (hole: HoleRow) => ReactNode;
  bold?: boolean;
  sectionStart?: boolean;
}) {
  const ordered = [...rows].sort((a, b) => a.holeNumber - b.holeNumber);

  return (
    <tr
      className={`border-b last:border-b-0 ${
        sectionStart ? "border-t-4 border-t-blue-200 bg-blue-50/40" : ""
      }`}
    >
      <td
        className={`sticky left-0 p-2 font-bold ${
          sectionStart ? "bg-blue-50" : "bg-white"
        }`}
      >
        {label}
      </td>
      {ordered.map((hole) => (
        <td
          key={`${label}-${hole.holeNumber}`}
          className={`p-2 text-center ${bold ? "font-bold" : ""}`}
        >
          {value(hole)}
        </td>
      ))}
    </tr>
  );
}
