import React from "react";
import {
  renderToBuffer,
  type DocumentProps,
} from "@react-pdf/renderer";

import { AuditBook } from "@/components/pdf/AuditBook";
import {
  buildAuditEvidence,
  calculateHandicapIndex,
  isCompetitionScoreType,
  isGoodrichCourse,
  selectConservativeReviewHi,
  whsUsedDifferentialCount,
} from "@/lib/auditEvidence";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type {
  AuditBreakdownRow,
  AuditPlayerReport,
  AuditReport,
  AuditReportDecision,
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
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

function isCompetition(scoreType: string | null | undefined): boolean {
  return isCompetitionScoreType(scoreType);
}

function whsUsedCount(roundCount: number): number {
  return whsUsedDifferentialCount(roundCount);
}

function last20(rounds: RoundRow[]): RoundRow[] {
  return [...rounds]
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
}

function calculateCategoryHi(rounds: RoundRow[]): number | null {
  return calculateHandicapIndex(rounds);
}

function buildTrend(rounds: RoundRow[]): AuditTrendPoint[] {
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

    if (handicapIndex !== null) {
      points.push({ date: round.played_at, handicapIndex });
    }
  });

  return points.slice(-10);
}

function flagForDifference(
  difference: number | null
): AuditPlayerReport["flag"] {
  if (difference !== null && difference >= 1.5) return "INVESTIGATE";
  if (difference !== null && difference >= 1.0) return "REVIEW";
  return "NO ACTION";
}

function decisionPriority(code: AuditReportDecision["code"]) {
  if (
    code === "adjustment_supported" ||
    code === "provisional_adjustment" ||
    code === "manual_review"
  ) {
    return 0;
  }

  if (code === "monitor") return 1;
  return 2;
}

function nextStepsForDecision(
  decision: Omit<AuditReportDecision, "nextSteps">
): string[] {
  const suggested =
    decision.suggestedIndex == null
      ? null
      : decision.suggestedIndex.toFixed(1);

  if (decision.code === "adjustment_supported") {
    return [
      `Confirm the competition-only Committee-Adjusted Playing Handicap${suggested ? ` at ${suggested}` : ""}.`,
      "Notify the player and event staff that the official GHIN Handicap Index remains unchanged.",
      "Recalculate the two-year evidence model weekly and round the selected Committee Evidence HI up to the nearest 0.5.",
      "Record the effective date and review again after meaningful scoring changes.",
    ];
  }

  if (decision.code === "provisional_adjustment") {
    return [
      `If the committee acts, record a provisional competition-only value${suggested ? ` of ${suggested}` : ""}.`,
      "Notify the player that the value is temporary and does not change GHIN.",
      "Recalculate the two-year blend weekly and review after two or three additional eligible competition rounds.",
    ];
  }

  if (decision.code === "manual_review") {
    return [
      "Review the highlighted low differential, sample size, and score history before acting.",
      `Document the included or excluded score logic and the committee-approved value${suggested ? ` of ${suggested}` : ""}.`,
      "Notify the player of any competition-only decision and revisit it after additional competition scores.",
    ];
  }

  if (decision.code === "monitor") {
    return [
      "Make no immediate adjustment.",
      "Continue the weekly two-year evidence comparison and watch for a stable 2.0-stroke gap.",
      "Reopen the review after additional eligible competition rounds or a material scoring change.",
    ];
  }

  if (decision.code === "no_adjustment") {
    return [
      "Make no competition-only adjustment at this time.",
      "Document whether historical scores or comparable general-play performance explain the flag.",
      "Continue normal weekly monitoring and reopen only if recent evidence changes.",
    ];
  }

  return [
    "No committee action is recommended because the two-year 2.0-stroke review threshold is not met.",
    "Continue the normal weekly audit process.",
  ];
}

function scoreOf(round: RoundRow): number | null {
  if (round.adjusted_gross_score !== null) {
    return Number(round.adjusted_gross_score);
  }
  if (round.gross_score !== null) {
    return Number(round.gross_score);
  }
  return null;
}

