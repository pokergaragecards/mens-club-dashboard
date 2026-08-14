import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  buildAuditEvidence,
  calculateHandicapIndex,
  isCompetitionScoreType,
  selectConservativeReviewHi,
  type AuditEvidence,
  type AuditEvidenceRound,
} from "@/lib/auditEvidence";
import { roundHandicapUpToHalf } from "@/lib/handicapRounding";
import { conservativeReviewRequiresAdjustment } from "@/lib/auditDecisionPolicy";

const supabase = createSupabaseServerClient();

type Period = "last20" | "30" | "60" | "90" | "season";

type HandicapSummaryRow = {
  player_id: string;
  full_name: string;
  ghin_number: string | null;
  overall_hi: number | string | null;
  competition_rounds: number | string | null;
  casual_rounds: number | string | null;
  total_rounds: number | string | null;
  competition_avg_diff: number | string | null;
  casual_avg_diff: number | string | null;
  competition_scoring_avg: number | string | null;
  casual_scoring_avg: number | string | null;
  last20_competition_hi: number | string | null;
  last20_general_play_hi: number | string | null;
};

type EvidenceRoundRow = AuditEvidenceRound & {
  id: string;
  player_id: string;
  played_at: string;
  differential: number | string | null;
  score_type: string | null;
  course_name: string | null;
};

type PlayerEmailRow = {
  id: string;
  email: string | null;
};

export type AuditDecisionCode =
  | "adjustment_supported"
  | "provisional_adjustment"
  | "manual_review"
  | "monitor"
  | "no_adjustment"
  | "no_action";

type AuditDecision = {
  code: AuditDecisionCode;
  label: string;
  suggestedIndex: number | null;
  summary: string;
  evidence: string[];
};

function num(value: unknown) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pointsFromGap(gap: number | null) {
  if (gap == null || gap <= 0) return 0;
  return Math.round(gap * 10);
}

function getFlag(score: number) {
  if (score >= 50) return "Investigate";
  if (score >= 30) return "Review";
  if (score >= 15) return "Watch";
  return "Normal";
}

function confidenceFromEvidence(evidence: AuditEvidence) {
  if (evidence.basis === "goodrich_competition") return "High";
  if (
    evidence.basis === "all_competition" ||
    evidence.basis === "blended_competition_general"
  ) {
    return "Medium";
  }
  return "Low";
}

function buildDecision(params: {
  overallHi: number | null;
  generalPlayHi: number | null;
  evidenceModel: AuditEvidence;
  reviewComparisonHi: number | null;
  reviewComparisonBasisLabel: string;
}): AuditDecision {
  const {
    overallHi,
    generalPlayHi,
    evidenceModel,
    reviewComparisonHi,
    reviewComparisonBasisLabel,
  } = params;
  const competitionHi = reviewComparisonHi;
  const gap =
    overallHi != null && competitionHi != null
      ? Number((overallHi - competitionHi).toFixed(1))
      : null;
  const evidence = [
    `Official/Overall HI: ${overallHi?.toFixed(1) ?? "-"}; Two-Year Committee Evidence HI: ${evidenceModel.committeeEvidenceHi?.toFixed(1) ?? "not established"}.`,
    `Conservative Review HI: ${competitionHi?.toFixed(1) ?? "not established"}; gap: ${gap?.toFixed(1) ?? "-"}; source: ${reviewComparisonBasisLabel}.`,
    `Goodrich competition in the last 24 months: ${evidenceModel.goodrichCompetitionRounds} rounds and a ${evidenceModel.goodrichCompetitionHi?.toFixed(1) ?? "not established"} HI.`,
    `All competition in the last 24 months: ${evidenceModel.allCompetitionRounds} rounds and a ${evidenceModel.allCompetitionHi?.toFixed(1) ?? "not established"} HI.`,
    `Last ${evidenceModel.goodrichGeneralRounds} Goodrich general-play rounds available in the last 24 months: ${evidenceModel.goodrichGeneralHi?.toFixed(1) ?? "HI not established"}.`,
    `Selection rule: ${evidenceModel.formula}`,
    `All-time Last-20 General Play HI for context: ${generalPlayHi?.toFixed(1) ?? "-"}.`,
  ];

  if (evidenceModel.sensitivity != null) {
    evidence.push(
      `Removing the single lowest differential from the selected 24-month competition group changes its HI by ${evidenceModel.sensitivity.toFixed(1)} strokes.`
    );
  }

  if (
    !conservativeReviewRequiresAdjustment({
      currentHi: overallHi,
      conservativeReviewHi: competitionHi,
    })
  ) {
    return {
      code: "no_action",
      label: "No action",
      suggestedIndex: null,
      summary:
        "The Conservative Review HI is not established or its gap from the current HI is below the committee's 2.0-stroke review threshold.",
      evidence,
    };
  }

  const suggestedIndex = roundHandicapUpToHalf(competitionHi!);
  return {
    code: "adjustment_supported",
    label: `Adjustment supported - ${suggestedIndex.toFixed(1)}`,
    suggestedIndex,
    summary: `The Current Handicap Index is ${gap!.toFixed(
      1
    )} strokes higher than the Conservative Review HI. This 2.0-stroke comparison is the final adjustment test for every golfer; evidence source, sample size, and single-score sensitivity remain visible context but do not override the result.`,
    evidence,
  };
}

