import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { extractPdfText } from "@/utils/pdfTextExtractor";
import { parseScoresPostedText } from "@/utils/scoresPostedParser";
import { importScoresPostedReport } from "@/services/scoresPostedImportService";
import {
  createImportJob,
  markImportJobFailed,
  updateImportJob,
} from "@/services/importJobService";

export const runtime = "nodejs";
export const maxDuration = 300;

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

    const text = await extractPdfText(buffer);

    await updateImportJob(jobId, {
      progress: 35,
      stage: "Parsing Scores Posted rows",
    });

    const parsed = parseScoresPostedText(text);

    await updateImportJob(jobId, {
      status: "running",
      progress: 40,
      stage: `Importing ${parsed.validRounds.length} Scores Posted rows`,
      rowsTotal: parsed.validRounds.length,
      rowsProcessed: 0,
    });

    const summary = await importScoresPostedReport({
      fileName,
      rounds: parsed.validRounds,
      rowsInvalid: parsed.invalidRows.length,
      jobId,
    });

    const jobResult = {
      fileName,
      storagePath,
      rowsFound: parsed.rowsFound,
      validRounds: parsed.validRounds.length,
      ...summary,
    };

    await updateImportJob(jobId, {
      status: "complete",
      progress: 100,
      stage: "Scores Posted import complete",
      rowsTotal: parsed.validRounds.length,
      rowsProcessed: parsed.validRounds.length,
      result: jobResult,
    });

    return NextResponse.json({
      jobId,
      ...jobResult,
      status: "complete",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scores Posted import failed.";

    console.error("Scores Posted import error:", error);

    await markImportJobFailed(jobId, message);

    return NextResponse.json({ jobId, error: message }, { status: 500 });
  }
}
