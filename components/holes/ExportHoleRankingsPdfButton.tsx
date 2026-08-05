"use client";

import { useState } from "react";

import type { HoleRankingView } from "@/services/holeRankingService";

export function ExportHoleRankingsPdfButton({
  view,
}: {
  view: HoleRankingView;
}) {
  const [loading, setLoading] = useState(false);

  async function downloadPdf() {
    setLoading(true);

    try {
      const response = await fetch(`/api/holes/rankings/export?view=${view}`, {
        cache: "no-store",
      });

      if (!response.ok) throw new Error(await response.text());

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `goodrich-${view}-handicap-adjusted-hole-rankings-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error(error);
      alert(`Unable to generate the Goodrich ${view} hole rankings PDF.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={downloadPdf}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-slate-700 disabled:opacity-60"
    >
      {loading
        ? `Building ${view} all-tee PDF...`
        : `Download ${view === "best" ? "Best" : "Worst"} Rankings PDF`}
    </button>
  );
}
