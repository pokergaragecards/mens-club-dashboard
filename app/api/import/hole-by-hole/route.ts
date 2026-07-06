import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { createClient } from "@supabase/supabase-js";
import { parseHoleByHoleText } from "@/utils/holeByHoleParser";
import { importHoleByHoleRounds } from "@/services/holeByHoleImportService";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const body = await request.json();

    const fileName =
      typeof body.fileName === "string" ? body.fileName : "hole-by-hole.pdf";

    const storagePath = body.storagePath;

    if (!storagePath || typeof storagePath !== "string") {
      return NextResponse.json(
        { error: "No storage path received." },
        { status: 400 }
      );
    }

    const { data, error: downloadError } = await supabaseAdmin.storage
      .from("imports")
      .download(storagePath);

    if (downloadError) throw downloadError;
    if (!data) throw new Error("Unable to download stored PDF.");

    const buffer = Buffer.from(await data.arrayBuffer());
    const text = await parsePdfBuffer(buffer);

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