import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabase = createSupabaseServerClient();

export interface DisplayRound {
  id: string;
  player_id: string;
  played_at: string;
  score_type: string | null;
  gross_score: number | null;
  adjusted_gross_score: number | null;
  differential: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  tee_name: string | null;
  course_name: string | null;
  source: string | null;
}

function isReal18HoleScore(score: unknown) {
  const n = Number(score);
  return Number.isFinite(n) && n >= 50 && n <= 130;
}

function roundGroupKey(round: DisplayRound) {
  return [
    round.player_id,
    round.played_at,
    round.gross_score ?? "",
    round.score_type ?? "",
  ].join("|");
}

function mergeRoundData(preferred: DisplayRound, backup: DisplayRound): DisplayRound {
  return {
    ...preferred,
    differential: preferred.differential ?? backup.differential,
    adjusted_gross_score:
      preferred.adjusted_gross_score ?? backup.adjusted_gross_score,
    course_rating: preferred.course_rating ?? backup.course_rating,
    slope_rating: preferred.slope_rating ?? backup.slope_rating,
    score_type: preferred.score_type ?? backup.score_type,
  };
}

function preferRound(existing: DisplayRound, incoming: DisplayRound) {
  const existingIsHbh = existing.source === "GHIN_HBH_PDF";
  const incomingIsHbh = incoming.source === "GHIN_HBH_PDF";

  if (incomingIsHbh && !existingIsHbh) {
    return mergeRoundData(incoming, existing);
  }

  if (existingIsHbh && !incomingIsHbh) {
    return mergeRoundData(existing, incoming);
  }

  if (incoming.tee_name && !existing.tee_name) {
    return mergeRoundData(incoming, existing);
  }

  return mergeRoundData(existing, incoming);
}

export const roundDisplayService = {
  async getPlayerDisplayRounds(
    playerId: string,
    limit?: number
  ): Promise<DisplayRound[]> {
    const { data, error } = await supabase
      .from("rounds")
      .select(`
        id,
        player_id,
        played_at,
        score_type,
        gross_score,
        adjusted_gross_score,
        differential,
        course_rating,
        slope_rating,
        tee_name,
        course_name,
        source
      `)
      .eq("player_id", playerId)
      .not("gross_score", "is", null)
      .order("played_at", { ascending: false });

    if (error) throw error;

    const merged = new Map<string, DisplayRound>();

    for (const round of (data ?? []) as DisplayRound[]) {
      if (!isReal18HoleScore(round.gross_score)) continue;

      const key = roundGroupKey(round);
      const existing = merged.get(key);

      if (!existing) {
        merged.set(key, round);
      } else {
        merged.set(key, preferRound(existing, round));
      }
    }

    const rounds = Array.from(merged.values()).sort(
      (a, b) =>
        new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    );

    return limit ? rounds.slice(0, limit) : rounds;
  },
};