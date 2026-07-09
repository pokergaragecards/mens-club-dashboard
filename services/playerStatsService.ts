import { createSupabaseServerClient } from "@/lib/supabaseServer";

const supabase = createSupabaseServerClient();

export interface PlayerSummary {
  id: string;
  name: string;
  ghinNumber: string | null;
  handicap: number | null;
  rounds: number;
  average: number | null;
  best: number | null;
  worst: number | null;
  lastRound: string | null;
}

export interface RoundHistoryRow {
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
  counts_for_hi: boolean | null;
}

export interface HoleStatRow {
  teeName: string;
  holeNumber: number;
  par: number;
  handicap: number;
  rounds: number;
  average: number;
  best: number;
  worst: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doubles: number;
}

function average(values: number[]) {
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function normalizeTee(value: string | null | undefined) {
  return (value ?? "Unknown").trim();
}

function isReal18HoleScore(score: unknown) {
  const n = Number(score);
  return Number.isFinite(n) && n >= 50 && n <= 130;
}

export const playerStatsService = {
  async getSummary(playerId: string): Promise<PlayerSummary | null> {
    const { data: player, error } = await supabase
      .from("players")
      .select("id, full_name, ghin_number, current_index")
      .eq("id", playerId)
      .single();

    if (error) throw error;
    if (!player) return null;

    const rounds = await this.getRoundHistory(playerId, 500);
    const scores = rounds
      .map((round) => Number(round.adjusted_gross_score ?? round.gross_score))
      .filter(Number.isFinite);

    return {
      id: player.id,
      name: player.full_name ?? "Unknown",
      ghinNumber: player.ghin_number ?? null,
      handicap: player.current_index == null ? null : Number(player.current_index),
      rounds: rounds.length,
      average: average(scores),
      best: scores.length ? Math.min(...scores) : null,
      worst: scores.length ? Math.max(...scores) : null,
      lastRound: rounds[0]?.played_at ?? null,
    };
  },

  async getRoundHistory(
    playerId: string,
    limit = 20,
    sourceMode: "DISPLAY" | "GHIN" = "DISPLAY"
  ): Promise<RoundHistoryRow[]> {
    let query = supabase
      .from("player_display_rounds")
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
        source,
        counts_for_hi
      `)
      .eq("player_id", playerId)
      .eq("counts_for_hi", true)
      .not("played_at", "is", null)
      .order("played_at", { ascending: false })
      .limit(limit);

    if (sourceMode === "GHIN") {
      query = query.neq("source", "GHIN_HBH_PDF");
    }

    const { data, error } = await query;
    if (error) throw error;

    return data ?? [];
  },

  async getHoleStats(
    playerId: string,
    startDate?: string,
    endDate?: string
  ): Promise<HoleStatRow[]> {
    let query = supabase
      .from("hole_scores")
      .select(`
        round_id,
        player_id,
        hole_number,
        gross_score,
        score_to_par,
        par,
        stroke_index,
        rounds!inner(
          id,
          player_id,
          played_at,
          gross_score,
          tee_name,
          course_name,
          source
        )
      `)
      .eq("player_id", playerId)
      .not("gross_score", "is", null)
      .eq("rounds.source", "GHIN_HBH_PDF");

    if (startDate) query = query.gte("rounds.played_at", startDate);
    if (endDate) query = query.lte("rounds.played_at", endDate);

    const { data, error } = await query;
    if (error) throw error;

    const stats = new Map<string, any>();

    for (const row of data ?? []) {
      const round = Array.isArray((row as any).rounds)
        ? (row as any).rounds[0]
        : (row as any).rounds;

      if (!round || !isReal18HoleScore(round.gross_score)) continue;

      const grossScore = Number(row.gross_score);
      const holeNumber = Number(row.hole_number);
      const par = Number(row.par ?? 0);
      const handicap = Number(row.stroke_index ?? 0);
      const teeName = normalizeTee(round.tee_name);
      const key = `${teeName}|${holeNumber}`;

      if (!stats.has(key)) {
        stats.set(key, {
          teeName,
          holeNumber,
          par,
          handicap,
          rounds: 0,
          total: 0,
          best: 999,
          worst: 0,
          birdies: 0,
          pars: 0,
          bogeys: 0,
          doubles: 0,
        });
      }

      const stat = stats.get(key);
      stat.rounds++;
      stat.total += grossScore;
      stat.best = Math.min(stat.best, grossScore);
      stat.worst = Math.max(stat.worst, grossScore);

      const toPar =
        row.score_to_par == null
          ? par
            ? grossScore - par
            : null
          : Number(row.score_to_par);

      if (toPar != null) {
        if (toPar <= -1) stat.birdies++;
        else if (toPar === 0) stat.pars++;
        else if (toPar === 1) stat.bogeys++;
        else stat.doubles++;
      }
    }

    return Array.from(stats.values())
      .map((stat) => ({
        teeName: stat.teeName,
        holeNumber: stat.holeNumber,
        par: stat.par,
        handicap: stat.handicap,
        rounds: stat.rounds,
        average: Number((stat.total / stat.rounds).toFixed(1)),
        best: stat.best === 999 ? 0 : stat.best,
        worst: stat.worst,
        birdies: stat.birdies,
        pars: stat.pars,
        bogeys: stat.bogeys,
        doubles: stat.doubles,
      }))
      .sort((a, b) =>
        a.teeName === b.teeName
          ? a.holeNumber - b.holeNumber
          : a.teeName.localeCompare(b.teeName)
      );
  },

  async getScoringBreakdown(playerId: string) {
    const holes = await this.getHoleStats(playerId);

    return holes.reduce(
      (total, hole) => {
        total.birdies += hole.birdies;
        total.pars += hole.pars;
        total.bogeys += hole.bogeys;
        total.doubles += hole.doubles;
        return total;
      },
      { birdies: 0, pars: 0, bogeys: 0, doubles: 0 }
    );
  },

  async getHandicapTrend(playerId: string) {
    const rounds = await this.getRoundHistory(playerId, 500);

    return rounds
      .filter((round) => round.differential != null)
      .map((round) => ({
        played_at: round.played_at,
        handicap_index_used: round.differential,
      }))
      .reverse();
  },
};