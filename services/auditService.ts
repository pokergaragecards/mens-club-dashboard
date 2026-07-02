import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabase = createSupabaseServerClient();

type Period = "30" | "60" | "90" | "season";

type RoundRow = {
  id: string;
  player_id: string;
  played_at: string;
  gross_score: number | null;
  adjusted_gross_score: number | null;
  score_type: string | null;
  source: string | null;
  course_name: string | null;
  tee_name: string | null;
};

type PlayerRow = {
  id: string;
  full_name: string;
};

function periodStart(period: Period): string {
  if (period === "30") return "2026-06-01";
  if (period === "60") return "2026-05-01";
  if (period === "90") return "2026-04-01";
  return "2026-01-01";
}

function avg(values: number[]) {
  if (!values.length) return null;

  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)
  );
}

function pointsFromGap(gap: number) {
  return gap > 0 ? Math.round(gap * 10) : 0;
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

function isCompetition(scoreType: string | null | undefined) {
  return ["C", "CH"].includes(scoreType ?? "");
}

function roundScore(round: RoundRow) {
  return Number(round.adjusted_gross_score ?? round.gross_score);
}

async function fetchAllRounds(startDate: string): Promise<RoundRow[]> {
  const pageSize = 1000;
  let from = 0;
  let allRows: RoundRow[] = [];

  while (true) {
    const { data, error } = await supabase
      .from("rounds")
      .select(`
        id,
        player_id,
        played_at,
        gross_score,
        adjusted_gross_score,
        score_type,
        source,
        course_name,
        tee_name
      `)
      .gte("played_at", startDate)
      .not("gross_score", "is", null)
      .order("played_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = (data ?? []) as RoundRow[];
    allRows = allRows.concat(rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

async function fetchGoodrichRoundIds(): Promise<Set<string>> {
  const pageSize = 1000;
  let from = 0;
  const ids = new Set<string>();

  while (true) {
    const { data, error } = await supabase
      .from("hole_scores")
      .select("round_id")
      .eq("source", "GHIN_HBH_PDF")
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const rows = data ?? [];

    for (const row of rows) {
      if (row.round_id) ids.add(row.round_id);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return ids;
}

export const auditService = {
  async getAuditRows(period: Period) {
    const startDate = periodStart(period);

    const [
      { data: players, error: playersError },
      rounds,
      goodrichRoundIds,
    ] = await Promise.all([
      supabase
        .from("players")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name"),

      fetchAllRounds(startDate),

      fetchGoodrichRoundIds(),
    ]);

    if (playersError) throw playersError;

    const isGoodrichRound = (round: RoundRow) =>
      goodrichRoundIds.has(round.id) ||
      round.source === "GHIN_HBH_PDF" ||
      String(round.course_name ?? "").toLowerCase() === "goodrich";

    return ((players ?? []) as PlayerRow[])
      .map((player) => {
        const playerRounds = rounds.filter(
          (round) => round.player_id === player.id
        );

        const compScores = playerRounds
          .filter((round) => isCompetition(round.score_type))
          .map(roundScore)
          .filter(Number.isFinite);

        const casualScores = playerRounds
          .filter((round) => !isCompetition(round.score_type))
          .map(roundScore)
          .filter(Number.isFinite);

        const goodrichScores = playerRounds
          .filter(isGoodrichRound)
          .map(roundScore)
          .filter(Number.isFinite);

        const otherScores = playerRounds
          .filter((round) => !isGoodrichRound(round))
          .map(roundScore)
          .filter(Number.isFinite);

        const compAvg = avg(compScores);
        const casualAvg = avg(casualScores);
        const goodrichAvg = avg(goodrichScores);
        const otherAvg = avg(otherScores);

        const compAdvantage =
          compAvg != null && casualAvg != null ? casualAvg - compAvg : null;

        const goodrichAdvantage =
          goodrichAvg != null && otherAvg != null
            ? otherAvg - goodrichAvg
            : null;

        const compPoints =
          compAdvantage == null ? 0 : pointsFromGap(compAdvantage);

        const goodrichPoints =
          goodrichAdvantage == null ? 0 : pointsFromGap(goodrichAdvantage);

        const sandbagIndex = compPoints + goodrichPoints;
        const totalRounds = playerRounds.length;

        const reasons: string[] = [];

        if (compPoints > 0) {
          reasons.push(
            `Competition scoring is ${compAdvantage!.toFixed(
              1
            )} strokes better (+${compPoints}).`
          );
        }

        if (goodrichPoints > 0) {
          reasons.push(
            `Goodrich scoring is ${goodrichAdvantage!.toFixed(
              1
            )} strokes better (+${goodrichPoints}).`
          );
        }

        if (!reasons.length) {
          reasons.push("No major flags.");
        }

        return {
          id: player.id,
          full_name: player.full_name,

          sandbagIndex,
          auditScore: sandbagIndex,
          flag: getFlag(sandbagIndex),
          confidence: confidenceFromSamples(totalRounds),

          totalRounds,
          compRounds: compScores.length,
          casualRounds: casualScores.length,
          goodrichRounds: goodrichScores.length,
          otherRounds: otherScores.length,

          compAvg,
          casualAvg,
          compAdvantage,
          compPoints,

          goodrichAvg,
          otherAvg,
          goodrichAdvantage,
          goodrichPoints,

          reasons,
        };
      })
      .sort((a, b) => b.sandbagIndex - a.sandbagIndex);
  },
};