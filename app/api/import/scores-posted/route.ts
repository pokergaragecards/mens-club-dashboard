import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { parseScoresPostedText } from "@/utils/scoresPostedParser";
import {
  createImportJob,
  markImportJobFailed,
  updateImportJob,
} from "@/services/importJobService";

export const runtime = "nodejs";
export const maxDuration = 300;

function parsePdfBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (errData: any) => {
      reject(
        new Error(
          errData?.parserError instanceof Error
            ? errData.parserError.message
            : String(errData?.parserError ?? "PDF parse failed")
        )
      );
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      const text = pdfData.Pages.map((page: any) =>
        page.Texts.map((textItem: any) =>
          decodeURIComponent(textItem.R.map((r: any) => r.T).join(""))
        ).join(" ")
      ).join("\n");

      resolve(text);
    });

    pdfParser.parseBuffer(buffer);
  });
}

async function downloadImportFile(storagePath: string) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from("imports")
    .download(storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not download import file.");
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function POST(request: Request) {
  let jobId: string | null = null;

  try {
    const body = await request.json();

    const fileName = String(body.fileName ?? "");
    const storagePath = String(body.storagePath ?? "");

    if (!fileName || !storagePath) {
      return NextResponse.json(
        { error: "Missing fileName or storagePath." },
        { status: 400 }
      );
    }

    jobId = await createImportJob({
      importType: "scores_posted",
      fileName,
    });

    await updateImportJob(jobId, {
      status: "running",
      progress: 5,
      stage: "Downloading Scores Posted PDF from storage",
    });

    const buffer = await downloadImportFile(storagePath);

    await updateImportJob(jobId, {
      progress: 20,
      stage: "Extracting PDF text",
    });

    const text = await parsePdfBuffer(buffer);

    await updateImportJob(jobId, {
      progress: 35,
      stage: "Parsing Scores Posted rows",
    });

    const parsed = parseScoresPostedText(text);

    const jobResult = {
      fileName,
      storagePath,
      rowsFound: parsed.rowsFound,
      validRounds: parsed.validRounds.length,
      rowsInvalid: parsed.invalidRows.length,
      parsedRows: parsed.validRounds,
      summary: {
        roundsImported: 0,
        roundsExisting: 0,
        goodrichRoundsUpdated: 0,
        playersCreated: 0,
        playersUpdated: 0,
        rowsInvalid: parsed.invalidRows.length,
      },
    };

    await updateImportJob(jobId, {
      status: "processing",
      progress: 40,
      stage: `Ready to import ${parsed.validRounds.length} Scores Posted rows`,
      rowsTotal: parsed.validRounds.length,
      rowsProcessed: 0,
      result: jobResult,
    });

    return NextResponse.json({
      jobId,
      fileName,
      rowsFound: parsed.rowsFound,
      validRounds: parsed.validRounds.length,
      rowsInvalid: parsed.invalidRows.length,
      status: "processing",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scores Posted import failed.";

    console.error("Scores Posted import error:", error);

    await markImportJobFailed(jobId, message);

    return NextResponse.json({ jobId, error: message }, { status: 500 });
  }
}