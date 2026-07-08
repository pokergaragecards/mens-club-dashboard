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

export const auditService = {
  async getAuditRows(_period: Period) {
    const { data, error } = await supabase
      .from("player_handicap_summary")
      .select("*")
      .order("full_name");

    if (error) throw error;

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
          last20GeneralPlayHi: generalPlayHi,
          competitionVsOverallGap,

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