async function getEvidenceRounds(cutoffDate: string) {
  const rows: EvidenceRoundRow[] = [];
  const pageSize = 1000;

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from("player_display_rounds")
      .select(
        "id, player_id, played_at, differential, score_type, course_name"
      )
      .eq("counts_for_hi", true)
      .not("differential", "is", null)
      .gte("played_at", cutoffDate)
      .order("played_at", { ascending: false })
      .order("id", { ascending: true })
      .range(start, start + pageSize - 1);

    if (error) throw error;

    const page = (data ?? []) as EvidenceRoundRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

export const auditService = {
  async getAuditRows(_period: Period) {
    void _period;
    const cutoff = new Date();
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 2);
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    const [
      { data, error },
      allEvidenceRounds,
      { data: playerEmailRows, error: playerEmailError },
    ] = await Promise.all([
      supabase
        .from("player_handicap_summary")
        .select("*")
        .order("full_name"),
      getEvidenceRounds(cutoffDate),
      supabase.from("players").select("id, email"),
    ]);

    if (error) throw error;
    if (playerEmailError) throw playerEmailError;

    const emailByPlayer = new Map(
      ((playerEmailRows ?? []) as PlayerEmailRow[]).map((player) => [
        player.id,
        player.email?.trim() || null,
      ])
    );

    const evidenceByPlayer = new Map<string, EvidenceRoundRow[]>();
    for (const round of allEvidenceRounds) {
      const playerRounds = evidenceByPlayer.get(round.player_id) ?? [];
      playerRounds.push(round);
      evidenceByPlayer.set(round.player_id, playerRounds);
    }

    return ((data ?? []) as HandicapSummaryRow[])
      .map((row) => {
        const overallHi = num(row.overall_hi);
        const competitionHi = num(row.last20_competition_hi);
        const generalPlayHi = num(row.last20_general_play_hi);

        const playerEvidenceRounds = evidenceByPlayer.get(row.player_id) ?? [];
        const evidenceModel = buildAuditEvidence(
          playerEvidenceRounds,
          cutoffDate
        );
        const reviewSelection = selectConservativeReviewHi({
          goodrichCompetitionRounds:
            evidenceModel.goodrichCompetitionRounds,
          last20CompetitionHi: competitionHi,
          committeeEvidenceHi: evidenceModel.committeeEvidenceHi,
        });
        const competitionVsOverallGap =
          overallHi != null && reviewSelection.index != null
            ? Number(
                (overallHi - reviewSelection.index).toFixed(1)
              )
            : null;
        const competitionVsGeneralGap =
          evidenceModel.goodrichGeneralHi != null &&
          evidenceModel.competitionHiForComparison != null
            ? Number(
                (
                  evidenceModel.goodrichGeneralHi -
                  evidenceModel.competitionHiForComparison
                ).toFixed(1)
              )
            : null;

        const strokeDiscrepancyPoints =
          competitionVsOverallGap == null
            ? null
            : pointsFromGap(competitionVsOverallGap);
        const goodrichComparisonPoints =
          competitionVsGeneralGap == null
            ? null
            : pointsFromGap(competitionVsGeneralGap);
        const sandbagIndex =
          (strokeDiscrepancyPoints ?? 0) +
          (goodrichComparisonPoints ?? 0);

        const competitionRounds = Number(row.competition_rounds ?? 0);
        const casualRounds = Number(row.casual_rounds ?? 0);
        const totalRounds = Number(row.total_rounds ?? 0);
        const twelveMonthCutoff = new Date();
        twelveMonthCutoff.setUTCFullYear(
          twelveMonthCutoff.getUTCFullYear() - 1
        );
        const twelveMonthCutoffDate = twelveMonthCutoff
          .toISOString()
          .slice(0, 10);
        const last12MonthsCompetitionRounds = playerEvidenceRounds.filter(
          (round) =>
            round.played_at >= twelveMonthCutoffDate &&
            isCompetitionScoreType(round.score_type)
        );
        const decision = buildDecision({
          overallHi,
          generalPlayHi,
          evidenceModel,
          reviewComparisonHi: reviewSelection.index,
          reviewComparisonBasisLabel: reviewSelection.basisLabel,
        });

        const reasons: string[] = [];

        if (competitionVsOverallGap != null && competitionVsOverallGap > 0) {
          reasons.push(
            `Conservative Review HI is ${competitionVsOverallGap.toFixed(
              1
            )} lower than Overall HI.`
          );
        }

        if (competitionVsGeneralGap != null && competitionVsGeneralGap > 0) {
          reasons.push(
            `Recent competition HI is ${competitionVsGeneralGap.toFixed(
              1
            )} lower than the Last-10 Goodrich General HI.`
          );
        }

        if (!reasons.length) {
          reasons.push("No major competition-underperformance flag.");
        }

        return {
          id: row.player_id,
          full_name: row.full_name,
          email: emailByPlayer.get(row.player_id) ?? null,

          overallHi,
          competitionHi,
          generalPlayHi,
          last20CompetitionHi: competitionHi,
          last12MonthsCompetitionHi: calculateHandicapIndex(
            last12MonthsCompetitionRounds
          ),
          last12MonthsCompetitionRounds:
            last12MonthsCompetitionRounds.length,
          evidenceCutoffDate: evidenceModel.cutoffDate,
          goodrichCompetition24MonthsHi:
            evidenceModel.goodrichCompetitionHi,
          goodrichCompetition24MonthsRounds:
            evidenceModel.goodrichCompetitionRounds,
          allCompetition24MonthsHi: evidenceModel.allCompetitionHi,
          allCompetition24MonthsRounds:
            evidenceModel.allCompetitionRounds,
          goodrichGeneralLast10Hi: evidenceModel.goodrichGeneralHi,
          goodrichGeneralLast10Rounds:
            evidenceModel.goodrichGeneralRounds,
          committeeEvidenceHi: evidenceModel.committeeEvidenceHi,
          committeeEvidenceBasis: evidenceModel.basis,
          committeeEvidenceBasisLabel: evidenceModel.basisLabel,
          committeeEvidenceFormula: evidenceModel.formula,
          evidenceCompetitionWeight: evidenceModel.competitionWeight,
          evidenceGeneralWeight: evidenceModel.generalWeight,
          competitionHiForComparison:
            evidenceModel.competitionHiForComparison,
          evidenceSensitivity: evidenceModel.sensitivity,
          reviewComparisonHi: reviewSelection.index,
          reviewComparisonBasisLabel: reviewSelection.basisLabel,
          reviewUsedBenefitOfDoubt:
            reviewSelection.usedBenefitOfDoubt,
          last20GeneralPlayHi: generalPlayHi,
          competitionVsOverallGap,
          competitionVsGoodrichGeneralGap: competitionVsGeneralGap,
          strokeDiscrepancyThresholdMet:
            competitionVsOverallGap == null
              ? null
              : competitionVsOverallGap >= 2,
          strokeDiscrepancyPoints,
          goodrichComparisonPoints,
          decision,

          competitionRounds,
          casualRounds,
          totalRounds,

          competitionAvgDiff: num(row.competition_avg_diff),
          casualAvgDiff: num(row.casual_avg_diff),
          competitionScoringAverage: num(row.competition_scoring_avg),
          casualScoringAverage: num(row.casual_scoring_avg),

          sandbagIndex,
          flag: getFlag(sandbagIndex),
          confidence: confidenceFromEvidence(evidenceModel),

          reasons,
        };
      })
      .sort((a, b) => b.sandbagIndex - a.sandbagIndex);
  },
};
