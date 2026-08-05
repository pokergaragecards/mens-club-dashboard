"use client";

import { useState } from "react";

export function ExportCompetitionChokersPdfButton() {
  const [loading, setLoading] = useState(false);

  async function downloadPdf() {
    setLoading(true);

    try {
      const response = await fetch("/api/audit/chokers/export", {
        cache: "no-store",
      });

      if (!response.ok) throw new Error(await response.text());

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `goodrich-top-10-competition-chokers-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error(error);
      alert("Unable to generate the Competition Chokers PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={downloadPdf}
      disabled={loading}
      className="rounded-lg bg-amber-600 px-4 py-2.5 font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
    >
      {loading
        ? "Finding competition chokers..."
        : "Top 10 Competition Chokers PDF"}
    </button>
  );
}
