import React from "react";
import {
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";

import {
  CompetitionChokersReport,
  type CompetitionChokerRow,
  type CompetitionChokersReportData,
} from "@/components/pdf/CompetitionChokersReport";
import { auditService } from "@/services/auditService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function averageDifferentialGap(player: CompetitionChokerRow) {
  if (
    player.competitionAverageDifferential === null ||
    player.generalPlayAverageDifferential === null
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  return (
    player.competitionAverageDifferential -
    player.generalPlayAverageDifferential
  );
}

export async function GET() {
  try {
    const auditRows = await auditService.getAuditRows("last20");

    const players = auditRows
      .map((row): CompetitionChokerRow | null => {
        const competitionIndex = finiteNumber(row.last20CompetitionHi);
        const generalPlayIndex = finiteNumber(row.last20GeneralPlayHi);

        if (
          competitionIndex === null ||
          generalPlayIndex === null ||
          row.competitionRounds < 5 ||
          row.casualRounds < 5
        ) {
          return null;
        }

        const competitionPenalty = Number(
          (competitionIndex - generalPlayIndex).toFixed(1)
        );

        if (competitionPenalty <= 0) return null;

        return {
          id: row.id,
          name: row.full_name,
          currentIndex: finiteNumber(row.overallHi),
          competitionIndex,
          last12MonthsCompetitionIndex: finiteNumber(
            row.last12MonthsCompetitionHi
          ),
          generalPlayIndex,
          competitionPenalty,
          competitionRounds: row.competitionRounds,
          generalPlayRounds: row.casualRounds,
          competitionAverageDifferential: finiteNumber(
            row.competitionAvgDiff
          ),
          generalPlayAverageDifferential: finiteNumber(row.casualAvgDiff),
        };
      })
      .filter((player): player is CompetitionChokerRow => player !== null)
      .sort((a, b) => {
        if (a.competitionPenalty !== b.competitionPenalty) {
          return b.competitionPenalty - a.competitionPenalty;
        }

        const aAverageGap = averageDifferentialGap(a);
        const bAverageGap = averageDifferentialGap(b);

        if (aAverageGap !== bAverageGap) return bAverageGap - aAverageGap;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 10);

    const report: CompetitionChokersReportData = {
      generatedAt: new Date().toISOString(),
      players,
    };

    const document = React.createElement(CompetitionChokersReport, {
      report,
    }) as unknown as React.ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(document);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="goodrich-top-10-competition-chokers-${date}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Competition Chokers PDF export failed:", error);

    return Response.json(
      {
        error: "Unable to generate the Competition Chokers PDF.",
        detail:
          error instanceof Error
            ? error.message
            : "An unknown error occurred.",
      },
      { status: 500 }
    );
  }
}
