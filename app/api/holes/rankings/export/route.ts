import React from "react";
import {
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";

import { HoleRankingsReport } from "@/components/pdf/HoleRankingsReport";
import { getGoodrichHoleRankingReport } from "@/services/holeRankingService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const report = await getGoodrichHoleRankingReport();
    const document = React.createElement(HoleRankingsReport, {
      report,
    }) as unknown as React.ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(document);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="goodrich-handicap-adjusted-hole-rankings-${date}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Goodrich hole ranking PDF export failed:", error);

    return Response.json(
      {
        error: "Unable to generate the Goodrich hole rankings PDF.",
        detail:
          error instanceof Error
            ? error.message
            : "An unknown error occurred.",
      },
      { status: 500 }
    );
  }
}