function mapRound(round: RoundRow, usedDiffs: number[]): AuditRound {
  const differential = Number(round.differential);

  return {
    id: round.id,
    playedAt: round.played_at,
    courseName: round.course_name ?? "Unknown course",
    teeName: round.tee_name ?? "-",
    score: scoreOf(round),
    differential,
    category: isCompetition(round.score_type)
      ? "Competition"
      : "General Play",
    usedInCalculation: usedDiffs.includes(differential),
  };
}

function buildBreakdownRow(
  label: string,
  rounds: RoundRow[],
  maximumRounds = 20
): AuditBreakdownRow {
  const selected = last20(rounds).slice(0, maximumRounds);
  const sortedDiffs = selected
    .map((round) => Number(round.differential))
    .sort((a, b) => a - b);

  const used = whsUsedCount(sortedDiffs.length);
  const usedDifferentials = sortedDiffs.slice(0, used);

  return {
    label,
    rounds: selected.length,
    used,
    calculatedHi: calculateHandicapIndex(selected, maximumRounds),
    averageDifferential: average(sortedDiffs),
    scores: selected
      .map(scoreOf)
      .filter((value): value is number => value !== null),
    differentials: sortedDiffs,
    usedDifferentials,
  };
}

async function getAllOfficialRounds(): Promise<RoundRow[]> {
  const supabase = createSupabaseServerClient();
  const pageSize = 1000;

  // Use a Map keyed by round ID so duplicate pages or unstable ordering
  // can never produce duplicate rounds.
  const roundsById = new Map<string, RoundRow>();

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
      .order("id", { ascending: false })
      .range(start, start + pageSize - 1);

    if (error) {
      throw new Error(
        `Unable to load official rounds: ${error.message}`
      );
    }

    const page = (data ?? []) as RoundRow[];

    for (const round of page) {
      roundsById.set(round.id, round);
    }

    if (page.length < pageSize) {
      break;
    }
  }

  // Return in the same order expected by the rest of the report.
  return Array.from(roundsById.values()).sort((a, b) => {
    const dateDiff =
      new Date(b.played_at).getTime() - new Date(a.played_at).getTime();

    if (dateDiff !== 0) {
      return dateDiff;
    }

    return b.id.localeCompare(a.id);
  });
}

