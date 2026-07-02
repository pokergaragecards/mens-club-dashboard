"use client";

import { useRef, useState } from "react";

type HoleImportResult = {
  fileName: string;
  rowsFound: number;
  validRounds: number;
  invalidRows: number;
  roundsImported: number;
  holesImported: number;
  rowsSkipped: number;
  sampleRounds?: unknown[];
  invalidSamples?: string[];
};

export function HoleByHoleImportForm() {
  const formRef = useRef<HTMLFormElement | null>(null);

  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<HoleImportResult | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("");
    setError("");
    setResult(null);
    setIsUploading(true);

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file") as File | null;

    if (!file) {
      setIsUploading(false);
      setError("Choose a hole-by-hole PDF first.");
      return;
    }

    setFileName(file.name);
    setStatus("Uploading and parsing PDF...");

    try {
      const response = await fetch("/api/import/hole-by-hole", {
        method: "POST",
        body: formData,
      });

      const responseText = await response.text();

      let json: HoleImportResult & { error?: string };

      try {
        json = JSON.parse(responseText);
      } catch {
        throw new Error(responseText || "Server returned a non-JSON error.");
      }

      if (!response.ok) {
        throw new Error(json.error ?? "Import failed.");
      }

      setResult(json);
      setStatus(
        `Import complete: ${json.roundsImported} rounds and ${json.holesImported} hole scores imported.`
      );

      formRef.current?.reset();
    } catch (err) {
      setStatus("");
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="mt-4 text-gray-900">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          name="file"
          accept=".pdf"
          disabled={isUploading}
          className="block w-full rounded-md border border-gray-400 bg-white p-2 text-sm font-medium text-gray-900 disabled:bg-gray-100"
        />

        <button
          type="submit"
          disabled={isUploading}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          style={{ color: "#ffffff" }}
        >
          {isUploading ? "Uploading..." : "Upload Hole-by-Hole PDF"}
        </button>
      </form>

      {fileName && (
        <p className="mt-3 text-sm font-medium text-gray-700">File: {fileName}</p>
      )}

      {status && (
        <p className="mt-3 text-sm font-bold text-green-800">{status}</p>
      )}

      {error && (
        <p className="mt-3 whitespace-pre-wrap text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="rounded-lg border border-gray-300 bg-white p-4">
              <p className="text-sm font-bold text-gray-700">Rows Found</p>
              <p className="text-2xl font-bold text-gray-950">
                {result.rowsFound}
              </p>
            </div>

            <div className="rounded-lg border border-gray-300 bg-white p-4">
              <p className="text-sm font-bold text-gray-700">Valid Rounds</p>
              <p className="text-2xl font-bold text-gray-950">
                {result.validRounds}
              </p>
            </div>

            <div className="rounded-lg border border-gray-300 bg-white p-4">
              <p className="text-sm font-bold text-gray-700">Rounds Imported</p>
              <p className="text-2xl font-bold text-gray-950">
                {result.roundsImported}
              </p>
            </div>

            <div className="rounded-lg border border-gray-300 bg-white p-4">
              <p className="text-sm font-bold text-gray-700">Holes Imported</p>
              <p className="text-2xl font-bold text-gray-950">
                {result.holesImported}
              </p>
            </div>

            <div className="rounded-lg border border-gray-300 bg-white p-4">
              <p className="text-sm font-bold text-gray-700">Skipped</p>
              <p className="text-2xl font-bold text-gray-950">
                {result.rowsSkipped}
              </p>
            </div>
          </div>

          {result.sampleRounds && result.sampleRounds.length > 0 && (
            <div className="rounded-lg border border-gray-300 bg-gray-50 p-4">
              <h3 className="font-bold text-gray-950">Sample Parsed Rounds</h3>
              <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-gray-300 bg-white p-4 text-xs font-medium text-gray-900">
                {JSON.stringify(result.sampleRounds, null, 2)}
              </pre>
            </div>
          )}

          {result.invalidSamples && result.invalidSamples.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-4">
              <h3 className="font-bold text-red-800">Invalid Samples</h3>
              <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-red-200 bg-white p-4 text-xs font-medium text-gray-900">
                {JSON.stringify(result.invalidSamples, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}