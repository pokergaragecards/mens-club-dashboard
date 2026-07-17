import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type AuditTrendPoint = { date: string; handicapIndex: number };
export type AuditRound = {
  id: string;
  playedAt: string;
  courseName: string;
  teeName: string;
  score: number | null;
  differential: number;
  category: "Competition" | "General Play";
};
export type AuditPlayerReport = {
  id: string;
  name: string;
  ghinNumber: string | null;
  currentIndex: number | null;
  competitionIndex: number | null;
  generalIndex: number | null;
  difference: number | null;
  flag: "NO ACTION" | "MONITOR" | "REVIEW" | "INVESTIGATE";
  competitionRounds: number;
  generalRounds: number;
  competitionAverage: number | null;
  generalAverage: number | null;
  competitionTrend: AuditTrendPoint[];
  generalTrend: AuditTrendPoint[];
  rounds: AuditRound[];
};
export type AuditReport = { generatedAt: string; players: AuditPlayerReport[] };

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

const isCompetition = (type: string | null) =>
  ["C", "CH", "CA", "ECH"].includes(type ?? "");

function average(values: number[]) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function usedCount(count: number) {
  if (count < 5) return 0;
  if (count === 5) return 1;
  if (count <= 8) return 2;
  if (count <= 11) return 3;
  if (count <= 14) return 4;
  if (count <= 16) return 5;
  if (count <= 18) return 6;
  if (count === 19) return 7;
  return 8;
}

function categoryIndex(rounds: RoundRow[]) {
  const diffs = [...rounds]
    .sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime())
    .slice(0, 20)
    .map((r) => Number(r.differential))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  const count = usedCount(diffs.length);
  if (!count) return null;
  const result = average(diffs.slice(0, count));
  return result == null ? null : Number((result + (diffs.length === 6 ? -1 : 0)).toFixed(1));
}

function trend(rounds: RoundRow[]) {
  const chronological = [...rounds].sort(
    (a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime()
  );
  const result: AuditTrendPoint[] = [];

  chronological.forEach((round, index) => {
    const hi = categoryIndex(chronological.slice(Math.max(0, index - 19), index + 1));
    if (hi != null) result.push({ date: round.played_at, handicapIndex: hi });
  });

  return result.slice(-10);
}

function flagFor(diff: number | null): AuditPlayerReport["flag"] {
  if (diff == null || diff < 1) return "NO ACTION";
  if (diff < 3) return "MONITOR";
  if (diff < 5) return "REVIEW";
  return "INVESTIGATE";
}

export async function getAuditReport(): Promise<AuditReport> {
  const supabase = createSupabaseServerClient();

  const [{ data: players, error: pe }, { data: rounds, error: re }] =
    await Promise.all([
      supabase.from("players").select("id, full_name, ghin_number, current_index"),
      supabase
        .from("player_display_rounds")
        .select("id, player_id, played_at, gross_score, adjusted_gross_score, differential, score_type, course_name, tee_name, counts_for_hi")
        .eq("counts_for_hi", true)
        .not("played_at", "is", null)
        .not("differential", "is", null)
        .order("played_at", { ascending: false }),
    ]);

  if (pe) throw new Error(pe.message);
  if (re) throw new Error(re.message);

  const allRounds = (rounds ?? []) as RoundRow[];

  const reportPlayers = ((players ?? []) as PlayerRow[])
    .map((player): AuditPlayerReport | null => {
      const playerRounds = allRounds.filter((r) => r.player_id === player.id);
      if (!playerRounds.length) return null;

      const comp = playerRounds.filter((r) => isCompetition(r.score_type));
      const general = playerRounds.filter((r) => !isCompetition(r.score_type));
      const competitionIndex = categoryIndex(comp);
      const generalIndex = categoryIndex(general);
      const difference =
        competitionIndex == null || generalIndex == null
          ? null
          : Number((generalIndex - competitionIndex).toFixed(1));

      return {
        id: player.id,
        name: player.full_name,
        ghinNumber: player.ghin_number,
        currentIndex: player.current_index == null ? null : Number(player.current_index),
        competitionIndex,
        generalIndex,
        difference,
        flag: flagFor(difference),
        competitionRounds: comp.length,
        generalRounds: general.length,
        competitionAverage: average(comp.map((r) => Number(r.differential))),
        generalAverage: average(general.map((r) => Number(r.differential))),
        competitionTrend: trend(comp),
        generalTrend: trend(general),
        rounds: playerRounds.slice(0, 20).map((r) => ({
          id: r.id,
          playedAt: r.played_at,
          courseName: r.course_name ?? "Unknown course",
          teeName: r.tee_name ?? "-",
          score:
            r.adjusted_gross_score != null
              ? Number(r.adjusted_gross_score)
              : r.gross_score != null
                ? Number(r.gross_score)
                : null,
          differential: Number(r.differential),
          category: isCompetition(r.score_type) ? "Competition" : "General Play",
        })),
      };
    })
    .filter((p): p is AuditPlayerReport => p != null)
    .sort((a, b) => (b.difference ?? -999) - (a.difference ?? -999));

  return { generatedAt: new Date().toISOString(), players: reportPlayers };
}
