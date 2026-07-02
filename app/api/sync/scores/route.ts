import { NextResponse } from "next/server";
import { createScoreSyncQueue } from "@/services/sync/scoreSyncQueueService";

export async function POST() {
  try {
    const result = await createScoreSyncQueue();

    return NextResponse.json({
      success: true,
      runId: result.runId,
      playersQueued: result.playersQueued,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error creating sync queue.",
      },
      { status: 500 }
    );
  }
}