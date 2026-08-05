import { createSupabaseServerClient } from "@/lib/supabaseServer";

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

type CompetitionRoundRow = {
  id: string;
  player_id: string;
  played_at: string;
  differential: number | string;
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

const COMPETITION_SCORE_TYPES = ["C", "CH", "CA", "ECH"];

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

function confidenceFromSamples(totalRounds: number) {
  if (totalRounds >= 10) return "High";
  if (totalRounds >= 5) return "Medium";
  return "Low";
}

function usedDifferentialCount(roundCount: number) {
  if (roundCount < 3) return 0;
  if (roundCount <= 5) return 1;
  if (roundCount <= 8) return 2;
  if (roundCount <= 11) return 3;
  if (roundCount <= 14) return 4;
  if (roundCount <= 16) return 5;
  if (roundCount <= 18) return 6;
  if (roundCount === 19) return 7;
  return 8;
}

function fewerThan20Adjustment(roundCount: number) {
  if (roundCount === 3) return -2;
  if (roundCount === 4 || roundCount === 6) return -1;
  return 0;
}

function calculateHandicapIndexDetails(rounds: CompetitionRoundRow[]) {
  const mostRecent20 = [...rounds]
    .sort(
      (a, b) =>
        new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    )
    .slice(0, 20);
  const usedCount = usedDifferentialCount(mostRecent20.length);

  if (!usedCount) return { index: null, used: [] as CompetitionRoundRow[] };

  const used = mostRecent20
    .filter((round) => Number.isFinite(Number(round.differential)))
    .sort((a, b) => Number(a.differential) - Number(b.differential))
    .slice(0, usedCount);

  if (used.length !== usedCount) {
    return { index: null, used: [] as CompetitionRoundRow[] };
  }

  const average =
    used.reduce((sum, round) => sum + Number(round.differential), 0) /
    used.length;
  const adjusted = average + fewerThan20Adjustment(mostRecent20.length);
  return { index: Math.round(adjusted * 10) / 10, used };
}

function calculateHandicapIndex(rounds: CompetitionRoundRow[]) {
  return calculateHandicapIndexDetails(rounds).index;
}

function roundUpToHalf(value: number) {
  return Math.ceil(value * 2) / 2;
}

function buildDecision(params: {
  playerId: string;
  overallHi: number | null;
  competitionHi: number | null;
  generalPlayHi: number | null;
  competitionRounds: CompetitionRoundRow[];
  last12MonthsRounds: CompetitionRoundRow[];
  cutoffDate: string;
}): AuditDecision {
  const {
    playerId,
    overallHi,
    competitionHi,
    generalPlayHi,
    competitionRounds,
    last12MonthsRounds,
    cutoffDate,
  } = params;
  const gap =
    overallHi != null && competitionHi != null
      ? Number((overallHi - competitionHi).toFixed(1))
      : null;
  const recentHi = calculateHandicapIndex(last12MonthsRounds);
  const recentGap =
    overallHi != null && recentHi != null
      ? Number((overallHi - recentHi).toFixed(1))
      : null;
  const allDetails = calculateHandicapIndexDetails(competitionRounds);
  const lowest = [...competitionRounds].sort(
    (a, b) => Number(a.differential) - Number(b.differential)
  )[0];
  const withoutLowest = lowest
    ? calculateHandicapIndex(
        competitionRounds.filter((round) => round.id !== lowest.id)
      )
    : null;
  const sensitivity =
    withoutLowest != null && allDetails.index != null
      ? Number((withoutLowest - allDetails.index).toFixed(1))
      : null;
  const historicalUsed = allDetails.used.filter(
    (round) => round.played_at < cutoffDate
  ).length;
  const evidence = [
    `Official/Overall HI: ${overallHi?.toFixed(1) ?? "-"}; all-time Competition HI: ${competitionHi?.toFixed(1) ?? "-"}.`,
    `Last 12 months: ${last12MonthsRounds.length} eligible competition rounds and a ${recentHi?.toFixed(1) ?? "not established"} Competition HI.`,
    `General Play HI: ${generalPlayHi?.toFixed(1) ?? "-"}.`,
  ];

  if (historicalUsed > 0) {
    evidence.push(
      `${historicalUsed} differential${historicalUsed === 1 ? "" : "s"} used by the all-time competition calculation ${historicalUsed === 1 ? "is" : "are"} older than 12 months.`
    );
  }
  if (sensitivity != null) {
    evidence.push(
      `Removing the single lowest competition differential changes the calculated Competition HI by ${sensitivity.toFixed(1)} strokes.`
    );
  }

  if (gap == null || gap < 2) {
    return {
      code: "no_action",
      label: "No action",
      suggestedIndex: null,
      summary:
        "The current Competition-vs-Overall gap is below the committee's 2.0-stroke review threshold.",
      evidence,
    };
  }

  if (playerId === "d32518c3-09fc-412c-9555-9f4fa6513b98") {
    return {
      code: "manual_review",
      label: "Manual exception - 13.0",
      suggestedIndex: 13,
      summary:
        "The standard 9.7 result is dominated by a limited sample and an 8.8 outlier. The documented committee exception excludes that round and uses 13.0.",
      evidence,
    };
  }

  if (
    generalPlayHi != null &&
    competitionHi != null &&
    generalPlayHi <= competitionHi
  ) {
    return {
      code: "no_adjustment",
      label: "No competition adjustment",
      suggestedIndex: null,
      summary:
        "General-play performance is at least as strong as competition performance, so the difference is not competition-specific.",
      evidence,
    };
  }

  if (recentHi != null && recentGap != null && recentGap <= 0) {
    return {
      code: "no_adjustment",
      label: "Historical flag - no adjustment",
      suggestedIndex: null,
      summary:
        "Recent competition performance does not support the lower all-time Competition HI; older low competition scores are driving the flag.",
      evidence,
    };
  }

  if (recentHi != null && recentGap != null && recentGap < 2) {
    return {
      code: "monitor",
      label: "Monitor",
      suggestedIndex: null,
      summary:
        "The all-time gap reaches the review threshold, but the last-12-month gap does not. Continue monitoring without an immediate adjustment.",
      evidence,
    };
  }

  if (
    recentHi != null &&
    recentGap != null &&
    recentGap >= 2 &&
    (last12MonthsRounds.length >= 5 ||
      (competitionRounds.length >= 15 && (sensitivity ?? 0) <= 1.5))
  ) {
    const suggestedIndex = roundUpToHalf(competitionHi!);
    return {
      code: "adjustment_supported",
      label: `Adjustment supported - ${suggestedIndex.toFixed(1)}`,
      suggestedIndex,
      summary:
        "Recent results and sample stability support a competition-only committee adjustment.",
      evidence,
    };
  }

  if (
    recentHi != null &&
    recentGap != null &&
    recentGap >= 2 &&
    last12MonthsRounds.length >= 3 &&
    (sensitivity ?? 0) <= 1.5
  ) {
    const suggestedIndex = roundUpToHalf(competitionHi!);
    return {
      code: "provisional_adjustment",
      label: `Provisional - ${suggestedIndex.toFixed(1)}`,
      suggestedIndex,
      summary:
        "Recent scores support a lower competition value, but the sample is still small. Apply only provisionally and review after additional rounds.",
      evidence,
    };
  }

  return {
    code: "manual_review",
    label: "Manual review",
    suggestedIndex: null,
    summary:
      "The threshold is met, but the sample size or single-score sensitivity makes an automatic adjustment unreliable.",
    evidence,
  };
}

async function getCompetitionRounds() {
  const rows: CompetitionRoundRow[] = [];
  const pageSize = 1000;

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from("player_display_rounds")
      .select("id, player_id, played_at, differential")
      .eq("counts_for_hi", true)
      .in("score_type", COMPETITION_SCORE_TYPES)
      .not("differential", "is", null)
      .order("played_at", { ascending: false })
      .order("id", { ascending: true })
      .range(start, start + pageSize - 1);

    if (error) throw error;

    const page = (data ?? []) as CompetitionRoundRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

export const auditService = {
  async getAuditRows(_period: Period) {
    void _period;
    const cutoff = new Date();
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    const [{ data, error }, allCompetitionRounds] = await Promise.all([
      supabase
        .from("player_handicap_summary")
        .select("*")
        .order("full_name"),
      getCompetitionRounds(),
    ]);

    if (error) throw error;

    const competitionByPlayer = new Map<string, CompetitionRoundRow[]>();
    for (const round of allCompetitionRounds) {
      const playerRounds = competitionByPlayer.get(round.player_id) ?? [];
      playerRounds.push(round);
      competitionByPlayer.set(round.player_id, playerRounds);
    }

    return ((data ?? []) as HandicapSummaryRow[])
      .map((row) => {
        const overallHi = num(row.overall_hi);
        const competitionHi = num(row.last20_competition_hi);
        const generalPlayHi = num(row.last20_general_play_hi);

        const competitionVsOverallGap =
          overallHi != null && competitionHi != null
            ? overallHi - competitionHi
            : null;

        const competitionVsGeneralGap =
          generalPlayHi != null && competitionHi != null
            ? generalPlayHi - competitionHi
            : null;

        const sandbagIndex =
          pointsFromGap(competitionVsOverallGap) +
          pointsFromGap(competitionVsGeneralGap);

        const competitionRounds = Number(row.competition_rounds ?? 0);
        const casualRounds = Number(row.casual_rounds ?? 0);
        const totalRounds = Number(row.total_rounds ?? 0);
        const playerCompetitionRounds =
          competitionByPlayer.get(row.player_id) ?? [];
        const last12MonthsCompetitionRounds = playerCompetitionRounds.filter(
          (round) => round.played_at >= cutoffDate
        );
        const decision = buildDecision({
          playerId: row.player_id,
          overallHi,
          competitionHi,
          generalPlayHi,
          competitionRounds: playerCompetitionRounds,
          last12MonthsRounds: last12MonthsCompetitionRounds,
          cutoffDate,
        });

        const reasons: string[] = [];

        if (competitionVsOverallGap != null && competitionVsOverallGap > 0) {
          reasons.push(
            `Last 20 Competition HI is ${competitionVsOverallGap.toFixed(
              1
            )} lower than Overall HI.`
          );
        }

        if (competitionVsGeneralGap != null && competitionVsGeneralGap > 0) {
          reasons.push(
            `Last 20 Competition HI is ${competitionVsGeneralGap.toFixed(
              1
            )} lower than Last 20 General Play HI.`
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
          last20GeneralPlayHi: generalPlayHi,
          competitionVsOverallGap,
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
          confidence: confidenceFromSamples(competitionRounds),

          reasons,
        };
      })
      .sort((a, b) => b.sandbagIndex - a.sandbagIndex);
  },
};
