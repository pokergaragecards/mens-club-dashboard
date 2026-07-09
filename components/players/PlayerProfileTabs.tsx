"use client";

import { useMemo, useState } from "react";

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

export function PlayerProfileTabs({
  rounds,
  seasonHoles,
  thirtyDayHoles,
}: {
  rounds: RoundRow[];
  seasonHoles: HoleRow[];
  thirtyDayHoles: HoleRow[];
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
          Recent Rounds
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
        <RecentRounds rounds={rounds} />
      ) : (
        <Scorecard holes={holes} range={range} />
      )}
    </section>
  );
}

function RecentRounds({ rounds }: { rounds: RoundRow[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
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
                No rounds imported yet.
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
}: {
  holes: HoleRow[];
  range: "season" | "30";
}) {
  const byTee = useMemo(() => groupByTee(holes), [holes]);

  if (!byTee.length) {
    return (
      <div className="mt-4 text-sm text-gray-600">
        No hole data found for {range === "30" ? "the last 30 days" : "this season"}.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {byTee.map(([teeName, rows]) => (
        <div key={teeName} className="overflow-x-auto rounded-lg border border-gray-300">
          <div className="border-b bg-gray-50 px-3 py-2 font-bold">
            {teeName} Tee · {range === "30" ? "Last 30 Days" : "Season"}
          </div>

          <table className="w-full min-w-[1100px] text-xs">
            <tbody>
              <ScorecardRow label="Hole" rows={rows} value={(h) => h.holeNumber} />
              <ScorecardRow label="Par" rows={rows} value={(h) => h.par} />
              <ScorecardRow label="HCP" rows={rows} value={(h) => h.handicap} />
              <ScorecardRow label="Rounds" rows={rows} value={(h) => h.rounds} />
              <ScorecardRow label="Avg" rows={rows} value={(h) => formatNumber(h.average)} bold />
              <ScorecardRow label="Birdie %" rows={rows} value={(h) => formatPercent(h.birdies, h.rounds)} />
              <ScorecardRow label="Par %" rows={rows} value={(h) => formatPercent(h.pars, h.rounds)} />
              <ScorecardRow label="Bogey %" rows={rows} value={(h) => formatPercent(h.bogeys, h.rounds)} />
              <ScorecardRow label="Double+ %" rows={rows} value={(h) => formatPercent(h.doubles, h.rounds)} />
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function ScorecardRow({
  label,
  rows,
  value,
  bold = false,
}: {
  label: string;
  rows: HoleRow[];
  value: (hole: HoleRow) => string | number;
  bold?: boolean;
}) {
  const ordered = [...rows].sort((a, b) => a.holeNumber - b.holeNumber);

  return (
    <tr className="border-b last:border-b-0">
      <td className="sticky left-0 bg-white p-2 font-bold">{label}</td>
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