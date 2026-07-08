import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { parseHoleByHoleText } from "@/utils/holeByHoleParser";
import { importHoleByHoleRounds } from "@/services/holeByHoleImportService";
import { createImportJob, updateImportJob } from "@/services/importJobService";

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
      importType: "hole_by_hole",
      fileName,
    });

    await updateImportJob(jobId, {
      status: "running",
      progress: 5,
      stage: "Downloading hole-by-hole PDF from storage",
    });

    const buffer = await downloadImportFile(storagePath);

    await updateImportJob(jobId, {
      progress: 15,
      stage: "Parsing scorecard text",
    });

    const text = await parsePdfBuffer(buffer);
    const parsed = parseHoleByHoleText(text);

    await updateImportJob(jobId, {
      progress: 30,
      stage: "Hole-by-hole report parsed",
      rowsTotal: parsed.validRounds.length,
      rowsProcessed: 0,
    });

    const importResult = await importHoleByHoleRounds({
      fileName,
      rounds: parsed.validRounds,
      invalidRows: parsed.invalidRows.length,
      jobId,
    });

    const response = {
      jobId,
      fileName,
      rowsFound: parsed.rowsFound,
      validRounds: parsed.validRounds.length,
      ...importResult,
    };

    await updateImportJob(jobId, {
      status: "complete",
      progress: 100,
      stage: "Hole-by-hole import complete",
      rowsTotal: parsed.validRounds.length,
      rowsProcessed: parsed.validRounds.length,
      result: response,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Hole-by-hole import failed.";

    console.error("Hole-by-hole import error:", error);

    await updateImportJob(jobId, {
      status: "failed",
      progress: 100,
      stage: "Hole-by-hole import failed",
      error: message,
    });

    return NextResponse.json({ jobId, error: message }, { status: 500 });
  }
}