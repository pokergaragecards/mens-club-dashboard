import PDFParser from "pdf2json";

type PdfTextRun = { T?: string };
type PdfTextItem = { R?: PdfTextRun[] };
type PdfPage = { Texts?: PdfTextItem[] };
type PdfData = { Pages?: PdfPage[] };

function decodeRun(value: string | undefined) {
  if (!value) return "";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
