"use client";

import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pako from "pako";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

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

async function extractPdfText(file: File) {
  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: buffer,
    disableWorker: true,
  }).promise;

  let fullText = "";

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    fullText += `\n${pageText}`;
  }

  return fullText;
}

function compressTextToBase64(text: string) {
  const compressed = pako.gzip(text);
  let binary = "";

  compressed.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

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
      setStatus("Reading PDF in browser...");
      const text = await extractPdfText(file);

      setStatus("Compressing extracted text...");
      const compressedText = compressTextToBase64(text);

      setStatus("Uploading compressed text...");

      const response = await fetch("/api/import/hole-by-hole", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          compressedText,
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