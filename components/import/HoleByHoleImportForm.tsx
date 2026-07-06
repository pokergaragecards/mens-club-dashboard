"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ImportResult = {
  fileName: string;
  rowsFound: number;
  validRounds: number;
  invalidRows: number;
  roundsImported: number;
  holesImported: number;
  rowsSkipped: number;
  error?: string;
};

export function HoleByHoleImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      setStatus("Uploading PDF to storage...");

      const storagePath = `hole-by-hole/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabaseBrowser.storage
        .from("imports")
        .upload(storagePath, file, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setStatus("Importing stored PDF...");

      const response = await fetch("/api/import/hole-by-hole", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          storagePath,
        }),
      });

      const json = await response.json();
      setResult(json);
    } catch (error) {
      setResult({
        fileName: file.name,
        rowsFound: 0,
        validRounds: 0,
        invalidRows: 0,
        roundsImported: 0,
        holesImported: 0,
        rowsSkipped: 0,
        error: error instanceof Error ? error.message : "Import failed.",
      });
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="file"
        accept="application/pdf"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        className="block w-full rounded-md border border-gray-300 bg-white p-2 text-sm"
      />

      <button
        type="submit"
        disabled={!file || loading}
        className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {loading ? "Importing..." : "Import Hole-by-Hole PDF"}
      </button>

      {status && <p className="text-sm font-medium text-gray-700">{status}</p>}

      {result && (
        <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm">
          {result.error ? (
            <p className="font-bold text-red-700">{result.error}</p>
          ) : (
            <div className="space-y-1">
              <p><span className="font-bold">File:</span> {result.fileName}</p>
              <p><span className="font-bold">Rows found:</span> {result.rowsFound}</p>
              <p><span className="font-bold">Valid rounds:</span> {result.validRounds}</p>
              <p><span className="font-bold">Rounds imported:</span> {result.roundsImported}</p>
              <p><span className="font-bold">Holes imported:</span> {result.holesImported}</p>
              <p><span className="font-bold">Rows skipped:</span> {result.rowsSkipped}</p>
            </div>
          )}
        </div>
      )}
    </form>
  );
}