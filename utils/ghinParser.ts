import * as XLSX from "xlsx";
import { parse } from "csv-parse/sync";

export type RawGhinRow = Record<string, unknown>;

export type NormalizedGhinRound = {
  scoreType: string | null;
  playedAt: string;
  postedAt: string | null;
  adjustedGrossScore: number | null;
  numberOfHolesPlayed: number | null;
  courseRating: number | null;
  slopeRating: number | null;
  pcc: number;
  differential: number | null;
  esr: number | null;
  courseName: string | null;
  teeName: string | null;
  used: boolean;
  sourceRow: RawGhinRow;
  importKey: string;
};

export type GhinParseResult = {
  rowsFound: number;
  validRounds: NormalizedGhinRound[];
  invalidRows: {
    rowNumber: number;
    reason: string;
    row: RawGhinRow;
  }[];
  columns: string[];
  sampleRows: RawGhinRow[];
};

function cleanText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text || text === "-" || text === " -") return null;
  return text;
}

function cleanNumber(value: unknown): number | null {
  const text = cleanText(value);
  if (!text) return null;

  const number = Number(text);
  return Number.isNaN(number) ? null : number;
}

function cleanBooleanUsed(value: unknown): boolean {
  const text = String(value ?? "").trim().toLowerCase();
  return text === "x" || text === "yes" || text === "true" || text === "used";
}

function parseUsDate(value: unknown): string | null {
  const text = cleanText(value);
  if (!text) return null;

  const parts = text.split("/");
  if (parts.length !== 3) return null;

  const [month, day, year] = parts;
  if (!month || !day || !year) return null;

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function normalizeColumnNames(row: RawGhinRow): RawGhinRow {
  const normalized: RawGhinRow = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim()] = value;
  }

  return normalized;
}

function createImportKey(round: Omit<NormalizedGhinRound, "importKey">): string {
  return [
    round.playedAt,
    round.adjustedGrossScore ?? "",
    round.courseRating ?? "",
    round.slopeRating ?? "",
    round.differential ?? "",
    round.courseName ?? "",
    round.teeName ?? "",
  ].join("|");
}

function parseWorkbookRows(fileName: string, buffer: Buffer): RawGhinRow[] {
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.endsWith(".csv")) {
    return parse(buffer.toString("utf8"), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as RawGhinRow[];
  }

  if (lowerFileName.endsWith(".xlsx") || lowerFileName.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("No worksheet found in file.");
    }

    const worksheet = workbook.Sheets[firstSheetName];

    return XLSX.utils.sheet_to_json<RawGhinRow>(worksheet, {
      defval: "",
      raw: false,
    });
  }

  throw new Error("Unsupported file type. Upload CSV, XLS, or XLSX.");
}

export function parseGhinExport(fileName: string, buffer: Buffer): GhinParseResult {
  const rawRows = parseWorkbookRows(fileName, buffer).map(normalizeColumnNames);
  const columns = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];

  const validRounds: NormalizedGhinRound[] = [];
  const invalidRows: GhinParseResult["invalidRows"] = [];
  const seenImportKeys = new Set<string>();

  rawRows.forEach((row, index) => {
    const playedAt = parseUsDate(row["Played At"]);

    if (!playedAt) {
      invalidRows.push({
        rowNumber: index + 2,
        reason: "Missing or invalid Played At date",
        row,
      });
      return;
    }

    const roundWithoutKey = {
      scoreType: cleanText(row["Score Type"]),
      playedAt,
      postedAt: parseUsDate(row["Created At"]),
      adjustedGrossScore: cleanNumber(row["Adjusted Gross Score"]),
      numberOfHolesPlayed: cleanNumber(row["Number of Holes Played"]),
      courseRating: cleanNumber(row["Course Rating"]),
      slopeRating: cleanNumber(row["Slope Rating"]),
      pcc: cleanNumber(row["PCC"]) ?? 0,
      differential: cleanNumber(row["Diff."]),
      esr: cleanNumber(row["ESR"]),
      courseName: cleanText(row["Course Name"]),
      teeName: cleanText(row["Tee Name"]),
      used: cleanBooleanUsed(row["Used"]),
      sourceRow: row,
    };

    const importKey = createImportKey(roundWithoutKey);

    if (seenImportKeys.has(importKey)) {
      invalidRows.push({
        rowNumber: index + 2,
        reason: "Duplicate row inside import file",
        row,
      });
      return;
    }

    seenImportKeys.add(importKey);

    validRounds.push({
      ...roundWithoutKey,
      importKey,
    });
  });

  return {
    rowsFound: rawRows.length,
    validRounds,
    invalidRows,
    columns,
    sampleRows: rawRows.slice(0, 5),
  };
}