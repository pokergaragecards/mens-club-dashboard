"use client";

import { useMemo, useState } from "react";

export type AuditTrendPoint = {
  id: string;
  date: string;
  course: string | null;
  score: number | null;
  differential: number;
  category: "Competition" | "General Play";
};

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatNumber(value: number | null, decimals = 1) {
  return value == null ? "-" : value.toFixed(decimals);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AuditTrendChart({ points }: { points: AuditTrendPoint[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const competition = points
      .filter((point) => point.category === "Competition")
      .map((point) => point.differential);

    const general = points
      .filter((point) => point.category === "General Play")
      .map((point) => point.differential);

    const competitionAverage = average(competition);
    const generalAverage = average(general);

    return {
      competitionAverage,
      generalAverage,
      gap:
        competitionAverage == null || generalAverage == null
          ? null
          : generalAverage - competitionAverage,
    };
  }, [points]);

  if (!points.length) {
    return (
      <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Last 10 Handicap Rounds
        </h2>
        <p className="mt-3 text-sm text-gray-600">
          No official handicap rounds are available.
        </p>
      </section>
    );
  }

  const width = 960;
  const height = 360;
  const padding = { top: 24, right: 28, bottom: 54, left: 54 };

  const values = points.map((point) => point.differential);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minValue = Math.floor(rawMin - 1);
  const maxValue = Math.ceil(rawMax + 1);
  const range = Math.max(1, maxValue - minValue);

  const xForIndex = (index: number) => {
    if (points.length === 1) return width / 2;
    return (
      padding.left +
      (index / (points.length - 1)) *
        (width - padding.left - padding.right)
    );
  };

  const yForValue = (value: number) =>
    padding.top +
    ((maxValue - value) / range) *
      (height - padding.top - padding.bottom);

  const tickCount = 5;
  const yTicks = Array.from({ length: tickCount }, (_, index) => {
    const value = maxValue - (index / (tickCount - 1)) * range;
    return Number(value.toFixed(1));
  });

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForIndex(index)} ${yForValue(
          point.differential
        )}`
    )
    .join(" ");

  return (
    <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-950">
            Last 10 Handicap Rounds
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Oldest round is on the left. Lower differentials are better.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SummaryChip
            label="Competition Avg"
            value={formatNumber(stats.competitionAverage)}
            className="border-green-200 bg-green-50 text-green-900"
          />
          <SummaryChip
            label="General Play Avg"
            value={formatNumber(stats.generalAverage)}
            className="border-gray-300 bg-gray-50 text-gray-900"
          />
          <SummaryChip
            label="General − Competition"
            value={stats.gap == null ? "-" : `${stats.gap >= 0 ? "+" : ""}${stats.gap.toFixed(1)}`}
            className="border-blue-200 bg-blue-50 text-blue-900"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-5 text-sm font-semibold">
        <span className="flex items-center gap-2 text-green-800">
          <span className="h-3 w-3 rounded-full bg-green-600" />
          Competition
        </span>
        <span className="flex items-center gap-2 text-gray-800">
          <span className="h-3 w-3 rounded-full bg-gray-900" />
          General Play
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[760px] w-full"
          role="img"
          aria-label="Last 10 competition and general play handicap differentials"
        >
          {yTicks.map((tick) => {
            const y = yForValue(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#d1d5db"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-gray-600 text-[12px]"
                >
                  {tick.toFixed(1)}
                </text>
              </g>
            );
          })}

          <path
            d={linePath}
            fill="none"
            stroke="#9ca3af"
            strokeWidth="2"
          />

          {points.map((point, index) => {
            const x = xForIndex(index);
            const y = yForValue(point.differential);
            const isCompetition = point.category === "Competition";
            const isHovered = hoveredId === point.id;

            return (
              <g
                key={point.id}
                onMouseEnter={() => setHoveredId(point.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(point.id)}
                onBlur={() => setHoveredId(null)}
                tabIndex={0}
                className="cursor-pointer outline-none"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 8 : 6}
                  fill={isCompetition ? "#15803d" : "#111827"}
                  stroke="white"
                  strokeWidth="2"
                />

                <text
                  x={x}
                  y={height - 26}
                  textAnchor="middle"
                  className="fill-gray-700 text-[12px]"
                >
                  {formatDate(point.date)}
                </text>

                {isHovered && (
                  <foreignObject
                    x={Math.min(width - 250, Math.max(6, x - 110))}
                    y={Math.max(8, y - 112)}
                    width="240"
                    height="98"
                  >
                    <div className="rounded-lg border border-gray-300 bg-white p-3 text-xs shadow-lg">
                      <div className="font-bold text-gray-950">
                        {formatDate(point.date)} · {point.category}
                      </div>
                      <div className="mt-1 text-gray-700">
                        {point.course ?? "Unknown course"}
                      </div>
                      <div className="mt-1 flex gap-4">
                        <span>
                          Score: <strong>{point.score ?? "-"}</strong>
                        </span>
                        <span>
                          Diff: <strong>{point.differential.toFixed(1)}</strong>
                        </span>
                      </div>
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

function SummaryChip({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${className}`}>
      <div className="text-xs font-bold">{label}</div>
      <div className="mt-0.5 text-xl font-black">{value}</div>
    </div>
  );
}