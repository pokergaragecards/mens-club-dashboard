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
  score_type?: string | null;
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
  hole: number;
  par: number | null;
  handicap: number | null;
  yardage: number | null;
  rounds: number;
  average: number | null;
  best: number | null;
  worst: number | null;
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number;
};

type Props = {
  rows: RawRow[];
  players: PlayerOption[];
  courseHoles: CourseHole[];
  startDate: string;
  endDate: string;
  initialPlayerId: string;
};

function normalizeTee(value: string | null | undefined) {
  return (value ?? "Unknown").trim();
}

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  return n.toFixed(decimals);
}

function formatPercent(count: number, total: number) {
  if (!total) return "-";
  return `${Math.round((count / total) * 100)}%`;
}

function dedupeRows(rows: RawRow[]) {
  const map = new Map<string, RawRow>();

  for (const row of rows) {
    const key = row.round_signature
      ? `${row.round_signature}|${row.hole_number}`
      : `${row.played_at}|${normalizeTee(row.tee_name)}|${row.score_type ?? ""}|${row.hole_number}|${row.gross_score}`;

    map.set(key, row);
  }

  return Array.from(map.values());
}

function buildCourseMap(courseHoles: CourseHole[]) {
  const map = new Map<string, CourseHole>();

  for (const hole of courseHoles) {
    map.set(`${normalizeTee(hole.tee_name)}|${hole.hole_number}`, hole);
  }

  return map;
}

function buildHoleStats(
  rows: RawRow[],
  teeName: string,
  courseMap: Map<string, CourseHole>
): HoleStat[] {
  const byHole = new Map<number, number[]>();

  for (const row of dedupeRows(rows)) {
    const hole = Number(row.hole_number);
    const score = Number(row.gross_score);

    if (!Number.isFinite(hole) || !Number.isFinite(score)) continue;

    const scores = byHole.get(hole) ?? [];
    scores.push(score);
    byHole.set(hole, scores);
  }

  return Array.from({ length: 18 }, (_, index) => {
    const hole = index + 1;
    const scores = byHole.get(hole) ?? [];
    const courseHole = courseMap.get(`${teeName}|${hole}`);
    const par = courseHole?.par ?? null;

    if (!scores.length) {
      return {
        hole,
        par,
        handicap: courseHole?.handicap ?? null,
        yardage: courseHole?.yardage ?? null,
        rounds: 0,
        average: null,
        best: null,
        worst: null,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubles: 0,
      };
    }

    const average =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;

    return {
      hole,
      par,
      handicap: courseHole?.handicap ?? null,
      yardage: courseHole?.yardage ?? null,
      rounds: scores.length,
      average,
      best: Math.min(...scores),
      worst: Math.max(...scores),
      birdies: par == null ? 0 : scores.filter((s) => s <= par - 1).length,
      pars: par == null ? 0 : scores.filter((s) => s === par).length,
      bogeys: par == null ? 0 : scores.filter((s) => s === par + 1).length,
      doubles: par == null ? 0 : scores.filter((s) => s >= par + 2).length,
    };
  });
}

function getTeeRoundCount(rows: RawRow[]) {
  return new Set(
    dedupeRows(rows).map(
      (row) =>
        `${row.played_at}|${normalizeTee(row.tee_name)}|${row.score_type ?? ""}|${row.round_signature ?? ""}`
    )
  ).size;
}

function TeeSection({
  teeName,
  rows,
  courseMap,
}: {
  teeName: string;
  rows: RawRow[];
  courseMap: Map<string, CourseHole>;
}) {
  const stats = buildHoleStats(rows, teeName, courseMap);
  const roundCount = getTeeRoundCount(rows);

  return (
    <section className="rounded-xl border border-gray-300 bg-white shadow-sm">
      <div className="border-b border-gray-300 bg-slate-50 px-4 py-3">
        <h2 className="text-lg font-bold text-gray-950">
          {teeName} Tee{" "}
          <span className="text-sm font-medium text-gray-600">
            ({roundCount} round{roundCount === 1 ? "" : "s"})
          </span>
        </h2>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {stats.map((hole) => (
          <MobileHoleCard key={hole.hole} hole={hole} />
        ))}
      </div>

      <div className="hidden overflow-x-auto p-3 md:block">
        <DesktopHoleTable stats={stats} />
      </div>
    </section>
  );
}

function MobileHoleCard({ hole }: { hole: HoleStat }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-950">Hole {hole.hole}</h3>
          <p className="mt-1 text-sm font-medium text-gray-600">
            Par {hole.par ?? "-"} · {hole.yardage ?? "-"} yds · HCP{" "}
            {hole.handicap ?? "-"}
          </p>
        </div>

        <div className="text-right">
          <div className="text-xs font-bold text-gray-500">Avg</div>
          <div className="text-3xl font-bold text-gray-950">
            {formatNumber(hole.average)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MobileStat label="Rounds" value={hole.rounds || "-"} />
        <MobileStat label="Best" value={hole.best ?? "-"} />
        <MobileStat label="Birdie %" value={formatPercent(hole.birdies, hole.rounds)} tone="green" />
        <MobileStat label="Par %" value={formatPercent(hole.pars, hole.rounds)} />
        <MobileStat label="Bogey %" value={formatPercent(hole.bogeys, hole.rounds)} tone="yellow" />
        <MobileStat label="Double+ %" value={formatPercent(hole.doubles, hole.rounds)} tone="red" />
      </div>
    </div>
  );
}

