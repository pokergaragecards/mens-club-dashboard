import { NextResponse } from "next/server";
import { connectToExistingChrome } from "@/services/usga/browser";
import { exportScoresExcel } from "@/services/usga/exportScores";

export async function POST() {
  try {
    const session = await connectToExistingChrome();

    const ghinNumber = "10384407";
    const scoreMaintenanceUrl = `https://adminportal.usga.org/manage/association/45/club/19968/golfer/${ghinNumber}/score-maintenance`;

    const result = await exportScoresExcel({
      page: session.page,
      scoreMaintenanceUrl,
    });

    return NextResponse.json({
      success: true,
      ghinNumber,
      downloadedFile: result.filePath,
      fileName: result.file,
      size: result.size,
    });
  } catch (error) {
    console.error("Export test failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown export test error.",
      },
      { status: 500 }
    );
  }
}