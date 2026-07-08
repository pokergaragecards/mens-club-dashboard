"use client";

import { createClient } from "@supabase/supabase-js";
import { useRef, useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type ImportResult = {
  fileName?: string;
  rowsFound?: number;
  validRounds?: number;
  invalidRows?: number;
  roundsImported?: number;
  roundsExisting?: number;
  holesImported?: number;
  holesExisting?: number;
  playersCreated?: number;
  playersUpdated?: number;
  rowsSkipped?: number;
  error?: string;
};

type ImportJob = {
  id: string;
  status: string;
  progress: number;
  stage: string | null;
  rows_total: number;
  rows_processed: number;
  result: ImportResult | null;
  error: string | null;
};

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_");
}

async function readJsonSafely(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text.slice(0, 300) || "Server returned a non-JSON error.");
  }
}

export function HoleByHoleImportForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Waiting for file");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function pollJob(jobId: string) {
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/import/status/${jobId}`);
        const job = (await readJsonSafely(response)) as ImportJob;

        setProgress(job.progress ?? 0);
        setStage(job.stage ?? "Processing import");

        if (job.status === "complete") {
          window.clearInterval(timer);
          setProgress(100);
          setStage("Import complete");
          setResult(job.result ?? {});
          setIsImporting(false);

          if (inputRef.current) {
            inputRef.current.value = "";
          }
        }

        if (job.status === "failed") {
          window.clearInterval(timer);
          setStage("Import failed");
          setResult({ error: job.error ?? "Import failed." });
          setIsImporting(false);
        }
      } catch {
        // Keep polling unless the API marks failed.
      }
    }, 1000);

    return timer;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = inputRef.current?.files?.[0];

    if (!file) {
      setResult({ error: "Choose a hole-by-hole PDF first." });
      return;
    }

    setIsImporting(true);
    setProgress(5);
    setStage("Preparing upload");
    setResult(null);

    try {
      const storagePath = `hole-by-hole/${Date.now()}-${safeFileName(
        file.name
      )}`;

      setProgress(15);
      setStage("Uploading PDF to storage");

      const { error: uploadError } = await supabase.storage
        .from("imports")
        .upload(storagePath, file, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress(25);
      setStage("Starting server import");

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

      const json = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(json.error ?? "Hole-by-hole import failed.");
      }

      if (json.jobId) {
        setStage("Import running");
        pollJob(json.jobId);
      } else {
        setProgress(100);
        setStage("Import complete");
        setResult(json);
        setIsImporting(false);

        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    } catch (error) {
      setStage("Import failed");
      setResult({
        error: error instanceof Error ? error.message : "Import failed.",
      });
      setIsImporting(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-bold text-gray-950">
        Goodrich Hole-by-Hole Report
      </h2>

      <p className="mt-1 text-sm text-gray-600">
        Imports Goodrich tee boxes, hole scores, pars, stroke indexes, and
        scorecard-level detail.
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
          {isImporting ? "Importing..." : "Import Hole-by-Hole"}
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
              <ResultLine label="Invalid rows" value={result.invalidRows} />
              <ResultLine label="Rounds imported" value={result.roundsImported} />
              <ResultLine label="Existing rounds" value={result.roundsExisting} />
              <ResultLine label="Holes imported" value={result.holesImported} />
              <ResultLine label="Existing holes" value={result.holesExisting} />
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