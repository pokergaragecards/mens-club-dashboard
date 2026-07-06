"use client";

import { useState } from "react";

type ImportResult = {
  fileName: string;
  rowsFound: number;
  validRounds: number;
  invalidRows: number;
  roundsImported: number;
  roundsExisting: number;
  playersCreated: number;
  playersUpdated: number;
  rowsInvalid: number;
  error?: string;
};

export function ScoresPostedImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/import/scores-posted", {
      method: "POST",
      body: formData,
    });

    const json = await response.json();

    setResult(json);
    setLoading(false);
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
        {loading ? "Importing..." : "Import Scores Posted Report"}
      </button>

      {result && (
        <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm">
          {result.error ? (
            <p className="font-bold text-red-700">{result.error}</p>
          ) : (
            <div className="space-y-1">
              <p>
                <span className="font-bold">File:</span> {result.fileName}
              </p>
              <p>
                <span className="font-bold">Rows found:</span>{" "}
                {result.rowsFound}
              </p>
              <p>
                <span className="font-bold">Valid rounds:</span>{" "}
                {result.validRounds}
              </p>
              <p>
                <span className="font-bold">Rounds imported:</span>{" "}
                {result.roundsImported}
              </p>
              <p>
                <span className="font-bold">Existing rounds:</span>{" "}
                {result.roundsExisting}
              </p>
              <p>
                <span className="font-bold">Players created:</span>{" "}
                {result.playersCreated}
              </p>
              <p>
                <span className="font-bold">Players updated:</span>{" "}
                {result.playersUpdated}
              </p>
              <p>
                <span className="font-bold">Invalid rows:</span>{" "}
                {result.invalidRows}
              </p>
            </div>
          )}
        </div>
      )}
    </form>
  );
}