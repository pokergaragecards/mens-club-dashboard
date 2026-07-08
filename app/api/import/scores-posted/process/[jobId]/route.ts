import { NextResponse } from "next/server";
import {
  getImportJob,
  updateImportJob,
} from "@/services/importJobService";
import { importScoresPostedReportChunk } from "@/services/scoresPostedImportService";
import type { ScoresPostedRound } from "@/utils/scoresPostedParser";

export const runtime = "nodejs";
export const maxDuration = 60;

type PageProps = {
  params: Promise<{ jobId: string }>;
};

const CHUNK_SIZE = 20;

export async function POST(_: Request, { params }: PageProps) {
  const { jobId } = await params;

  try {
    const job = await getImportJob(jobId);

    if (!job) {
      return NextResponse.json({ error: "Import job not found." }, { status: 404 });
    }

    if (job.status === "complete" || job.status === "failed") {
      return NextResponse.json(job);
    }

    const result = (job.result ?? {}) as {
      fileName?: string;
      rowsFound?: number;
      validRounds?: number;
      rowsInvalid?: number;
      parsedRows?: ScoresPostedRound[];
      summary?: {
        roundsImported?: number;
        roundsExisting?: number;
        goodrichRoundsUpdated?: number;
        playersCreated?: number;
        playersUpdated?: number;
        rowsInvalid?: number;
      };
    };

    const rows = result.parsedRows ?? [];
    const processed = Number(job.rows_processed ?? 0);
    const nextRows = rows.slice(processed, processed + CHUNK_SIZE);

    if (!nextRows.length) {
      const finalResult = {
        fileName: result.fileName,
        rowsFound: result.rowsFound,
        validRounds: result.validRounds,
        rowsInvalid: result.rowsInvalid,
        ...(result.summary ?? {}),
      };

      await updateImportJob(jobId, {
        status: "complete",
        progress: 100,
        stage: "Scores Posted import complete",
        rowsTotal: rows.length,
        rowsProcessed: rows.length,
        result: finalResult,
      });

      return NextResponse.json({
        id: jobId,
        status: "complete",
        progress: 100,
        result: finalResult,
      });
    }

    const chunkResult = await importScoresPostedReportChunk({
      fileName: result.fileName ?? "Scores Posted Report",
      rounds: nextRows,
      rowsInvalid: result.rowsInvalid ?? 0,
      jobId,
    });

    const summary = result.summary ?? {};

    const nextSummary = {
      roundsImported:
        Number(summary.roundsImported ?? 0) + chunkResult.roundsImported,
      roundsExisting:
        Number(summary.roundsExisting ?? 0) + chunkResult.roundsExisting,
      goodrichRoundsUpdated:
        Number(summary.goodrichRoundsUpdated ?? 0) +
        chunkResult.goodrichRoundsUpdated,
      playersCreated:
        Number(summary.playersCreated ?? 0) + chunkResult.playersCreated,
      playersUpdated:
        Number(summary.playersUpdated ?? 0) + chunkResult.playersUpdated,
      rowsInvalid: result.rowsInvalid ?? 0,
    };

    const nextProcessed = processed + nextRows.length;
    const progress = Math.min(
      99,
      40 + Math.round((nextProcessed / Math.max(rows.length, 1)) * 59)
    );

    await updateImportJob(jobId, {
      status: "processing",
      progress,
      stage: `Imported Scores Posted rows ${nextProcessed} of ${rows.length}`,
      rowsTotal: rows.length,
      rowsProcessed: nextProcessed,
      result: {
        ...result,
        summary: nextSummary,
      },
    });

    return NextResponse.json({
      id: jobId,
      status: "processing",
      progress,
      rows_total: rows.length,
      rows_processed: nextProcessed,
      result: {
        ...result,
        summary: nextSummary,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scores Posted chunk failed.";

    await updateImportJob(jobId, {
      status: "failed",
      progress: 100,
      stage: "Scores Posted import failed",
      error: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}