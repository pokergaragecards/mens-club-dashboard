import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const GOODRICH_TEE_COLORS = ["Red", "Yellow", "White", "Blue"] as const;
export const MINIMUM_HOLE_SCORES = 3;

export type GoodrichTeeColor = (typeof GOODRICH_TEE_COLORS)[number];

export type PlayerHoleRanking = {
  playerId: string;
  playerName: string;
  scoreCount: number;
  averageGrossScore: number;
  averageExpectedScore: number;
  averageVsHandicap: number;
  performanceMultiplier: number;
  clubAverageMultiplier: number;
  vsClubMultiplier: number;
  rank: number;
  qualifyingPlayers: number;
  worstPercentile: number;
};

export type HoleRanking = {
  tee: GoodrichTeeColor;
  holeNumber: number;
  par: number | null;
  strokeIndex: number | null;
  yardage: number | null;
  clubAverageMultiplier: number | null;
  players: PlayerHoleRanking[];
};

export type TeeHoleRankings = {
  tee: GoodrichTeeColor;
  holes: HoleRanking[];
};

export type HoleRankingReport = {
  generatedAt: string;
  minimumScores: number;
  tees: TeeHoleRankings[];
  methodology: string;
};

export type HoleScoreRankingInput = {
  roundId: string;
  playerId: string;
  playerName: string;
  teeName: string | null;
  holeNumber: number;
  grossScore: number;
  par: number | null;
  strokeIndex: number | null;
  courseHandicap: number | null;
  handicapIndexUsed: number | null;
  courseRating: number | null;
  slopeRating: number | null;
};

export type CourseHoleRankingInput = {
  teeName: string | null;
  holeNumber: number;
  par: number | null;
  strokeIndex: number | null;
  yardage: number | null;
};

type HoleScoreQueryRow = {
  round_id: string;
  player_id: string;
  tee_name: string | null;
  hole_number: number;
  gross_score: number;
  par: number | null;
  stroke_index: number | null;
  course_handicap: number | null;
  handicap_index_used: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  players:
    | { full_name: string | null; is_active: boolean | null }
    | { full_name: string | null; is_active: boolean | null }[]
    | null;
  rounds:
    | { course_name: string | null }
    | { course_name: string | null }[]
    | null;
};

type CourseHoleQueryRow = {
  tee_name: string | null;
  hole_number: number;
  par: number | null;
  handicap: number | null;
  yardage: number | null;
};

type ScoreObservation = {
  playerId: string;
  playerName: string;
  grossScore: number;
  expectedScore: number;
  vsHandicap: number;
};