export async function GET(request: Request) {
  try {
    const playerId = new URL(request.url).searchParams.get("playerId");
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

    const summaryById = new Map(
      (summaryRows as AuditSummaryRow[]).map((summary) => [
        String(summary.id),
        summary,
      ])
    );

    const roundsByPlayer = new Map<string, RoundRow[]>();
    for (const round of allRounds) {
      const existing = roundsByPlayer.get(round.player_id) ?? [];
      existing.push(round);
      roundsByPlayer.set(round.player_id, existing);
    }

    const requestedPlayers = ((playerData ?? []) as PlayerRow[]).filter(
      (player) => !playerId || player.id === playerId
    );

    const reportPlayers: AuditPlayerReport[] = requestedPlayers
      .map((player): AuditPlayerReport | null => {
        const summary = summaryById.get(player.id);
        const playerRounds = roundsByPlayer.get(player.id) ?? [];

        const competitionRounds = playerRounds.filter((round) =>
          isCompetition(round.score_type)
        );

        // The export includes every player with at least five official
        // competition scores, regardless of their review status.
        if (!playerId && competitionRounds.length < 5) return null;

        const generalRounds = playerRounds.filter(
          (round) => !isCompetition(round.score_type)
        );
        const evidenceCutoff = new Date();
        evidenceCutoff.setUTCFullYear(
          evidenceCutoff.getUTCFullYear() - 2
        );
        const fallbackEvidenceCutoffDate = evidenceCutoff
          .toISOString()
          .slice(0, 10);
        const evidenceCutoffDate =
          summary?.evidenceCutoffDate ?? fallbackEvidenceCutoffDate;
        const evidenceModel = buildAuditEvidence(
          playerRounds,
          evidenceCutoffDate
        );
        const evidencePeriodRounds = playerRounds.filter(
          (round) => round.played_at >= evidenceCutoffDate
        );
        const goodrichCompetition24MonthsRounds =
          evidencePeriodRounds.filter(
            (round) =>
              isCompetition(round.score_type) &&
              isGoodrichCourse(round.course_name)
          );
        const allCompetition24MonthsRounds = evidencePeriodRounds.filter(
          (round) => isCompetition(round.score_type)
        );
        const goodrichGeneralLast10Rounds = evidencePeriodRounds
          .filter(
            (round) =>
              !isCompetition(round.score_type) &&
              isGoodrichCourse(round.course_name)
          )
          .sort(
            (a, b) =>
              new Date(b.played_at).getTime() -
              new Date(a.played_at).getTime()
          )
          .slice(0, 10);
        const twelveMonthCutoff = new Date();
        twelveMonthCutoff.setUTCFullYear(
          twelveMonthCutoff.getUTCFullYear() - 1
        );
        const twelveMonthCutoffDate = twelveMonthCutoff
          .toISOString()
          .slice(0, 10);
        const last12MonthsCompetitionRounds = competitionRounds.filter(
          (round) => round.played_at >= twelveMonthCutoffDate
        );

        const overallSelected = last20(playerRounds);
        const overallSortedDiffs = overallSelected
          .map((round) => Number(round.differential))
          .sort((a, b) => a - b);
        const overallUsedDiffs = overallSortedDiffs.slice(
          0,
          whsUsedCount(overallSortedDiffs.length)
        );

        const currentIndex =
          toNumber(player.current_index) ??
          toNumber(summary?.overallHi);

        const competitionIndex =
          toNumber(summary?.last20CompetitionHi) ??
          calculateCategoryHi(competitionRounds);

        const generalIndex =
          toNumber(summary?.last20GeneralPlayHi) ??
          calculateCategoryHi(generalRounds);

        const last12MonthsCompetitionIndex =
          toNumber(summary?.last12MonthsCompetitionHi) ??
          calculateCategoryHi(last12MonthsCompetitionRounds);
        const goodrichCompetition24MonthsIndex =
          toNumber(summary?.goodrichCompetition24MonthsHi) ??
          evidenceModel.goodrichCompetitionHi;
        const allCompetition24MonthsIndex =
          toNumber(summary?.allCompetition24MonthsHi) ??
          evidenceModel.allCompetitionHi;
        const goodrichGeneralLast10Index =
          toNumber(summary?.goodrichGeneralLast10Hi) ??
          evidenceModel.goodrichGeneralHi;
        const committeeEvidenceIndex =
          toNumber(summary?.committeeEvidenceHi) ??
          evidenceModel.committeeEvidenceHi;
        const reviewSelection = selectConservativeReviewHi({
          goodrichCompetitionRounds:
            evidenceModel.goodrichCompetitionRounds,
          last20CompetitionHi: competitionIndex,
          committeeEvidenceHi: committeeEvidenceIndex,
        });
        const reviewComparisonIndex =
          toNumber(summary?.reviewComparisonHi) ?? reviewSelection.index;
        const reviewComparisonBasisLabel =
          summary?.reviewComparisonBasisLabel ??
          reviewSelection.basisLabel;

        const baseDecision: Omit<AuditReportDecision, "nextSteps"> = summary
          ? {
              code: summary.decision.code,
              label: summary.decision.label,
              suggestedIndex: summary.decision.suggestedIndex,
              summary: summary.decision.summary,
              evidence: summary.decision.evidence,
            }
          : {
              code: "no_action",
              label: "Decision analysis unavailable",
              suggestedIndex: null,
              summary:
                "The detailed audit decision could not be matched to this player.",
              evidence: [
                "Review the player's web audit before taking committee action.",
              ],
            };
        const decision: AuditReportDecision = {
          ...baseDecision,
          nextSteps: nextStepsForDecision(baseDecision),
        };

        // Positive means the player's current GHIN Handicap Index is higher
        // than the conservative Committee Review HI. This is the
        // report's ranking and review variable.
        const currentVsCompetitionDifference =
          currentIndex !== null && reviewComparisonIndex !== null
            ? Number((currentIndex - reviewComparisonIndex).toFixed(1))
            : null;
        const competitionVsGoodrichGeneralGap =
          toNumber(summary?.competitionVsGoodrichGeneralGap) ??
          (goodrichGeneralLast10Index !== null &&
          evidenceModel.competitionHiForComparison !== null
            ? Number(
                (
                  goodrichGeneralLast10Index -
                  evidenceModel.competitionHiForComparison
                ).toFixed(1)
              )
            : null);
        const sandbagScore =
          toNumber(summary?.sandbagIndex) ??
          Math.round(
            Math.max(0, currentVsCompetitionDifference ?? 0) * 10
          ) +
            Math.round(
              Math.max(0, competitionVsGoodrichGeneralGap ?? 0) * 10
            );

        return {
          id: player.id,
          name: player.full_name,
          ghinNumber: player.ghin_number,
          currentIndex,
          competitionIndex,
          last12MonthsCompetitionIndex,
          last12MonthsCompetitionRounds:
            last12MonthsCompetitionRounds.length,
          evidenceCutoffDate,
          goodrichCompetition24MonthsIndex,
          goodrichCompetition24MonthsRounds:
            goodrichCompetition24MonthsRounds.length,
          allCompetition24MonthsIndex,
          allCompetition24MonthsRounds:
            allCompetition24MonthsRounds.length,
          goodrichGeneralLast10Index,
          goodrichGeneralLast10Rounds:
            goodrichGeneralLast10Rounds.length,
          committeeEvidenceIndex,
          committeeEvidenceBasisLabel:
            summary?.committeeEvidenceBasisLabel ??
            evidenceModel.basisLabel,
          committeeEvidenceFormula:
            summary?.committeeEvidenceFormula ?? evidenceModel.formula,
          reviewComparisonIndex,
          reviewComparisonBasisLabel,
          generalIndex,
          difference: currentVsCompetitionDifference,
          competitionVsGoodrichGeneralGap,
          sandbagScore,
          flag: flagForDifference(currentVsCompetitionDifference),
          competitionRounds: competitionRounds.length,
          generalRounds: generalRounds.length,
          competitionAverage:
            toNumber(summary?.competitionAvgDiff) ??
            average(
              competitionRounds.map((round) => Number(round.differential))
            ),
          generalAverage:
            toNumber(summary?.casualAvgDiff) ??
            average(generalRounds.map((round) => Number(round.differential))),
          competitionTrend: buildTrend(competitionRounds),
          generalTrend: buildTrend(generalRounds),
          rounds: overallSelected.map((round) =>
            mapRound(round, overallUsedDiffs)
          ),
          breakdown: [
            buildBreakdownRow("Overall Handicap Rounds", playerRounds),
            buildBreakdownRow(
              "Competition Handicap Rounds",
              competitionRounds
            ),
            buildBreakdownRow(
              "General Play Handicap Rounds",
              generalRounds
            ),
            buildBreakdownRow(
              "24 Months - Goodrich Competition",
              goodrichCompetition24MonthsRounds
            ),
            buildBreakdownRow(
              "24 Months - All Competition",
              allCompetition24MonthsRounds
            ),
            buildBreakdownRow(
              "Last 10 Goodrich General Play (24 Months)",
              goodrichGeneralLast10Rounds,
              10
            ),
          ],
          decision,
        };
      })
      .filter((player): player is AuditPlayerReport => player !== null);

    if (playerId && !reportPlayers.length) {
      return Response.json(
        { error: "Player not found." },
        { status: 404 }
      );
    }

    reportPlayers.sort((a, b) => {
      const priorityDifference =
        decisionPriority(a.decision.code) -
        decisionPriority(b.decision.code);

      if (priorityDifference !== 0) return priorityDifference;

      const aDifference = a.difference ?? Number.NEGATIVE_INFINITY;
      const bDifference = b.difference ?? Number.NEGATIVE_INFINITY;

      if (aDifference !== bDifference) return bDifference - aDifference;
      return a.name.localeCompare(b.name);
    });

    const report: AuditReport = {
      generatedAt: new Date().toISOString(),
      players: reportPlayers,
    };

    const document = React.createElement(AuditBook, {
      report,
    }) as unknown as React.ReactElement<DocumentProps>;

    const buffer = await renderToBuffer(document);
    const date = new Date().toISOString().slice(0, 10);
    const fileName = playerId
      ? `${reportPlayers[0].name.replace(/[^a-zA-Z0-9.-]+/g, "-")}-handicap-audit-${date}.pdf`
      : `goodrich-audit-${date}.pdf`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
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
      { status: 500 }
    );
  }
}
