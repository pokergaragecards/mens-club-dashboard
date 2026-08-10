import PDFParser from "pdf2json";

type PdfTextRun = { T?: string };
type PdfTextItem = {
  x?: number;
  y?: number;
  w?: number;
  R?: PdfTextRun[];
};
type PdfPage = { Width?: number; Height?: number; Texts?: PdfTextItem[] };
type PdfData = { Pages?: PdfPage[] };

const SCORE_TYPES = new Set([
  "H",
  "A",
  "C",
  "CH",
  "CA",
  "EA",
  "EH",
  "ECH",
  "NA",
  "NH",
]);
const SCORES_POSTED_COLUMN_BOUNDARIES = [
  0,
  5 / 70.875,
  12.5 / 70.875,
  18.5 / 70.875,
  23.8 / 70.875,
  27.2 / 70.875,
  30 / 70.875,
  34.5 / 70.875,
  36.7 / 70.875,
  39.6 / 70.875,
  43 / 70.875,
  48 / 70.875,
  51.2 / 70.875,
  53.2 / 70.875,
  67.7 / 70.875,
  1.001,
];

function decodeRun(value: string | undefined) {
  if (!value) return "";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function textOf(item: PdfTextItem) {
  return (item.R ?? []).map((run) => decodeRun(run.T)).join("").trim();
}

function columnText(params: {
  items: PdfTextItem[];
  width: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}) {
  const selected = params.items
    .filter((item) => {
      const x = Number(item.x ?? -1);
      const y = Number(item.y ?? -1);
      return (
        x >= params.left * params.width &&
        x < params.right * params.width &&
        y >= params.top &&
        y < params.bottom
      );
    })
    .sort(
      (a, b) =>
        Number(a.y ?? 0) - Number(b.y ?? 0) ||
        Number(a.x ?? 0) - Number(b.x ?? 0)
    );

  const lines: PdfTextItem[][] = [];
  for (const item of selected) {
    const line = lines.find(
      (candidate) =>
        Math.abs(Number(candidate[0].y ?? 0) - Number(item.y ?? 0)) <= 0.08
    );
    if (line) line.push(item);
    else lines.push([item]);
  }

  return lines
    .map((line) => {
      line.sort((a, b) => Number(a.x ?? 0) - Number(b.x ?? 0));
      return line.reduce((text, item, index) => {
        if (index === 0) return textOf(item);
        const previous = line[index - 1];
        const separator =
          Number(item.x ?? 0) - Number(previous.x ?? 0) < 1 ? "" : " ";
        return `${text}${separator}${textOf(item)}`;
      }, "");
    })
    .filter(Boolean)
    .join(" ");
}

export function reconstructScoresPostedText(pages: PdfPage[]) {
  const rows: string[] = [];

  for (const page of pages) {
    const width = Number(page.Width ?? 0);
    const height = Number(page.Height ?? 0);
    const items = (page.Texts ?? []).filter((item) => textOf(item));
    if (!width || !height || !items.length) continue;

    const dateItems = items.filter((item) => {
      const x = Number(item.x ?? -1);
      return (
        x >= SCORES_POSTED_COLUMN_BOUNDARIES[6] * width &&
        x < SCORES_POSTED_COLUMN_BOUNDARIES[7] * width &&
        /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(textOf(item))
      );
    });
    const anchors = Array.from(
      new Set(
        items
          .filter((item) => {
            const x = Number(item.x ?? -1);
            const y = Number(item.y ?? -1);
            return (
              x >= SCORES_POSTED_COLUMN_BOUNDARIES[5] * width &&
              x < SCORES_POSTED_COLUMN_BOUNDARIES[6] * width &&
              SCORE_TYPES.has(textOf(item)) &&
              dateItems.some((date) => Math.abs(Number(date.y ?? -1) - y) <= 0.15)
            );
          })
          .map((item) => Number(item.y))
      )
    ).sort((a, b) => a - b);
    const tableHeaderYs = items
      .filter((item) => {
        const x = Number(item.x ?? -1);
        return (
          x >= SCORES_POSTED_COLUMN_BOUNDARIES[13] * width &&
          x < SCORES_POSTED_COLUMN_BOUNDARIES[14] * width &&
          textOf(item) === "Course Played"
        );
      })
      .map((item) => Number(item.y));
    const footerYs = items
      .filter((item) => textOf(item).startsWith("Total Scores:"))
      .map((item) => Number(item.y));

    for (let index = 0; index < anchors.length; index++) {
      const anchor = anchors[index];
      let top: number;
      if (index === 0) {
        const precedingHeaders = tableHeaderYs.filter((headerY) => headerY < anchor);
        if (precedingHeaders.length) {
          top = (Math.max(...precedingHeaders) + anchor) / 2;
        } else {
          const nextGap = anchors[1] ? anchors[1] - anchor : height * 0.05;
          top = anchor - nextGap / 2;
        }
      } else {
        top = (anchors[index - 1] + anchor) / 2;
      }
      let bottom: number;
      if (index === anchors.length - 1) {
        const followingFooters = footerYs.filter((footerY) => footerY > anchor);
        bottom = followingFooters.length
          ? (anchor + Math.min(...followingFooters)) / 2
          : height - (20 / 612.95996) * height;
      } else {
        bottom = (anchor + anchors[index + 1]) / 2;
      }
      const columns = SCORES_POSTED_COLUMN_BOUNDARIES.slice(0, -1).map(
        (left, column) =>
          columnText({
            items,
            width,
            left,
            right: SCORES_POSTED_COLUMN_BOUNDARIES[column + 1],
            top,
            bottom,
          })
      );
      const row = columns.filter(Boolean).join(" ").trim();
      if (row) rows.push(row);
    }
  }

  return rows.join("\n");
}

export function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (errorData: unknown) => {
      const parserError = (errorData as { parserError?: unknown })?.parserError;
      reject(
        new Error(
          parserError instanceof Error
            ? parserError.message
            : String(parserError ?? "PDF parse failed")
        )
      );
    });

    parser.on("pdfParser_dataReady", (rawData: unknown) => {
      const data = rawData as PdfData;
      const text = (data.Pages ?? [])
        .map((page) =>
          (page.Texts ?? [])
            .map((item) =>
              (item.R ?? []).map((run) => decodeRun(run.T)).join("")
            )
            .join(" ")
        )
        .join("\n");

      resolve(text);
    });

    parser.parseBuffer(buffer);
  });
}

export function extractScoresPostedPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();

    parser.on("pdfParser_dataError", (errorData: unknown) => {
      const parserError = (errorData as { parserError?: unknown })?.parserError;
      reject(
        new Error(
          parserError instanceof Error
            ? parserError.message
            : String(parserError ?? "PDF parse failed")
        )
      );
    });

    parser.on("pdfParser_dataReady", (rawData: unknown) => {
      const data = rawData as PdfData;
      resolve(reconstructScoresPostedText(data.Pages ?? []));
    });

    parser.parseBuffer(buffer);
  });
}
