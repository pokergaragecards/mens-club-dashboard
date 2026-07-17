"use client";

import { useState } from "react";

export function ExportAuditPdfButton() {
  const [loading, setLoading] = useState(false);

  async function downloadPdf() {
    setLoading(true);
    try {
      const response = await fetch("/api/audit/export", { cache: "no-store" });
      if (!response.ok) throw new Error(await response.text());

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `goodrich-audit-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Unable to generate the audit PDF.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={downloadPdf}
      disabled={loading}
      className="rounded-lg bg-green-800 px-4 py-2.5 font-bold text-white hover:bg-green-900 disabled:opacity-60"
    >
      {loading ? "Generating audit book…" : "Generate Committee Audit PDF"}
    </button>
  );
}
