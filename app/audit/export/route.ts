import React from "react";
import {
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";

import { AuditBook } from "@/components/pdf/AuditBook";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type {
  AuditPlayerReport,
  AuditReport,
  AuditRound,
  AuditTrendPoint,
} from "@/lib/auditReportService";
import { auditService } from "@/services/auditService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type AuditSummaryRow = Awaited<
  ReturnType<typeof auditService.getAuditRows>
>[number];

type PlayerRow = {
  id: string;
  full_name: string;
  ghin_number: string | null;
  current_index: number | null;
};

type RoundRow = {
  id: string;
  player_id: string;
  played_at: string;
  gross_score: number | null;
  adjusted_gross_score: number | null;
  differential: number | null;
  score_type: string | null;
  course_name: string | null;
  tee_name: string | null;
  counts_for_hi: boolean | null;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isCompetition(scoreType: string | null | undefined): boolean {
  return ["C", "CH", "CA", "ECH"].includes(scoreType ?? "");
}

function whsUsedCount(roundCount: number): number {
  if (roundCount < 5) return 0;
  if (roundCount === 5) return 1;
  if (roundCount <= 8) return 2;
  if (roundCount <= 11) return 3;
  if (roundCount <= 14) return 4;
  if (roundCount <= 16) return 5;
  if (roundCount <= 18) return 6;
  if (roundCount === 19) return 7;
  return 8;
}

function calculateCategoryHi(rounds: RoundRow[]): number | null {
  const last20 = [...rounds]
    .filter(
      (round) =>
        round.counts_for_hi === true &&
        round.differential !== null &&
        Number.isFinite(Number(round.differential))
    )
    .sort(
      (a, b) =>
        new Date(b.played_at).getTime() -
        new Date(a.played_at).getTime()
    )
    .slice(0, 20);

  const differentials = last20
    .map((round) => Number(round.differential))
    .sort((a, b) => a - b);

  const usedCount = whsUsedCount(differentials.length);
  if (!usedCount) return null;

  const base = average(differentials.slice(0, usedCount));
  if (base === null) return null;

  const adjustment = differentials.length === 6 ? -1 : 0;
  return Number((base + adjustment).toFixed(1));
}

function buildTrend(
  rounds: RoundRow[],
  category: "Competition" | "General Play"
): AuditTrendPoint[] {
  const chronological = [...rounds]
    .filter(
      (round) =>
        round.counts_for_hi === true &&
        round.differential !== null &&
        Number.isFinite(Number(round.differential))
    )
    .sort(
      (a, b) =>
        new Date(a.played_at).getTime() -
        new Date(b.played_at).getTime()
    );

  const points: AuditTrendPoint[] = [];

  chronological.forEach((round, index) => {
    const history = chronological.slice(Math.max(0, index - 19), index + 1);
    const handicapIndex = calculateCategoryHi(history);

    if (handicapIndex === null) return;

    points.push({
      date: round.played_at,
      handicapIndex,
    });
  });

  // Matches the player audit page: display the most recent 10 calculated points.
  return points.slice(-10);
}

function normalizeFlag(value: unknown): AuditPlayerReport["flag"] {
  const flag = String(value ?? "").trim().toLowerCase();

  if (flag === "investigate") return "INVESTIGATE";
  if (flag === "review") return "REVIEW";
  if (flag === "watch" || flag === "monitor") return "MONITOR";

  return "NO ACTION";
}

function mapRound(round: RoundRow): AuditRound {
  return {
    id: round.id,
    playedAt: round.played_at,
    courseName: round.course_name ?? "Unknown course",
    teeName: round.tee_name ?? "-",
    score:
      round.adjusted_gross_score !== null
        ? Number(round.adjusted_gross_score)
        : round.gross_score !== null
          ? Number(round.gross_score)
          : null,
    differential: Number(round.differential),
    category: isCompetition(round.score_type)
      ? "Competition"
      : "General Play",
  };
}

async function getAllOfficialRounds(): Promise<RoundRow[]> {
  const supabase = createSupabaseServerClient();
  const pageSize = 1000;
  const allRows: RoundRow[] = [];

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from("player_display_rounds")
      .select(
        `
          id,
          player_id,
          played_at,
          gross_score,
          adjusted_gross_score,
          differential,
          score_type,
          course_name,
          tee_name,
          counts_for_hi
        `
      )
      .eq("counts_for_hi", true)
      .not("played_at", "is", null)
      .not("differential", "is", null)
      .order("played_at", { ascending: false })
      .range(start, start + pageSize - 1);

    if (error) {
      throw new Error(`Unable to load official rounds: ${error.message}`);
    }

    const page = (data ?? []) as RoundRow[];
    allRows.push(...page);

    if (page.length < pageSize) break;
  }

  return allRows;
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();

    const [
      summaryRows,
      { data: playerData, error: playerError },
      allRounds,
    ] = await Promise.all([
      auditService.getAuditRows("last20"),

      supabase
        .from("players")
        .select("id, full_name, ghin_number, current_index")
        .order("full_name"),

      getAllOfficialRounds(),
    ]);

    if (playerError) {
      throw new Error(`Unable to load players: ${playerError.message}`);
    }

    const playersById = new Map(
      ((playerData ?? []) as PlayerRow[]).map((player) => [player.id, player])
    );

    const roundsByPlayer = new Map<string, RoundRow[]>();

    for (const round of allRounds) {
      const existing = roundsByPlayer.get(round.player_id);

      if (existing) {
        existing.push(round);
      } else {
        roundsByPlayer.set(round.player_id, [round]);
      }
    }

    const reportPlayers: AuditPlayerReport[] = (
      summaryRows as AuditSummaryRow[]
    ).map((summary) => {
      const player = playersById.get(String(summary.id));
      const playerRounds = roundsByPlayer.get(String(summary.id)) ?? [];

      const competitionRounds = playerRounds.filter((round) =>
        isCompetition(round.score_type)
      );

      const generalRounds = playerRounds.filter(
        (round) => !isCompetition(round.score_type)
      );

      const competitionIndex =
        toNumber(summary.last20CompetitionHi) ??
        calculateCategoryHi(competitionRounds);

      const generalIndex =
        toNumber(summary.last20GeneralPlayHi) ??
        calculateCategoryHi(generalRounds);

      const calculatedDifference =
        competitionIndex !== null && generalIndex !== null
          ? Number((generalIndex - competitionIndex).toFixed(1))
          : null;

      const competitionDifferentials = competitionRounds
        .map((round) => Number(round.differential))
        .filter(Number.isFinite);

      const generalDifferentials = generalRounds
        .map((round) => Number(round.differential))
        .filter(Number.isFinite);

      const last20Rounds = [...playerRounds]
        .sort(
          (a, b) =>
            new Date(b.played_at).getTime() -
            new Date(a.played_at).getTime()
        )
        .slice(0, 20)
        .map(mapRound);

      return {
        id: String(summary.id),
        name: player?.full_name ?? summary.full_name,
        ghinNumber: player?.ghin_number ?? null,

        currentIndex:
          toNumber(player?.current_index) ?? toNumber(summary.overallHi),

        competitionIndex,
        generalIndex,

        difference:
          calculatedDifference ??
          toNumber(summary.competitionVsOverallGap),

        flag: normalizeFlag(summary.flag),

        competitionRounds: competitionRounds.length,
        generalRounds: generalRounds.length,

        competitionAverage:
          toNumber(summary.competitionAvgDiff) ??
          average(competitionDifferentials),

        generalAverage:
          toNumber(summary.casualAvgDiff) ??
          average(generalDifferentials),

        competitionTrend: buildTrend(
          competitionRounds,
          "Competition"
        ),

        generalTrend: buildTrend(
          generalRounds,
          "General Play"
        ),

        rounds: last20Rounds,
      };
    });

    reportPlayers.sort(
      (a, b) =>
        (b.difference ?? Number.NEGATIVE_INFINITY) -
        (a.difference ?? Number.NEGATIVE_INFINITY)
    );

    const report: AuditReport = {
      generatedAt: new Date().toISOString(),
      players: reportPlayers,
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

    return Response.json(
      {
        error: "Unable to generate the audit PDF.",
        detail:
          error instanceof Error
            ? error.message
            : "An unknown error occurred.",
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