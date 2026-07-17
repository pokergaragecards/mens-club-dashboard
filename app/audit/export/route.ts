import React from "react";
import {
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";

import { AuditBook } from "@/components/pdf/AuditBook";
import type {
  AuditPlayerReport,
  AuditReport,
} from "@/lib/auditReportService";
import { auditService } from "@/services/auditService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AuditRow = Awaited<
  ReturnType<typeof auditService.getAuditRows>
>[number];

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeFlag(
  value: unknown
): AuditPlayerReport["flag"] {
  const flag = String(value ?? "").trim().toLowerCase();

  if (flag === "investigate") return "INVESTIGATE";
  if (flag === "review") return "REVIEW";
  if (flag === "watch" || flag === "monitor") return "MONITOR";

  return "NO ACTION";
}

function mapAuditRow(row: AuditRow): AuditPlayerReport {
  const competitionIndex = toNumber(row.last20CompetitionHi);
  const generalIndex = toNumber(row.last20GeneralPlayHi);

  const calculatedDifference =
    competitionIndex !== null && generalIndex !== null
      ? Number((generalIndex - competitionIndex).toFixed(1))
      : null;

  return {
    id: String(row.id),
    name: row.full_name,
    ghinNumber:
      "ghin_number" in row && row.ghin_number
        ? String(row.ghin_number)
        : null,

    currentIndex: toNumber(row.overallHi),
    competitionIndex,
    generalIndex,

    difference:
      toNumber(row.competitionVsOverallGap) ?? calculatedDifference,

    flag: normalizeFlag(row.flag),

    competitionRounds: Number(row.competitionRounds ?? 0),
    generalRounds: Number(row.casualRounds ?? 0),

    competitionAverage: toNumber(row.competitionAvgDiff),
    generalAverage: toNumber(row.casualAvgDiff),

    // The audit summary service does not return individual rounds or
    // historical rolling points. These remain empty until the PDF report
    // is connected to the player-detail audit data.
    competitionTrend: [],
    generalTrend: [],
    rounds: [],
  };
}

export async function GET() {
  try {
    const rows = await auditService.getAuditRows("last20");

    const players = rows
      .map(mapAuditRow)
      .sort(
        (a, b) =>
          (b.difference ?? Number.NEGATIVE_INFINITY) -
          (a.difference ?? Number.NEGATIVE_INFINITY)
      );

    const report: AuditReport = {
      generatedAt: new Date().toISOString(),
      players,
    };

    const document = React.createElement(AuditBook, {
      report,
    }) as unknown as React.ReactElement<DocumentProps>;

    const buffer = await renderToBuffer(document);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="goodrich-audit-${date}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Audit PDF export failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "An unknown error occurred while generating the PDF.";

    return Response.json(
      {
        error: "Unable to generate the audit PDF.",
        detail: message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}