const METHODOLOGY =
  "For each score, expected hole score equals hole par multiplied by (tee par plus the player's Course Handicap from that historical round) divided by tee par. This spreads the handicap allowance continuously across all 18 holes in proportion to par, and the hole expectations add up to tee par plus Course Handicap; stroke index is informational and does not affect the calculation. The Performance Multiplier equals Average Gross Score divided by Average Expected Score: 1.00x matches expectation, above 1.00x is worse, and below 1.00x is better. Players need at least three scores on the same tee and hole. Club averages give each qualifying player equal weight.";

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function rounded(value: number, decimals = 3) {
  const multiplier = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function normalizeGoodrichTee(
  teeName: string | null | undefined
): GoodrichTeeColor | null {
  const words = (teeName ?? "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  const matches = GOODRICH_TEE_COLORS.filter((color) =>
    words.includes(color.toLowerCase())
  );

  // A combo tee such as "Blue/White" is not mixed into either single-tee group.
  return matches.length === 1 ? matches[0] : null;
}

function deriveCourseHandicap(
  row: HoleScoreRankingInput,
  teePar: number | null
) {
  const importedCourseHandicap = finiteNumber(row.courseHandicap);
  if (importedCourseHandicap !== null) return Math.round(importedCourseHandicap);

  const handicapIndex = finiteNumber(row.handicapIndexUsed);
  const slope = finiteNumber(row.slopeRating);
  const rating = finiteNumber(row.courseRating);

  if (
    handicapIndex === null ||
    slope === null ||
    rating === null ||
    teePar === null ||
    slope <= 0
  ) {
    return null;
  }

  return Math.round(handicapIndex * (slope / 113) + (rating - teePar));
}

export function buildHoleRankingReport(
  scoreRows: HoleScoreRankingInput[],
  courseRows: CourseHoleRankingInput[],
  generatedAt = new Date().toISOString()
): HoleRankingReport {
  const courseHoleMap = new Map<string, CourseHoleRankingInput>();
  const teePars = new Map<GoodrichTeeColor, number>();

  for (const row of courseRows) {
    const tee = normalizeGoodrichTee(row.teeName);
    const holeNumber = finiteNumber(row.holeNumber);
    if (!tee || holeNumber === null || holeNumber < 1 || holeNumber > 18) continue;

    courseHoleMap.set(`${tee}|${holeNumber}`, row);
  }

  for (const tee of GOODRICH_TEE_COLORS) {
    const pars = Array.from({ length: 18 }, (_, index) =>
      finiteNumber(courseHoleMap.get(`${tee}|${index + 1}`)?.par)
    );
    teePars.set(
      tee,
      pars.every((par) => par !== null)
        ? pars.reduce<number>((sum, par) => sum + (par ?? 0), 0)
        : 0
    );
  }

  const observations = new Map<string, ScoreObservation[]>();
  const seenScores = new Set<string>();

  for (const row of scoreRows) {
    const tee = normalizeGoodrichTee(row.teeName);
    const holeNumber = finiteNumber(row.holeNumber);
    const grossScore = finiteNumber(row.grossScore);

    if (
      !tee ||
      holeNumber === null ||
      holeNumber < 1 ||
      holeNumber > 18 ||
      grossScore === null ||
      grossScore <= 0
    ) {
      continue;
    }

    const dedupeKey = `${row.roundId}|${row.playerId}|${tee}|${holeNumber}`;
    if (seenScores.has(dedupeKey)) continue;
    seenScores.add(dedupeKey);

    const definition = courseHoleMap.get(`${tee}|${holeNumber}`);
    const par = finiteNumber(row.par) ?? finiteNumber(definition?.par);
    const storedTeePar = teePars.get(tee) ?? 0;
    const teePar = storedTeePar > 0 ? storedTeePar : null;
    const courseHandicap = deriveCourseHandicap(row, teePar);

    if (par === null || courseHandicap === null || teePar === null) continue;

    const expectedScore = par * ((teePar + courseHandicap) / teePar);
    const key = `${tee}|${holeNumber}|${row.playerId}`;
    const current = observations.get(key) ?? [];
    current.push({
      playerId: row.playerId,
      playerName: row.playerName.trim() || "Unknown Player",
      grossScore,
      expectedScore,
      vsHandicap: grossScore - expectedScore,
    });
    observations.set(key, current);
  }

  const tees = GOODRICH_TEE_COLORS.map<TeeHoleRankings>((tee) => ({
    tee,
    holes: Array.from({ length: 18 }, (_, index): HoleRanking => {
      const holeNumber = index + 1;
      const definition = courseHoleMap.get(`${tee}|${holeNumber}`);
      const playerRows = Array.from(observations.entries())
        .filter(([key, values]) => {
          const [rowTee, rowHole] = key.split("|");
          return (
            rowTee === tee &&
            Number(rowHole) === holeNumber &&
            values.length >= MINIMUM_HOLE_SCORES
          );
        })
        .map(([, values]) => {
          const rawAverageGrossScore = average(
            values.map((value) => value.grossScore)
          );
          const rawAverageExpectedScore = average(
            values.map((value) => value.expectedScore)
          );

          return {
            playerId: values[0].playerId,
            playerName: values[0].playerName,
            scoreCount: values.length,
            averageGrossScore: rounded(rawAverageGrossScore),
            averageExpectedScore: rounded(rawAverageExpectedScore),
            averageVsHandicap: rounded(
              average(values.map((value) => value.vsHandicap))
            ),
            performanceMultiplier: rounded(
              rawAverageGrossScore / rawAverageExpectedScore,
              4
            ),
          };
        })
        .sort((a, b) => {
          if (a.performanceMultiplier !== b.performanceMultiplier) {
            return b.performanceMultiplier - a.performanceMultiplier;
          }
          if (a.averageVsHandicap !== b.averageVsHandicap) {
            return b.averageVsHandicap - a.averageVsHandicap;
          }
          if (a.averageGrossScore !== b.averageGrossScore) {
            return b.averageGrossScore - a.averageGrossScore;
          }
          return a.playerName.localeCompare(b.playerName);
        });

      const clubAverageMultiplier = playerRows.length
        ? rounded(
            average(playerRows.map((player) => player.performanceMultiplier)),
            4
          )
        : null;
      let previousValue: number | null = null;
      let previousRank = 0;

      const players = playerRows.map<PlayerHoleRanking>((player, rowIndex) => {
        const isTie =
          previousValue !== null &&
          Math.abs(player.performanceMultiplier - previousValue) < 0.0001;
        const rank = isTie ? previousRank : rowIndex + 1;
        previousValue = player.performanceMultiplier;
        previousRank = rank;
        const qualifyingPlayers = playerRows.length;

        return {
          ...player,
          clubAverageMultiplier: clubAverageMultiplier ?? 0,
          vsClubMultiplier: rounded(
            player.performanceMultiplier - (clubAverageMultiplier ?? 0),
            4
          ),
          rank,
          qualifyingPlayers,
          worstPercentile:
            qualifyingPlayers <= 1
              ? 100
              : rounded(
                  ((qualifyingPlayers - rank) / (qualifyingPlayers - 1)) * 100,
                  1
                ),
        };
      });

      return {
        tee,
        holeNumber,
        par: finiteNumber(definition?.par),
        strokeIndex: finiteNumber(definition?.strokeIndex),
        yardage: finiteNumber(definition?.yardage),
        clubAverageMultiplier,
        players,
      };
    }),
  }));

  return {
    generatedAt,
    minimumScores: MINIMUM_HOLE_SCORES,
    tees,
    methodology: METHODOLOGY,
  };
}

async function loadAllHoleScores() {
  const supabase = createSupabaseServerClient();
  const pageSize = 1_000;
  const rows: HoleScoreQueryRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("hole_scores")
      .select(`
        round_id,
        player_id,
        tee_name,
        hole_number,
        gross_score,
        par,
        stroke_index,
        course_handicap,
        handicap_index_used,
        course_rating,
        slope_rating,
        players!inner(full_name, is_active),
        rounds!inner(course_name)
      `)
      .eq("source", "GHIN_HBH_PDF")
      .eq("players.is_active", true)
      .ilike("rounds.course_name", "%Goodrich%")
      .order("round_id", { ascending: true })
      .order("hole_number", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const page = (data ?? []) as unknown as HoleScoreQueryRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

export async function getGoodrichHoleRankingReport() {
  const supabase = createSupabaseServerClient();
  const [scoreRows, courseResult] = await Promise.all([
    loadAllHoleScores(),
    supabase
      .from("course_holes")
      .select("tee_name, hole_number, par, handicap, yardage")
      .eq("course_name", "Goodrich")
      .order("tee_name")
      .order("hole_number"),
  ]);

  if (courseResult.error) throw courseResult.error;

  const scores = scoreRows.map<HoleScoreRankingInput>((row) => {
    const player = firstRelation(row.players);

    return {
      roundId: row.round_id,
      playerId: row.player_id,
      playerName: player?.full_name ?? "Unknown Player",
      teeName: row.tee_name,
      holeNumber: row.hole_number,
      grossScore: row.gross_score,
      par: row.par,
      strokeIndex: row.stroke_index,
      courseHandicap: row.course_handicap,
      handicapIndexUsed: row.handicap_index_used,
      courseRating: row.course_rating,
      slopeRating: row.slope_rating,
    };
  });
  const courseHoles = ((courseResult.data ?? []) as CourseHoleQueryRow[]).map(
    (row): CourseHoleRankingInput => ({
      teeName: row.tee_name,
      holeNumber: row.hole_number,
      par: row.par,
      strokeIndex: row.handicap,
      yardage: row.yardage,
    })
  );

  return buildHoleRankingReport(scores, courseHoles);
}
