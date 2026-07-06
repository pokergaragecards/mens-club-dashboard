import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabase = createSupabaseServerClient();

type Period = "last20" | "30" | "60" | "90" | "season";

type RoundRow = {
  id: string;
  player_id: string;
  played_at: string;
  gross_score: number | null;
  adjusted_gross_score: number | null;
  differential: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  pcc: number | null;
  score_type: string | null;
  source: string | null;
  course_name: string | null;
};

type PlayerRow = {
  id: string;
  full_name: string;
  current_index: number | null;
};

function currentYearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

function periodStart(period: Period) {
  if (period === "season" || period === "last20") return currentYearStart();

  const date = new Date();
  date.setDate(date.getDate() - Number(period));
  return date.toISOString().slice(0, 10);
}

function avg(values: number[]) {
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function getDifferential(round: RoundRow) {
  if (round.differential != null) return Number(round.differential);

  const score = Number(round.adjusted_gross_score ?? round.gross_score);
  const rating = Number(round.course_rating);
  const slope = Number(round.slope_rating);
  const pcc = Number(round.pcc ?? 0);

  if (!Number.isFinite(score) || !Number.isFinite(rating) || !Number.isFinite(slope) || slope <= 0) {
    return null;
  }

  return Number((((score - rating) * 113) / slope + pcc).toFixed(1));
}

function isCompetition(scoreType: string | null | undefined) {
  return ["C", "CH"].includes(scoreType ?? "");
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
        differential,
        course_rating,
        slope_rating,
        pcc,
        score_type,
        source,
        course_name
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

async function fetchGoodrichRoundIds() {
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

    for (const row of data ?? []) {
      if (row.round_id) ids.add(row.round_id);
    }

    if ((data ?? []).length < pageSize) break;
    from += pageSize;
  }

  return ids;
}

export const auditService = {
  async getAuditRows(period: Period) {
    const startDate = periodStart(period);

    const [{ data: players, error: playersError }, rounds, goodrichRoundIds] =
      await Promise.all([
        supabase
          .from("players")
          .select("id, full_name, current_index")
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
        const allPlayerRounds = rounds
          .filter((round) => round.player_id === player.id)
          .sort(
            (a, b) =>
              new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
          );

        const playerRounds =
          period === "last20" ? allPlayerRounds.slice(0, 20) : allPlayerRounds;

        const diffRows = playerRounds
          .map((round) => ({
            round,
            differential: getDifferential(round),
          }))
          .filter((row) => row.differential != null) as {
          round: RoundRow;
          differential: number;
        }[];

        const compDiffs = diffRows
          .filter(({ round }) => isCompetition(round.score_type))
          .map((row) => row.differential);

        const casualDiffs = diffRows
          .filter(({ round }) => !isCompetition(round.score_type))
          .map((row) => row.differential);

        const goodrichDiffs = diffRows
          .filter(({ round }) => isGoodrichRound(round))
          .map((row) => row.differential);

        const otherDiffs = diffRows
          .filter(({ round }) => !isGoodrichRound(round))
          .map((row) => row.differential);

        const compDiff = avg(compDiffs);
        const casualDiff = avg(casualDiffs);
        const goodrichDiff = avg(goodrichDiffs);
        const otherDiff = avg(otherDiffs);

        const compGap =
          compDiff != null && casualDiff != null ? casualDiff - compDiff : null;

        const goodrichGap =
          goodrichDiff != null && otherDiff != null
            ? otherDiff - goodrichDiff
            : null;

        const compPoints = pointsFromGap(compGap);
        const goodrichPoints = pointsFromGap(goodrichGap);
        const sandbagIndex = compPoints + goodrichPoints;

        const reasons: string[] = [];

        if (compPoints > 0) {
          reasons.push(
            `Competition differential is ${compGap!.toFixed(1)} lower (+${compPoints}).`
          );
        }

        if (goodrichPoints > 0) {
          reasons.push(
            `Goodrich differential is ${goodrichGap!.toFixed(1)} lower (+${goodrichPoints}).`
          );
        }

        if (!reasons.length) reasons.push("No major differential flags.");

        return {
          id: player.id,
          full_name: player.full_name,
          currentIndex: player.current_index,

          sandbagIndex,
          flag: getFlag(sandbagIndex),
          confidence: confidenceFromSamples(diffRows.length),

          totalRounds: diffRows.length,
          compRounds: compDiffs.length,
          casualRounds: casualDiffs.length,
          goodrichRounds: goodrichDiffs.length,
          otherRounds: otherDiffs.length,

          compDiff,
          casualDiff,
          compGap,
          compPoints,

          goodrichDiff,
          otherDiff,
          goodrichGap,
          goodrichPoints,

          reasons,
        };
      })
      .sort((a, b) => b.sandbagIndex - a.sandbagIndex);
  },
};