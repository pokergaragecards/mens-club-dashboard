"use client";

import { useRef, useState } from "react";

type ImportResult = {
  fileName?: string;
  rowsFound?: number;
  validRounds?: number;
  rowsInvalid?: number;
  roundsImported?: number;
  roundsExisting?: number;
  goodrichRoundsUpdated?: number;
  playersCreated?: number;
  playersUpdated?: number;
  error?: string;
};

export function ScoresPostedImportForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Waiting for file");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = inputRef.current?.files?.[0];

    if (!file) {
      setResult({ error: "Choose a Scores Posted PDF first." });
      return;
    }

    setIsImporting(true);
    setProgress(5);
    setStage("Preparing upload");
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(20);
      setStage("Uploading PDF");

      const response = await fetch("/api/import/scores-posted", {
        method: "POST",
        body: formData,
      });

      setProgress(75);
      setStage("Parsing and importing rounds");

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error ?? "Scores Posted import failed.");
      }

      setProgress(100);
      setStage("Import complete");
      setResult(json);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      setStage("Import failed");
      setResult({
        error: error instanceof Error ? error.message : "Import failed.",
      });
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-gray-950">
        Scores Posted Report
      </h2>

      <p className="mt-1 text-sm text-gray-600">
        Imports official GHIN differentials. Goodrich rows update matching
        hole-by-hole rounds; non-Goodrich rows are inserted as score-only rounds.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          disabled={isImporting}
          className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
        />

        <button
          type="submit"
          disabled={isImporting}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isImporting ? "Importing..." : "Import Scores Posted"}
        </button>
      </form>

      {(isImporting || progress > 0) && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm font-bold text-gray-700">
            <span>{stage}</span>
            <span>{progress}%</span>
          </div>

          <div className="mt-2 h-3 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-700 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {result && (
        <div
          className={`mt-5 rounded-lg border p-4 text-sm ${
            result.error
              ? "border-red-300 bg-red-50 text-red-800"
              : "border-green-300 bg-green-50 text-green-900"
          }`}
        >
          {result.error ? (
            <p className="font-bold">{result.error}</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2">
              <ResultLine label="Rows found" value={result.rowsFound} />
              <ResultLine label="Valid rounds" value={result.validRounds} />
              <ResultLine label="Invalid rows" value={result.rowsInvalid} />
              <ResultLine label="Rounds imported" value={result.roundsImported} />
              <ResultLine label="Existing/skipped" value={result.roundsExisting} />
              <ResultLine
                label="Goodrich updated"
                value={result.goodrichRoundsUpdated}
              />
              <ResultLine label="Players created" value={result.playersCreated} />
              <ResultLine label="Players updated" value={result.playersUpdated} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ResultLine({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  return (
    <div className="flex justify-between gap-3 rounded bg-white/70 px-3 py-2">
      <span className="font-medium">{label}</span>
      <span className="font-bold">{value ?? "-"}</span>
    </div>
  );
}