import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  buildAuditEvidence,
  calculateHandicapIndex,
  selectConservativeReviewHi,
  type AuditEvidence,
  type AuditEvidenceRound,
} from "@/lib/auditEvidence";
import { roundHandicapUpToHalf } from "@/lib/handicapRounding";

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
  const competitionSpecificGap =
    evidenceModel.goodrichGeneralHi != null &&
    evidenceModel.competitionHiForComparison != null
      ? Number(
          (
            evidenceModel.goodrichGeneralHi -
            evidenceModel.competitionHiForComparison
          ).toFixed(1)
        )
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

  if (gap == null || gap < 2) {
    return {
      code: "no_action",
      label: "No action",
      suggestedIndex: null,
      summary:
        "The Conservative Review HI is not established or its gap from the current HI is below the committee's 2.0-stroke review threshold.",
      evidence,
    };
  }

  if (evidenceModel.basis === "goodrich_general_monitor") {
    return {
      code: "monitor",
      label: "Monitor - insufficient competition history",
      suggestedIndex: null,
      summary:
        "Fewer than three competition rounds are available in the last two years. Goodrich general play is shown only as context and cannot support a competition adjustment.",
      evidence,
    };
  }

  if (evidenceModel.basis === "limited_competition") {
    return {
      code: "manual_review",
      label: "Manual review - limited evidence",
      suggestedIndex: null,
      summary:
        "Only 3-9 competition rounds are available and a Goodrich general-play HI could not be established for the intended blend.",
      evidence,
    };
  }

  if (
    competitionSpecificGap != null &&
    competitionSpecificGap <= 0
  ) {
    return {
      code: "no_adjustment",
      label: "No competition adjustment",
      suggestedIndex: null,
      summary:
        "Recent Goodrich general-play performance is at least as strong as recent competition performance, so the lower ability is not competition-specific.",
      evidence,
    };
  }

  if (
    (evidenceModel.basis === "goodrich_competition" ||
      evidenceModel.basis === "all_competition") &&
    (evidenceModel.sensitivity ?? 0) <= 1.5
  ) {
    const suggestedIndex = roundHandicapUpToHalf(competitionHi!);
    return {
      code: "adjustment_supported",
      label: `Adjustment supported - ${suggestedIndex.toFixed(1)}`,
      suggestedIndex,
      summary:
        "The conservative comparison still reaches the threshold, and the recent competition sample has acceptable single-score stability.",
      evidence,
    };
  }

  if (
    evidenceModel.basis === "blended_competition_general" &&
    (evidenceModel.sensitivity ?? 0) <= 1.5
  ) {
    const suggestedIndex = roundHandicapUpToHalf(competitionHi!);
    return {
      code: "provisional_adjustment",
      label: `Provisional - ${suggestedIndex.toFixed(1)}`,
      suggestedIndex,
      summary:
        "The conservative higher-of comparison still supports a lower provisional value. Review it as more competition rounds are posted.",
      evidence,
    };
  }

  return {
    code: "manual_review",
    label: "Manual review",
    suggestedIndex: null,
    summary:
      "The two-year threshold is met, but single-score sensitivity makes an automatic adjustment unreliable.",
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
    const [{ data, error }, allEvidenceRounds] = await Promise.all([
      supabase
        .from("player_handicap_summary")
        .select("*")
        .order("full_name"),
      getEvidenceRounds(cutoffDate),
    ]);

    if (error) throw error;

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

        const sandbagIndex =
          pointsFromGap(competitionVsOverallGap) +
          pointsFromGap(competitionVsGeneralGap);

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
            ["C", "CH", "CA", "ECH"].includes(round.score_type ?? "")
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
          reviewComparisonHi: reviewSelection.index,
          reviewComparisonBasisLabel: reviewSelection.basisLabel,
          reviewUsedBenefitOfDoubt:
            reviewSelection.usedBenefitOfDoubt,
          last20GeneralPlayHi: generalPlayHi,
          competitionVsOverallGap,
          competitionVsGoodrichGeneralGap: competitionVsGeneralGap,
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
