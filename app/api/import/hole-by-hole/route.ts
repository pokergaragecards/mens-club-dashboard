import { NextResponse } from "next/server";
import { gunzipSync } from "zlib";
import { parseHoleByHoleText } from "@/utils/holeByHoleParser";
import { importHoleByHoleRounds } from "@/services/holeByHoleImportService";

export const runtime = "nodejs";
export const maxDuration = 60;

function decompressBase64Gzip(value: string) {
  const buffer = Buffer.from(value, "base64");
  return gunzipSync(buffer).toString("utf8");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const fileName =
      typeof body.fileName === "string" ? body.fileName : "hole-by-hole.pdf";

    let text = "";

    if (typeof body.compressedText === "string" && body.compressedText.length) {
      text = decompressBase64Gzip(body.compressedText);
    } else if (typeof body.text === "string") {
      text = body.text;
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: "No extracted PDF text received." },
        { status: 400 }
      );
    }

    const parsed = parseHoleByHoleText(text);

    const importResult = await importHoleByHoleRounds({
      fileName,
      rounds: parsed.validRounds,
    });

    return NextResponse.json({
      fileName,
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