"use client";

import { useMemo } from "react";

type PlayerOption = {
  id: string;
  full_name: string;
  ghin_number: string | null;
  current_index: number | null;
};

type RawRow = {
  player_id: string;
  full_name: string;
  ghin_number: string | null;
  played_at: string;
  tee_name: string | null;
  hole_number: number;
  gross_score: number;
  round_signature?: string | null;
};

type CourseHole = {
  course_name: string;
  tee_name: string;
  hole_number: number;
  par: number;
  handicap: number | null;
  yardage: number | null;
};

type HoleStat = {
  hole_number: number;
  par: number | null;
  handicap: number | null;
  yardage: number | null;
  rounds_played: number;
  avg_score: number | null;
  best_score: number | null;
  worst_score: number | null;
  eagle_or_better_count: number;
  birdie_count: number;
  par_count: number;
  bogey_count: number;
  double_or_worse_count: number;
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

function normalizeTee(value: string | null | undefined) {
  return (value ?? "Unknown").trim();
}

function buildCourseHoleMap(courseHoles: CourseHole[]) {
  const map = new Map<string, CourseHole>();

  courseHoles.forEach((hole) => {
    map.set(`${normalizeTee(hole.tee_name)}|${hole.hole_number}`, hole);
  });

  return map;
}

function expectedScoreForHole(
  par: number | null,
  holeHandicap: number | null,
  playerIndex: number | null
) {
  if (par == null || holeHandicap == null || playerIndex == null) return null;

  const index = Math.max(0, Number(playerIndex));

  const base = index / 18;
  const difficultyAdjustment = ((9.5 - holeHandicap) / 17) * 0.45;

  return par + base + difficultyAdjustment;
}

function avgCellClass(row: HoleStat | undefined, playerIndex: number | null) {
  if (!row || row.avg_score == null) return "w-8 px-1 py-1 text-center";

  const expected = expectedScoreForHole(row.par, row.handicap, playerIndex);
  if (expected == null) return "w-8 px-1 py-1 text-center";

  const avg = Number(row.avg_score);

  if (avg <= expected - 0.15) {
    return "w-8 bg-green-100 px-1 py-1 text-center font-bold text-green-800";
  }

  if (avg >= expected + 0.15) {
    return "w-8 bg-red-100 px-1 py-1 text-center font-bold text-red-800";
  }

  return "w-8 bg-gray-50 px-1 py-1 text-center font-medium text-gray-900";
}

function dedupeRows(rows: RawRow[]) {
  const unique = new Map<string, RawRow>();

  rows.forEach((row) => {
    const key = row.round_signature
      ? `${row.round_signature}|${row.hole_number}`
      : `${row.played_at}|${normalizeTee(row.tee_name)}|${row.hole_number}|${row.gross_score}`;
    unique.set(key, row as any);
  });

  return Array.from(unique.values());
}

function buildStats(
  rows: RawRow[],
  teeName: string,
  courseHoleMap: Map<string, CourseHole>
) {
  const uniqueRows = dedupeRows(rows);
  const byHole = new Map<number, number[]>();

  uniqueRows.forEach((row) => {
    const hole = Number(row.hole_number);
    const score = Number(row.gross_score);

    if (Number.isNaN(hole) || Number.isNaN(score)) return;

    const existing = byHole.get(hole) ?? [];
    existing.push(score);
    byHole.set(hole, existing);
  });

  const stats = new Map<number, HoleStat>();

  for (let hole = 1; hole <= 18; hole++) {
    const scores = byHole.get(hole) ?? [];
    const courseHole = courseHoleMap.get(`${teeName}|${hole}`);
    const par = courseHole?.par ?? null;

    if (!scores.length) {
      stats.set(hole, {
        hole_number: hole,
        par,
        handicap: courseHole?.handicap ?? null,
        yardage: courseHole?.yardage ?? null,
        rounds_played: 0,
        avg_score: null,
        best_score: null,
        worst_score: null,
        eagle_or_better_count: 0,
        birdie_count: 0,
        par_count: 0,
        bogey_count: 0,
        double_or_worse_count: 0,
      });
      continue;
    }

    const total = scores.length;
    const avg = scores.reduce((sum, score) => sum + score, 0) / total;

    stats.set(hole, {
      hole_number: hole,
      par,
      handicap: courseHole?.handicap ?? null,
      yardage: courseHole?.yardage ?? null,
      rounds_played: total,
      avg_score: avg,
      best_score: Math.min(...scores),
      worst_score: Math.max(...scores),
      eagle_or_better_count:
        par == null ? 0 : scores.filter((score) => score <= par - 2).length,
      birdie_count:
        par == null ? 0 : scores.filter((score) => score === par - 1).length,
      par_count:
        par == null ? 0 : scores.filter((score) => score === par).length,
      bogey_count:
        par == null ? 0 : scores.filter((score) => score === par + 1).length,
      double_or_worse_count:
        par == null ? 0 : scores.filter((score) => score >= par + 2).length,
    });
  }

  return stats;
}

function getStat(row: HoleStat | undefined, stat: string) {
  if (!row) return "-";

  if (stat === "par") return row.par ?? "-";
  if (stat === "hcp") return row.handicap ?? "-";
  if (stat === "yards") return row.yardage ?? "-";
  if (stat === "rounds") return row.rounds_played || "-";
  if (stat === "avg") return formatNumber(row.avg_score);
  if (stat === "best") return row.best_score ?? "-";
  if (stat === "worst") return row.worst_score ?? "-";
  if (stat === "eagles") return row.eagle_or_better_count || "-";
  if (stat === "birdies") return row.birdie_count || "-";
  if (stat === "birdieRate") {
    return formatPercent(row.birdie_count, row.rounds_played);
  }
  if (stat === "pars") return row.par_count || "-";
  if (stat === "bogeys") return row.bogey_count || "-";
  if (stat === "double") return row.double_or_worse_count || "-";
  if (stat === "doubleRate") {
    return formatPercent(row.double_or_worse_count, row.rounds_played);
  }

  return "-";
}

function getOutIn(stats: Map<number, HoleStat>, stat: string, holes: number[]) {
  const holeRows = holes
    .map((hole) => stats.get(hole))
    .filter(Boolean) as HoleStat[];

  if (!holeRows.length) return "-";

  if (stat === "par") {
    return holeRows.reduce((sum, row) => sum + Number(row.par ?? 0), 0);
  }

  if (stat === "yards") {
    return holeRows.reduce((sum, row) => sum + Number(row.yardage ?? 0), 0);
  }

  if (stat === "hcp") return "-";

  const playedRows = holeRows.filter((row) => row.rounds_played > 0);

  if (!playedRows.length) return "-";

  if (stat === "avg") {
    const values = playedRows
      .map((row) => Number(row.avg_score))
      .filter((value) => !Number.isNaN(value));

    if (!values.length) return "-";

    return formatNumber(
      values.reduce((sum, value) => sum + value, 0) / values.length
    );
  }

  if (stat === "best") {
    return Math.min(...playedRows.map((row) => Number(row.best_score)));
  }

  if (stat === "worst") {
    return Math.max(...playedRows.map((row) => Number(row.worst_score)));
  }

  if (stat === "rounds") {
    return Math.max(...playedRows.map((row) => Number(row.rounds_played)));
  }

  if (stat === "eagles") {
    const total = playedRows.reduce(
      (sum, row) => sum + Number(row.eagle_or_better_count ?? 0),
      0
    );
    return total || "-";
  }

  if (stat === "birdies") {
    const total = playedRows.reduce(
      (sum, row) => sum + Number(row.birdie_count ?? 0),
      0
    );
    return total || "-";
  }

  if (stat === "pars") {
    const total = playedRows.reduce(
      (sum, row) => sum + Number(row.par_count ?? 0),
      0
    );
    return total || "-";
  }

  if (stat === "bogeys") {
    const total = playedRows.reduce(
      (sum, row) => sum + Number(row.bogey_count ?? 0),
      0
    );
    return total || "-";
  }

  if (stat === "double") {
    const total = playedRows.reduce(
      (sum, row) => sum + Number(row.double_or_worse_count ?? 0),
      0
    );
    return total || "-";
  }

  if (stat === "birdieRate") {
    const birdies = playedRows.reduce(
      (sum, row) => sum + Number(row.birdie_count ?? 0),
      0
    );
    const rounds = playedRows.reduce(
      (sum, row) => sum + Number(row.rounds_played ?? 0),
      0
    );
    return formatPercent(birdies, rounds);
  }

  if (stat === "doubleRate") {
    const doubles = playedRows.reduce(
      (sum, row) => sum + Number(row.double_or_worse_count ?? 0),
      0
    );
    const rounds = playedRows.reduce(
      (sum, row) => sum + Number(row.rounds_played ?? 0),
      0
    );
    return formatPercent(doubles, rounds);
  }

  return "-";
}

function TeeBoxTable({
  teeName,
  rows,
  courseHoleMap,
  playerIndex,
}: {
  teeName: string;
  rows: RawRow[];
  courseHoleMap: Map<string, CourseHole>;
  playerIndex: number | null;
}) {
  const uniqueRows = dedupeRows(rows);
  const stats = buildStats(uniqueRows, teeName, courseHoleMap);

  const frontNine = Array.from({ length: 9 }, (_, index) => index + 1);
  const backNine = Array.from({ length: 9 }, (_, index) => index + 10);
  const allColumns = [...frontNine, "OUT", ...backNine, "IN"];

  const statRows = [
    { key: "par", label: "Par" },
    { key: "hcp", label: "HCP" },
    { key: "yards", label: "Yards" },
    { key: "rounds", label: "Rounds" },
    { key: "avg", label: "Avg" },
    { key: "best", label: "Best" },
    { key: "worst", label: "Worst" },
    { key: "eagles", label: "Eagles+" },
    { key: "birdies", label: "Birdies" },
    { key: "birdieRate", label: "Birdie %" },
    { key: "pars", label: "Pars" },
    { key: "bogeys", label: "Bogeys" },
    { key: "double", label: "Double+" },
    { key: "doubleRate", label: "Double+ %" },
  ];

  function getCellValue(column: number | string, stat: string) {
    if (column === "OUT") return getOutIn(stats, stat, frontNine);
    if (column === "IN") return getOutIn(stats, stat, backNine);
    return getStat(stats.get(column), stat);
  }

  const totalRounds = new Set(
    uniqueRows.map((row) => `${row.played_at}|${normalizeTee(row.tee_name)}|${row.score_type ?? ""}`)
  ).size;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm">
      <div className="border-b border-gray-300 bg-slate-50 px-3 py-2">
        <h2 className="text-base font-bold text-gray-950">
          {teeName} Tee{" "}
          <span className="text-xs font-medium text-gray-600">
            ({totalRounds ? `${totalRounds} round(s)` : "no rounds"})
          </span>
        </h2>
      </div>

      <div className="overflow-x-auto p-2">
        <table className="w-full min-w-[980px] border-collapse text-[10px] text-gray-900">
          <thead className="bg-gray-200 text-gray-950">
            <tr>
              <th className="sticky left-0 z-10 w-24 min-w-24 bg-gray-200 px-1 py-1 text-left font-bold">
                Stat
              </th>

              {allColumns.map((column) => (
                <th
                  key={column}
                  className={
                    column === "OUT" || column === "IN"
                      ? "w-9 bg-gray-300 px-1 py-1 text-center font-bold"
                      : "w-8 px-1 py-1 text-center font-bold"
                  }
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {statRows.map((stat) => (
              <tr key={stat.key} className="border-t border-gray-200">
                <td className="sticky left-0 z-10 w-24 min-w-24 whitespace-nowrap bg-white px-1 py-1 font-semibold">
                  {stat.label}
                </td>

                {allColumns.map((column) => (
                  <td
                    key={`${stat.key}-${column}`}
                    className={
                      stat.key === "avg" && typeof column === "number"
                        ? avgCellClass(stats.get(column), playerIndex)
                        : column === "OUT" || column === "IN"
                          ? "w-9 bg-gray-50 px-1 py-1 text-center font-bold"
                          : "w-8 px-1 py-1 text-center"
                    }
                  >
                    {getCellValue(column, stat.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function HoleStatsTable({
  rows,
  players,
  courseHoles,
  startDate,
  endDate,
  initialPlayerId,
}: {
  rows: RawRow[];
  players: PlayerOption[];
  courseHoles: CourseHole[];
  startDate: string;
  endDate: string;
  initialPlayerId: string;
}) {
  const courseHoleMap = useMemo(
    () => buildCourseHoleMap(courseHoles),
    [courseHoles]
  );

  const selectedPlayer = players.find((player) => player.id === initialPlayerId);

  function handlePlayerChange(playerId: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("player", playerId);
    params.set("start", startDate);
    params.set("end", endDate);

    window.location.href = `/holes?${params.toString()}`;
  }

  const rowsByTee = useMemo(() => {
    const map = new Map<string, RawRow[]>();

    rows.forEach((row) => {
      const tee = normalizeTee(row.tee_name);
      const existing = map.get(tee) ?? [];
      existing.push(row);
      map.set(tee, existing);
    });

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
        <label className="block text-sm font-bold text-gray-700">
          Date Range
        </label>

        <form className="mt-2 flex flex-wrap items-end gap-3">
          <input type="hidden" name="player" value={initialPlayerId} />

          <div>
            <label className="block text-xs font-bold text-gray-600">Start</label>
            <input
              type="date"
              name="start"
              defaultValue={startDate}
              className="mt-1 rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600">End</label>
            <input
              type="date"
              name="end"
              defaultValue={endDate}
              className="mt-1 rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium text-gray-900"
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white"
            style={{ color: "#ffffff" }}
          >
            Apply
          </button>

          <a
            href={initialPlayerId ? `/holes?player=${initialPlayerId}` : "/holes"}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-100"
          >
            Current Year
          </a>
        </form>
      </div>

      <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
        <label className="block text-sm font-bold text-gray-700">
          Select Player
        </label>

        <select
          value={initialPlayerId}
          onChange={(event) => handlePlayerChange(event.target.value)}
          className="mt-2 w-full max-w-md rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium text-gray-900"
        >
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.full_name}
            </option>
          ))}
        </select>

        {selectedPlayer && (
          <p className="mt-2 text-sm font-medium text-gray-700">
            Showing Goodrich hole-by-hole profile for{" "}
            <span className="font-bold text-gray-950">
              {selectedPlayer.full_name}
            </span>{" "}
            from <span className="font-bold">{startDate}</span> to{" "}
            <span className="font-bold">{endDate}</span>.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {rowsByTee.length ? (
          rowsByTee.map(([teeName, teeRows]) => (
            <TeeBoxTable
              key={teeName}
              teeName={teeName}
              rows={teeRows}
              courseHoleMap={courseHoleMap}
              playerIndex={selectedPlayer?.current_index ?? null}
            />
          ))
        ) : (
          <div className="rounded-lg border border-gray-300 bg-white p-6 font-medium text-gray-700 shadow-sm">
            No Goodrich hole-by-hole data found for this player/date range.
          </div>
        )}
      </div>
    </div>
  );
}