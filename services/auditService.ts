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
  player_id: string;
  played_at: string;
  differential: number | string;
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

function calculateHandicapIndex(rounds: CompetitionRoundRow[]) {
  const mostRecent20 = [...rounds]
    .sort(
      (a, b) =>
        new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    )
    .slice(0, 20);
  const usedCount = usedDifferentialCount(mostRecent20.length);

  if (!usedCount) return null;

  const used = mostRecent20
    .map((round) => Number(round.differential))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .slice(0, usedCount);

  if (used.length !== usedCount) return null;

  const average = used.reduce((sum, value) => sum + value, 0) / used.length;
  const adjusted = average + fewerThan20Adjustment(mostRecent20.length);
  return Math.round(adjusted * 10) / 10;
}

async function getLast12MonthsCompetitionRounds() {
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  const rows: CompetitionRoundRow[] = [];
  const pageSize = 1000;

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from("player_display_rounds")
      .select("player_id, played_at, differential")
      .eq("counts_for_hi", true)
      .in("score_type", COMPETITION_SCORE_TYPES)
      .gte("played_at", cutoff.toISOString().slice(0, 10))
      .not("differential", "is", null)
      .order("played_at", { ascending: false })
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
    const [{ data, error }, last12MonthsRounds] = await Promise.all([
      supabase
        .from("player_handicap_summary")
        .select("*")
        .order("full_name"),
      getLast12MonthsCompetitionRounds(),
    ]);

    if (error) throw error;

    const last12MonthsByPlayer = new Map<string, CompetitionRoundRow[]>();
    for (const round of last12MonthsRounds) {
      const playerRounds = last12MonthsByPlayer.get(round.player_id) ?? [];
      playerRounds.push(round);
      last12MonthsByPlayer.set(round.player_id, playerRounds);
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
        const last12MonthsCompetitionRounds =
          last12MonthsByPlayer.get(row.player_id) ?? [];

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
