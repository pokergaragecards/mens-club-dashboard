import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { parseHoleByHoleText } from "@/utils/holeByHoleParser";
import { importHoleByHoleRounds } from "@/services/holeByHoleImportService";

function parsePdfBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData) => {
      reject(new Error(errData.parserError));
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
        { error: "Upload a PDF hole-by-hole report." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parsePdfBuffer(buffer);

    const parsed = parseHoleByHoleText(text);
    console.log("PDF TEXT SAMPLE:", text.slice(0, 3000));
    console.log("PARSED ROUNDS:", parsed.validRounds.length);
    console.log("INVALID ROWS:", parsed.invalidRows.length); 

    const importResult = await importHoleByHoleRounds({
      fileName: file.name,
      rounds: parsed.validRounds,
    });

    return NextResponse.json({
      fileName: file.name,
      rowsFound: parsed.rowsFound,
      validRounds: parsed.validRounds.length,
      invalidRows: parsed.invalidRows.length,
      roundsImported: importResult.roundsImported,
      holesImported: importResult.holesImported,
      rowsSkipped: importResult.rowsSkipped,
      sampleRounds: parsed.sampleRounds,
      invalidSamples: parsed.invalidRows,
    });
  } catch (error) {
    console.error("Hole-by-hole import error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error during hole-by-hole import.",
      },
      { status: 500 }
    );
  }
}