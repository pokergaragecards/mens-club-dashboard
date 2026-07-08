import { NextResponse } from "next/server";
import PDFParser from "pdf2json";
import { parseScoresPostedText } from "@/utils/scoresPostedParser";
import { importScoresPostedReport } from "@/services/scoresPostedImportService";
import { createImportJob, updateImportJob } from "@/services/importJobService";

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

export async function POST(request: Request) {
  let jobId: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    jobId = await createImportJob({
      importType: "scores_posted",
      fileName: file.name,
    });

    await updateImportJob(jobId, {
      status: "running",
      progress: 5,
      stage: "Reading Scores Posted PDF",
    });

    const buffer = Buffer.from(await file.arrayBuffer());

    await updateImportJob(jobId, {
      progress: 15,
      stage: "Parsing PDF text",
    });

    const text = await parsePdfBuffer(buffer);
    const parsed = parseScoresPostedText(text);

    await updateImportJob(jobId, {
      progress: 30,
      stage: "Scores Posted report parsed",
      rowsTotal: parsed.validRounds.length,
      rowsProcessed: 0,
    });

    const importResult = await importScoresPostedReport({
      fileName: file.name,
      rounds: parsed.validRounds,
      rowsInvalid: parsed.invalidRows.length,
      jobId,
    });

    const response = {
      jobId,
      fileName: file.name,
      rowsFound: parsed.rowsFound,
      validRounds: parsed.validRounds.length,
      ...importResult,
    };

    await updateImportJob(jobId, {
      status: "complete",
      progress: 100,
      stage: "Scores Posted import complete",
      rowsTotal: parsed.validRounds.length,
      rowsProcessed: parsed.validRounds.length,
      result: response,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scores Posted import failed.";

    console.error("Scores Posted import error:", error);

    await updateImportJob(jobId, {
      status: "failed",
      progress: 100,
      stage: "Scores Posted import failed",
      error: message,
    });

    return NextResponse.json(
      {
        jobId,
        error: message,
      },
      { status: 500 }
    );
  }
}