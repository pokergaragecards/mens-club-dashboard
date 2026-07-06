import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { parseScoresPostedText } from "@/utils/scoresPostedParser";
import { importScoresPostedReport } from "@/services/scoresPostedImportService";

function parsePdfBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      const message =
        errData instanceof Error
          ? errData.message
          : errData.parserError?.message ?? "PDF parsing failed.";

      reject(new Error(message));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      const text =
        pdfData.Pages?.flatMap((page) =>
          page.Texts?.map((textItem) =>
            decodeURIComponent(textItem.R?.[0]?.T ?? "")
          )
        ).join(" ") ?? "";

      resolve(text);
    });

    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Upload the Scores Posted Report PDF." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parsePdfBuffer(buffer);

    const parsed = parseScoresPostedText(text);

    const importResult = await importScoresPostedReport({
      fileName: file.name,
      rounds: parsed.validRounds,
      rowsInvalid: parsed.invalidRows.length,
    });

    return NextResponse.json({
      fileName: file.name,
      rowsFound: parsed.rowsFound,
      validRounds: parsed.validRounds.length,
      invalidRows: parsed.invalidRows.length,
      sampleRounds: parsed.sampleRounds,
      invalidSamples: parsed.invalidRows,
      ...importResult,
    });
  } catch (error) {
    console.error("Scores Posted import error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during Scores Posted import.",
      },
      { status: 500 }
    );
  }
}