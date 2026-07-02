import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { parseHoleByHoleText } from "@/utils/holeByHoleParser";
import { importHoleByHoleRounds } from "@/services/holeByHoleImportService";

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
    const parsedPdf = await pdf(buffer);
    const parsed = parseHoleByHoleText(parsedPdf.text);

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