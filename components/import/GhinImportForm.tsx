"use client";

import { useRef, useState } from "react";

type ImportResult = {
  filesProcessed: number;
  totalRowsFound: number;
  totalRowsImported: number;
  totalRowsExisting: number;
  results: {
    fileName: string;
    playerName: string;
    rowsFound: number;
    rowsImported: number;
    rowsExisting: number;
    rowsInvalid: number;
    player?: {
      id: string;
      full_name: string;
      ghin_number: string;
    };
    error?: string;
  }[];
};

export function GhinImportForm() {
  const formRef = useRef<HTMLFormElement | null>(null);

  const [status, setStatus] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatus("");
    setError("");
    setResult(null);
    setIsUploading(true);

    const formData = new FormData(event.currentTarget);
    const files = formData.getAll("files") as File[];

    if (!files.length || files.every((file) => file.size === 0)) {
      setIsUploading(false);
      setError("Choose one or more GHIN Excel files first.");
      return;
    }

    setStatus(`Uploading and importing ${files.length} file(s)...`);

    try {
      const response = await fetch("/api/import/ghin", {
        method: "POST",
        body: formData,
      });

      const text = await response.text();

      let json: ImportResult & { error?: string };

      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(text || "Server returned a non-JSON error.");
      }

      if (!response.ok) {
        throw new Error(json.error ?? "Import failed.");
      }

      setResult(json);
      setStatus(
        `Import complete: ${json.totalRowsImported} new rounds imported, ${json.totalRowsExisting} existing rounds skipped.`
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
          name="files"
          accept=".csv,.xlsx,.xls"
          multiple
          disabled={isUploading}
          className="block w-full rounded-md border border-gray-400 bg-white p-2 text-sm font-medium text-gray-900 disabled:bg-gray-100"
        />

        <button
          type="submit"
          disabled={isUploading}
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
          style={{ color: "#ffffff" }}
        >
          {isUploading ? "Uploading..." : "Upload GHIN Exports"}
        </button>
      </form>

      {status && <p className="mt-3 text-sm font-bold text-green-800">{status}</p>}
      {error && <p className="mt-3 whitespace-pre-wrap text-sm font-bold text-red-700">{error}</p>}

      {result && (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-300 bg-white p-4">
              <p className="text-sm font-bold text-gray-700">Files</p>
              <p className="text-2xl font-bold text-gray-950">{result.filesProcessed}</p>
            </div>

            <div className="rounded-lg border border-gray-300 bg-white p-4">
              <p className="text-sm font-bold text-gray-700">Rows Found</p>
              <p className="text-2xl font-bold text-gray-950">{result.totalRowsFound}</p>
            </div>

            <div className="rounded-lg border border-gray-300 bg-white p-4">
              <p className="text-sm font-bold text-gray-700">Imported</p>
              <p className="text-2xl font-bold text-gray-950">{result.totalRowsImported}</p>
            </div>

            <div className="rounded-lg border border-gray-300 bg-white p-4">
              <p className="text-sm font-bold text-gray-700">Existing</p>
              <p className="text-2xl font-bold text-gray-950">{result.totalRowsExisting}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-300 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-200 text-gray-950">
                <tr>
                  <th className="p-3 font-bold">File</th>
                  <th className="p-3 font-bold">Player</th>
                  <th className="p-3 text-right font-bold">Rows</th>
                  <th className="p-3 text-right font-bold">Imported</th>
                  <th className="p-3 text-right font-bold">Existing</th>
                  <th className="p-3 text-right font-bold">Invalid</th>
                  <th className="p-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((row) => (
                  <tr key={row.fileName} className="border-t border-gray-200">
                    <td className="p-3 font-medium">{row.fileName}</td>
                    <td className="p-3 font-medium">
                      {row.player?.full_name ?? row.playerName}
                    </td>
                    <td className="p-3 text-right font-medium">{row.rowsFound}</td>
                    <td className="p-3 text-right font-medium">{row.rowsImported}</td>
                    <td className="p-3 text-right font-medium">{row.rowsExisting}</td>
                    <td className="p-3 text-right font-medium">{row.rowsInvalid}</td>
                    <td className="p-3 font-bold">
                      {row.error ? (
                        <span className="text-red-700">{row.error}</span>
                      ) : (
                        <span className="text-green-800">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}