function MobileStat({
  label,
  value,
  tone = "gray",
}: {
  label: string;
  value: string | number;
  tone?: "gray" | "green" | "yellow" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "bg-green-50"
      : tone === "yellow"
        ? "bg-yellow-50"
        : tone === "red"
          ? "bg-red-50"
          : "bg-gray-50";

  return (
    <div className={`rounded-lg p-3 ${toneClass}`}>
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-gray-950">{value}</div>
    </div>
  );
}

function DesktopHoleTable({ stats }: { stats: HoleStat[] }) {
  const rows = [
    { label: "Par", value: (h: HoleStat) => h.par ?? "-" },
    { label: "HCP", value: (h: HoleStat) => h.handicap ?? "-" },
    { label: "Yards", value: (h: HoleStat) => h.yardage ?? "-" },
    { label: "Rounds", value: (h: HoleStat) => h.rounds || "-" },
    { label: "Avg", value: (h: HoleStat) => formatNumber(h.average) },
    { label: "Best", value: (h: HoleStat) => h.best ?? "-" },
    { label: "Worst", value: (h: HoleStat) => h.worst ?? "-" },
    { label: "Birdie %", value: (h: HoleStat) => formatPercent(h.birdies, h.rounds) },
    { label: "Par %", value: (h: HoleStat) => formatPercent(h.pars, h.rounds) },
    { label: "Bogey %", value: (h: HoleStat) => formatPercent(h.bogeys, h.rounds) },
    { label: "Double+ %", value: (h: HoleStat) => formatPercent(h.doubles, h.rounds) },
  ];

  return (
    <table className="w-full min-w-[900px] border-collapse text-xs text-gray-900">
      <thead className="bg-gray-200 text-gray-950">
        <tr>
          <th className="sticky left-0 z-10 w-28 bg-gray-200 px-2 py-2 text-left font-bold">
            Stat
          </th>
          {stats.map((hole) => (
            <th key={hole.hole} className="px-2 py-2 text-center font-bold">
              {hole.hole}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-t border-gray-200">
            <td className="sticky left-0 z-10 bg-white px-2 py-2 font-bold">
              {row.label}
            </td>
            {stats.map((hole) => (
              <td key={`${row.label}-${hole.hole}`} className="px-2 py-2 text-center">
                {row.value(hole)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function HoleStatsTable({
  rows,
  players,
  courseHoles,
  startDate,
  endDate,
  initialPlayerId,
}: Props) {
  const courseMap = useMemo(() => buildCourseMap(courseHoles), [courseHoles]);

  const selectedPlayer = players.find((p) => p.id === initialPlayerId);

  const rowsByTee = useMemo(() => {
    const map = new Map<string, RawRow[]>();

    for (const row of rows) {
      const tee = normalizeTee(row.tee_name);
      const existing = map.get(tee) ?? [];
      existing.push(row);
      map.set(tee, existing);
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  function handlePlayerChange(playerId: string) {
    const params = new URLSearchParams(window.location.search);
    params.set("player", playerId);
    params.set("start", startDate);
    params.set("end", endDate);

    window.location.href = `/holes?${params.toString()}`;
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <input type="hidden" name="player" value={initialPlayerId} />

          <div>
            <label className="block text-xs font-bold text-gray-600">Start</label>
            <input
              type="date"
              name="start"
              defaultValue={startDate}
              className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600">End</label>
            <input
              type="date"
              name="end"
              defaultValue={endDate}
              className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium text-gray-900"
            />
          </div>

          <button
            type="submit"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white"
          >
            Apply
          </button>

          <a
            href={initialPlayerId ? `/holes?player=${initialPlayerId}` : "/holes"}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-bold text-gray-800 hover:bg-gray-100"
          >
            Current Year
          </a>
        </form>
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <label className="block text-sm font-bold text-gray-700">
          Select Player
        </label>

        <select
          value={initialPlayerId}
          onChange={(event) => handlePlayerChange(event.target.value)}
          className="mt-2 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium text-gray-900 md:max-w-md"
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

      {rowsByTee.length ? (
        <div className="grid grid-cols-1 gap-4">
          {rowsByTee.map(([teeName, teeRows]) => (
            <TeeSection
              key={teeName}
              teeName={teeName}
              rows={teeRows}
              courseMap={courseMap}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-300 bg-white p-6 font-medium text-gray-700 shadow-sm">
          No Goodrich hole-by-hole data found for this player/date range.
        </div>
      )}
    </div>
  );
}