"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type HandicapHistoryPoint = {
  date: string;
  handicapIndex: number;
};

function dateValue(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTick(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

export function HandicapHistoryChart({
  points,
  currentHandicap,
}: {
  points: HandicapHistoryPoint[];
  currentHandicap: number | null;
}) {
  const [range, setRange] = useState<"season" | "year" | "all">("year");

  const sorted = useMemo(
    () => [...points].sort((a, b) => dateValue(a.date) - dateValue(b.date)),
    [points]
  );

  const filtered = useMemo(() => {
    if (range === "all" || !sorted.length) return sorted;

    const latest = new Date(`${sorted[sorted.length - 1].date}T00:00:00`);
    const cutoff = new Date(latest);

    if (range === "season") cutoff.setMonth(0, 1);
    else cutoff.setFullYear(cutoff.getFullYear() - 1);

    return sorted.filter((point) => dateValue(point.date) >= cutoff.getTime());
  }, [range, sorted]);

  if (!sorted.length) {
    return (
      <section className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">Handicap Index History</h2>
        <p className="mt-2 text-sm text-gray-600">
          Historical Handicap Index values will appear after Scores Posted data is imported.
        </p>
      </section>
    );
  }

  const values = filtered.map((point) => point.handicapIndex);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max(1, (maximum - minimum) * 0.18);

  return (
    <section
      className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm md:p-5"
      data-testid="handicap-history-chart"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-950">Handicap Index History</h2>
          <p className="mt-1 text-sm text-gray-600">
            GHIN Handicap Index recorded when each score was posted.
          </p>
        </div>

        <div className="flex rounded-lg border border-gray-300 p-1" aria-label="Handicap history range">
          {([
            ["season", "Season"],
            ["year", "1 Year"],
            ["all", "All"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                range === value ? "bg-slate-950 text-white" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 h-72 w-full" aria-label="Handicap Index over time">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filtered} margin={{ top: 8, right: 16, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" vertical={false} />
            <XAxis dataKey="date" tickFormatter={formatTick} minTickGap={36} tick={{ fontSize: 12 }} />
            <YAxis
              domain={[Math.floor(minimum - padding), Math.ceil(maximum + padding)]}
              tick={{ fontSize: 12 }}
              width={48}
            />
            <Tooltip
              labelFormatter={(value) => formatDate(String(value))}
              formatter={(value) => [Number(value).toFixed(1), "Handicap Index"]}
              contentStyle={{ borderRadius: 8, borderColor: "#d1d5db" }}
            />
            {currentHandicap != null && (
              <ReferenceLine
                y={currentHandicap}
                stroke="#64748b"
                strokeDasharray="5 5"
                label={{ value: `Current ${currentHandicap.toFixed(1)}`, position: "insideTopRight", fill: "#475569", fontSize: 12 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="handicapIndex"
              stroke="#1d4ed8"
              strokeWidth={3}
              dot={{ r: 3, fill: "#1d4ed8", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Lower values represent a better Handicap Index. Dashed line shows the current index.
      </p>
    </section>
  );
}
