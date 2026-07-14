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

type HoveredPoint = {
  point: AuditTrendPoint;
  x: number;
  y: number;
};

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatNumber(value: number | null, decimals = 1) {
  return value == null ? "-" : value.toFixed(decimals);
}

function formatDate(value: string, includeYear = false) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}

function dateToTime(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function buildPath(
  points: AuditTrendPoint[],
  xForDate: (date: string) => number,
  yForValue: (value: number) => number
) {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${xForDate(point.date)} ${yForValue(
          point.differential
        )}`
    )
    .join(" ");
}

export function AuditTrendChart({
  competitionPoints,
  generalPoints,
  currentHandicap,
}: {
  competitionPoints: AuditTrendPoint[];
  generalPoints: AuditTrendPoint[];
  currentHandicap: number | null;
}) {
  const [hovered, setHovered] = useState<HoveredPoint | null>(null);

  const competition = useMemo(
    () =>
      [...competitionPoints].sort(
        (a, b) => dateToTime(a.date) - dateToTime(b.date)
      ),
    [competitionPoints]
  );

  const general = useMemo(
    () =>
      [...generalPoints].sort(
        (a, b) => dateToTime(a.date) - dateToTime(b.date)
      ),
    [generalPoints]
  );

  const allPoints = useMemo(
    () =>
      [...competition, ...general].sort(
        (a, b) => dateToTime(a.date) - dateToTime(b.date)
      ),
    [competition, general]
  );

  const stats = useMemo(() => {
    const competitionAverage = average(
      competition.map((point) => point.differential)
    );

    const generalAverage = average(
      general.map((point) => point.differential)
    );

    return {
      competitionAverage,
      generalAverage,
      gap:
        competitionAverage == null || generalAverage == null
          ? null
          : generalAverage - competitionAverage,
    };
  }, [competition, general]);

  if (!allPoints.length) {
    return (
      <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Competition vs General Play
        </h2>
        <p className="mt-3 text-sm text-gray-600">
          No official handicap rounds are available.
        </p>
      </section>
    );
  }

  const width = 1100;
  const height = 430;
  const padding = { top: 34, right: 34, bottom: 76, left: 64 };

  const timestamps = allPoints.map((point) => dateToTime(point.date));
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const timeRange = Math.max(1, maxTime - minTime);

  const differentialValues = allPoints.map((point) => point.differential);

  if (currentHandicap != null && Number.isFinite(currentHandicap)) {
    differentialValues.push(currentHandicap);
  }

  const rawMin = Math.min(...differentialValues);
  const rawMax = Math.max(...differentialValues);
  const minValue = Math.floor(rawMin - 1);
  const maxValue = Math.ceil(rawMax + 1);
  const valueRange = Math.max(1, maxValue - minValue);

  const xForDate = (date: string) =>
    padding.left +
    ((dateToTime(date) - minTime) / timeRange) *
      (width - padding.left - padding.right);

  const yForValue = (value: number) =>
    padding.top +
    ((maxValue - value) / valueRange) *
      (height - padding.top - padding.bottom);

  const yTicks = Array.from({ length: 6 }, (_, index) => {
    const value = maxValue - (index / 5) * valueRange;
    return Number(value.toFixed(1));
  });

  const uniqueDates = Array.from(
    new Set(allPoints.map((point) => point.date))
  ).sort((a, b) => dateToTime(a) - dateToTime(b));

  const maxDateTicks = 8;
  const dateTickStep = Math.max(1, Math.ceil(uniqueDates.length / maxDateTicks));
  const dateTicks = uniqueDates.filter(
    (_, index) => index % dateTickStep === 0 || index === uniqueDates.length - 1
  );

  const competitionPath = buildPath(competition, xForDate, yForValue);
  const generalPath = buildPath(general, xForDate, yForValue);

  return (
    <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-950">
            Competition vs General Play
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Up to the last 10 rounds from each category plotted on their actual
            calendar dates. Higher differentials are at the top and lower
            differentials are at the bottom.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SummaryChip
            label={`Competition Avg (${competition.length})`}
            value={formatNumber(stats.competitionAverage)}
            className="border-green-200 bg-green-50 text-green-900"
          />
          <SummaryChip
            label={`General Play Avg (${general.length})`}
            value={formatNumber(stats.generalAverage)}
            className="border-gray-300 bg-gray-50 text-gray-900"
          />
          <SummaryChip
            label="General − Competition"
            value={
              stats.gap == null
                ? "-"
                : `${stats.gap >= 0 ? "+" : ""}${stats.gap.toFixed(1)}`
            }
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
          <span className="h-3 w-3 rounded-full bg-gray-500" />
          General Play
        </span>

        {currentHandicap != null && (
          <span className="flex items-center gap-2 text-blue-800">
            <span className="h-0 w-5 border-t-2 border-dashed border-blue-600" />
            Current HI {currentHandicap.toFixed(1)}
          </span>
        )}
      </div>

      {stats.gap != null && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm font-bold ${
            stats.gap > 0
              ? "border-green-200 bg-green-50 text-green-900"
              : stats.gap < 0
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-gray-300 bg-gray-50 text-gray-900"
          }`}
        >
          {stats.gap > 0
            ? `Competition rounds average ${stats.gap.toFixed(
                1
              )} differential strokes lower than general play.`
            : stats.gap < 0
              ? `Competition rounds average ${Math.abs(stats.gap).toFixed(
                  1
                )} differential strokes higher than general play.`
              : "Competition and general-play averages are equal."}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[820px]"
          role="img"
          aria-label="Competition and general play handicap differential trends over calendar time"
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

          {dateTicks.map((date) => {
            const x = xForDate(date);

            return (
              <g key={date}>
                <line
                  x1={x}
                  x2={x}
                  y1={padding.top}
                  y2={height - padding.bottom}
                  stroke="#f3f4f6"
                />
                <text
                  x={x}
                  y={height - 38}
                  textAnchor="middle"
                  className="fill-gray-700 text-[12px]"
                >
                  {formatDate(date)}
                </text>
              </g>
            );
          })}

          {stats.competitionAverage != null &&
            stats.generalAverage != null && (
              <>
                <rect
                  x={padding.left}
                  y={Math.min(
                    yForValue(stats.competitionAverage),
                    yForValue(stats.generalAverage)
                  )}
                  width={width - padding.left - padding.right}
                  height={Math.abs(
                    yForValue(stats.competitionAverage) -
                      yForValue(stats.generalAverage)
                  )}
                  fill={
                    stats.competitionAverage < stats.generalAverage
                      ? "#dcfce7"
                      : "#fee2e2"
                  }
                  opacity="0.45"
                />

                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={yForValue(stats.competitionAverage)}
                  y2={yForValue(stats.competitionAverage)}
                  stroke="#15803d"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />

                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={yForValue(stats.generalAverage)}
                  y2={yForValue(stats.generalAverage)}
                  stroke="#6b7280"
                  strokeWidth="2"
                  strokeDasharray="5 5"
                />

                <text
                  x={padding.left + 8}
                  y={yForValue(stats.competitionAverage) - 7}
                  className="fill-green-800 text-[12px] font-bold"
                >
                  Competition avg {stats.competitionAverage.toFixed(1)}
                </text>

                <text
                  x={padding.left + 8}
                  y={yForValue(stats.generalAverage) - 7}
                  className="fill-gray-700 text-[12px] font-bold"
                >
                  General avg {stats.generalAverage.toFixed(1)}
                </text>
              </>
            )}

          {currentHandicap != null && Number.isFinite(currentHandicap) && (
            <>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={yForValue(currentHandicap)}
                y2={yForValue(currentHandicap)}
                stroke="#2563eb"
                strokeWidth="2"
                strokeDasharray="8 6"
              />
              <text
                x={width - padding.right}
                y={yForValue(currentHandicap) - 8}
                textAnchor="end"
                className="fill-blue-700 text-[12px] font-bold"
              >
                Current HI {currentHandicap.toFixed(1)}
              </text>
            </>
          )}

          {competitionPath && (
            <path
              d={competitionPath}
              fill="none"
              stroke="#15803d"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {generalPath && (
            <path
              d={generalPath}
              fill="none"
              stroke="#6b7280"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {[
            { points: competition, fill: "#15803d" },
            { points: general, fill: "#6b7280" },
          ].flatMap(({ points, fill }) =>
            points.map((point) => {
              const x = xForDate(point.date);
              const y = yForValue(point.differential);
              const isHovered = hovered?.point.id === point.id;

              return (
                <g
                  key={point.id}
                  tabIndex={0}
                  className="cursor-pointer outline-none"
                  onMouseEnter={() => setHovered({ point, x, y })}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered({ point, x, y })}
                  onBlur={() => setHovered(null)}
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 8 : 6}
                    fill={fill}
                    stroke="white"
                    strokeWidth="2"
                  />
                </g>
              );
            })
          )}

          {hovered && (
            <foreignObject
              x={Math.min(width - 270, Math.max(8, hovered.x - 120))}
              y={Math.min(
                height - padding.bottom - 118,
                Math.max(8, hovered.y - 126)
              )}
              width="260"
              height="116"
            >
              <div className="rounded-lg border border-gray-300 bg-white p-3 text-xs shadow-xl">
                <div className="font-bold text-gray-950">
                  {hovered.point.category}
                </div>
                <div className="mt-1 text-gray-700">
                  {formatDate(hovered.point.date, true)}
                </div>
                <div className="mt-1 text-gray-700">
                  {hovered.point.course ?? "Unknown course"}
                </div>
                <div className="mt-2 flex gap-4">
                  <span>
                    Score: <strong>{hovered.point.score ?? "-"}</strong>
                  </span>
                  <span>
                    Diff:{" "}
                    <strong>{hovered.point.differential.toFixed(1)}</strong>
                  </span>
                </div>
              </div>
            </foreignObject>
          )}

          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            className="fill-gray-700 text-[13px] font-semibold"
          >
            Round date
          </text>
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
