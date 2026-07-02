"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Player = {
  id: string;
  full_name: string;
  ghin_number: string | null;
  current_index: number | null;
  total_rounds: number | null;
  avg_diff: number | null;
  avg_diff_30: number | null;
  avg_diff_90: number | null;
  best_diff: number | null;
  worst_diff: number | null;
  avg_score: number | null;
  best_score: number | null;
  worst_score: number | null;
};

type SortKey = keyof Player;

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toFixed(decimals);
}

export function CompareTable({ players }: { players: Player[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("full_name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  function sortBy(key: SortKey) {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  const filteredPlayers = useMemo(() => {
    return players
      .filter((player) =>
        player.full_name.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => {
        const aValue = a[sortKey];
        const bValue = b[sortKey];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return sortDirection === "asc"
          ? Number(aValue) - Number(bValue)
          : Number(bValue) - Number(aValue);
      });
  }, [players, search, sortKey, sortDirection]);

  const headers: { label: string; key: SortKey; align?: string }[] = [
    { label: "Player", key: "full_name" },
    { label: "Index", key: "current_index", align: "text-right" },
    { label: "Rounds", key: "total_rounds", align: "text-right" },
    { label: "Avg Diff", key: "avg_diff", align: "text-right" },
    { label: "30 Avg", key: "avg_diff_30", align: "text-right" },
    { label: "90 Avg", key: "avg_diff_90", align: "text-right" },
    { label: "Best Diff", key: "best_diff", align: "text-right" },
    { label: "Worst Diff", key: "worst_diff", align: "text-right" },
    { label: "Avg Score", key: "avg_score", align: "text-right" },
    { label: "Best Score", key: "best_score", align: "text-right" },
    { label: "Worst Score", key: "worst_score", align: "text-right" },
  ];

  return (
    <div className="mt-6 space-y-4">
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search players..."
        className="w-full max-w-md rounded-md border border-gray-400 bg-white px-4 py-2 text-sm font-medium text-gray-900"
      />

      <div className="max-h-[75vh] overflow-auto rounded-xl border border-gray-300 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm text-gray-900">
          <thead className="sticky top-0 z-30 bg-gray-200 text-gray-950 shadow-sm">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={header.key}
                  onClick={() => sortBy(header.key)}
                  className={`cursor-pointer whitespace-nowrap p-3 font-bold hover:bg-gray-300 ${
                    header.align ?? ""
                  } ${index === 0 ? "sticky left-0 z-40 bg-gray-200" : ""}`}
                >
                  {header.label}
                  {sortKey === header.key ? (
                    <span className="ml-1">
                      {sortDirection === "asc" ? "▲" : "▼"}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredPlayers.map((player) => (
              <tr
                key={player.id}
                className="border-b border-gray-200 hover:bg-blue-50"
              >
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white p-3 font-bold">
                  <Link
                    href={`/players/${player.id}`}
                    className="text-blue-800 hover:underline"
                  >
                    {player.full_name}
                  </Link>
                </td>
                <td className="p-3 text-right font-medium">
                  {formatNumber(player.current_index)}
                </td>
                <td className="p-3 text-right font-medium">
                  {player.total_rounds ?? 0}
                </td>
                <td className="p-3 text-right font-bold">
                  {formatNumber(player.avg_diff)}
                </td>
                <td className="p-3 text-right font-medium">
                  {formatNumber(player.avg_diff_30)}
                </td>
                <td className="p-3 text-right font-medium">
                  {formatNumber(player.avg_diff_90)}
                </td>
                <td className="p-3 text-right font-medium text-green-800">
                  {formatNumber(player.best_diff)}
                </td>
                <td className="p-3 text-right font-medium text-red-700">
                  {formatNumber(player.worst_diff)}
                </td>
                <td className="p-3 text-right font-medium">
                  {formatNumber(player.avg_score)}
                </td>
                <td className="p-3 text-right font-medium text-green-800">
                  {player.best_score ?? "-"}
                </td>
                <td className="p-3 text-right font-medium text-red-700">
                  {player.worst_score ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}