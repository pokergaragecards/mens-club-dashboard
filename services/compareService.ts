import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type HoleMode = "competition" | "all";
export type TeeMode = "common" | "all";

type PlayerRow = {
  id: string;
  full_name: string;
  current_index: number | null;
};

type RoundRow = {
  player_id: string;
  played_at: string;
  differential: number | null;
  score_type: string | null;
};

type HoleScoreRow = {
  player_id: string;
  hole_number: number;
  gross_score: number | null;
  stroke_index: number | null;
  tee_name: string | null;
  rounds: {
    score_type: string | null;
    played_at: string | null;
  } | null;
};

export type HoleDetail = {
  hole: number;
  strokeIndex: number | null;
  p1Stroke: number;
  p2Stroke: number;
  p1Win: number;
  p2Win: number;
  tie: number;
  p1Samples: number;
  p2Samples: number;
  p1AvgGross: number | null;
  p2AvgGross: number | null;
  p1AvgNet: number | null;
  p2AvgNet: number | null;
};

export type CompareAnalysis = {
  p1Name: string;
  p2Name: string;

  p1ActualHandicap: number;
  p2ActualHandicap: number;

  p1CompetitionDiff: number | null;
  p2CompetitionDiff: number | null;

  p1CompetitionMedian: number | null;
  p2CompetitionMedian: number | null;

  p1RecentDiff: number | null;
  p2RecentDiff: number | null;

  p1CompVsHandicap: number | null;
  p2CompVsHandicap: number | null;

  p1CompRounds: number;
  p2CompRounds: number;
  p1TotalRounds: number;
  p2TotalRounds: number;

  p1Volatility: number;
  p2Volatility: number;

  strokeP1: number;
  strokeP2: number;
  matchP1: number;
  matchP2: number;

  strokesGiven: number;
  strokesReceiver: string;
  favorite: string;

  p1ExpectedHoles: number;
  p2ExpectedHoles: number;
  expectedTies: number;

  p1CommonTee: string | null;
  p2CommonTee: string | null;

  holeMode: HoleMode;
  teeMode: TeeMode;

  holeDetails: HoleDetail[];
};

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (!values.length) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stdDev(values: number[]) {
  if (values.length < 2) return 4;

  const mean = avg(values) ?? 0;

  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    (values.length - 1);

  return Math.sqrt(variance);
}

function erf(x: number) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);

  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x));

  return sign * y;
}

function normalCdf(x: number) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function isCompetition(scoreType: string | null | undefined) {
  return ["C", "CH", "CA", "ECH"].includes(scoreType ?? "");
}

function getCourseHandicap(index: number) {
  return Math.round(index);
}

function getsStrokeOnHole(strokeDiff: number, strokeIndex: number | null) {
  if (!strokeIndex || strokeDiff <= 0) return 0;

  if (strokeDiff <= 18) {
    return strokeIndex <= strokeDiff ? 1 : 0;
  }

  const base = Math.floor(strokeDiff / 18);
  const extra = strokeDiff % 18;

  return base + (strokeIndex <= extra ? 1 : 0);
}

function mostCommonTee(rows: HoleScoreRow[]) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const tee = (row.tee_name ?? "Unknown").trim();
    counts.set(tee, (counts.get(tee) ?? 0) + 1);
  }

  return (
    Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  );
}

function buildHoleDistributions(rows: HoleScoreRow[]) {
  const map = new Map<number, number[]>();

  for (const row of rows) {
    if (row.gross_score == null) continue;

    const hole = Number(row.hole_number);
    const score = Number(row.gross_score);

    if (!Number.isFinite(hole) || !Number.isFinite(score)) continue;

    const existing = map.get(hole) ?? [];
    existing.push(score);
    map.set(hole, existing);
  }

  return map;
}

function holeWinProbability(params: {
  p1Scores: number[];
  p2Scores: number[];
  p1Stroke: number;
  p2Stroke: number;
}) {
  let p1Wins = 0;
  let p2Wins = 0;
  let ties = 0;
  let total = 0;

  for (const p1Score of params.p1Scores) {
    for (const p2Score of params.p2Scores) {
      const p1Net = p1Score - params.p1Stroke;
      const p2Net = p2Score - params.p2Stroke;

      if (p1Net < p2Net) p1Wins++;
      else if (p2Net < p1Net) p2Wins++;
      else ties++;

      total++;
    }
  }

  if (!total) {
    return { p1Win: 0.33, p2Win: 0.33, tie: 0.34 };
  }

  return {
    p1Win: p1Wins / total,
    p2Win: p2Wins / total,
    tie: ties / total,
  };
}

function estimateStrokePlay(params: {
  p1ExpectedDiff: number;
  p1Volatility: number;
  p1ActualHandicap: number;
  p2ExpectedDiff: number;
  p2Volatility: number;
  p2ActualHandicap: number;
}) {
  const p1ExpectedNet = params.p1ExpectedDiff - params.p1ActualHandicap;
  const p2ExpectedNet = params.p2ExpectedDiff - params.p2ActualHandicap;

  const meanDifference = p2ExpectedNet - p1ExpectedNet;

  const combinedSd = Math.sqrt(
    params.p1Volatility * params.p1Volatility +
      params.p2Volatility * params.p2Volatility
  );

  return normalCdf(meanDifference / combinedSd);
}

function estimateHoleByHoleMatchPlay(params: {
  p1HoleRows: HoleScoreRow[];
  p2HoleRows: HoleScoreRow[];
  p1ActualHandicap: number;
  p2ActualHandicap: number;
}) {
  const p1Dist = buildHoleDistributions(params.p1HoleRows);
  const p2Dist = buildHoleDistributions(params.p2HoleRows);

  const p1CourseHcp = getCourseHandicap(params.p1ActualHandicap);
  const p2CourseHcp = getCourseHandicap(params.p2ActualHandicap);

  const strokeDiff = Math.abs(p1CourseHcp - p2CourseHcp);
  const p1GetsStrokes = p1CourseHcp > p2CourseHcp;
  const p2GetsStrokes = p2CourseHcp > p1CourseHcp;

  let p1ExpectedHoles = 0;
  let p2ExpectedHoles = 0;
  let expectedTies = 0;

  const holeDetails: HoleDetail[] = [];

  for (let hole = 1; hole <= 18; hole++) {
    const p1Scores = p1Dist.get(hole) ?? [];
    const p2Scores = p2Dist.get(hole) ?? [];

    const strokeIndex =
      params.p1HoleRows.find((row) => row.hole_number === hole)
        ?.stroke_index ??
      params.p2HoleRows.find((row) => row.hole_number === hole)
        ?.stroke_index ??
      hole;

    const p1Stroke = p1GetsStrokes
      ? getsStrokeOnHole(strokeDiff, strokeIndex)
      : 0;

    const p2Stroke = p2GetsStrokes
      ? getsStrokeOnHole(strokeDiff, strokeIndex)
      : 0;

    const result = holeWinProbability({
      p1Scores,
      p2Scores,
      p1Stroke,
      p2Stroke,
    });

    const p1AvgGross = avg(p1Scores);
    const p2AvgGross = avg(p2Scores);

    p1ExpectedHoles += result.p1Win;
    p2ExpectedHoles += result.p2Win;
    expectedTies += result.tie;

    holeDetails.push({
      hole,
      strokeIndex,
      p1Stroke,
      p2Stroke,
      p1Win: result.p1Win,
      p2Win: result.p2Win,
      tie: result.tie,
      p1Samples: p1Scores.length,
      p2Samples: p2Scores.length,
      p1AvgGross,
      p2AvgGross,
      p1AvgNet: p1AvgGross == null ? null : p1AvgGross - p1Stroke,
      p2AvgNet: p2AvgGross == null ? null : p2AvgGross - p2Stroke,
    });
  }

  const decisiveTotal = p1ExpectedHoles + p2ExpectedHoles;

  return {
    p1MatchWinChance: decisiveTotal ? p1ExpectedHoles / decisiveTotal : 0.5,
    p2MatchWinChance: decisiveTotal ? p2ExpectedHoles / decisiveTotal : 0.5,
    p1ExpectedHoles,
    p2ExpectedHoles,
    expectedTies,
    holeDetails,
  };
}

export const compareService = {
  async getPlayers() {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase
      .from("players")
      .select("id, full_name, current_index")
      .eq("is_active", true)
      .order("full_name");

    if (error) throw error;

    return (data ?? []) as PlayerRow[];
  },

  async getAnalysis(params: {
    p1: string;
    p2: string;
    holeMode: HoleMode;
    teeMode: TeeMode;
  }): Promise<CompareAnalysis | null> {
    const supabase = createSupabaseServerClient();

    const players = await this.getPlayers();

    const selectedPlayers = players.filter(
      (player) => player.id === params.p1 || player.id === params.p2
    );

    if (
      !params.p1 ||
      !params.p2 ||
      params.p1 === params.p2 ||
      selectedPlayers.length !== 2
    ) {
      return null;
    }

    const [{ data: rounds, error: roundsError }, { data: holeRows, error: holeError }] =
      await Promise.all([
        supabase
          .from("rounds")
          .select("player_id, played_at, differential, score_type")
          .in("player_id", [params.p1, params.p2])
          .not("differential", "is", null)
          .order("played_at", { ascending: false }),

        supabase
          .from("hole_scores")
          .select(`
            player_id,
            hole_number,
            gross_score,
            stroke_index,
            tee_name,
            rounds!inner(
              score_type,
              played_at
            )
          `)
          .in("player_id", [params.p1, params.p2])
          .not("gross_score", "is", null)
          .order("hole_number", { ascending: true }),
      ]);

    if (roundsError) throw roundsError;
    if (holeError) throw holeError;

    const p1Player = selectedPlayers.find((player) => player.id === params.p1)!;
    const p2Player = selectedPlayers.find((player) => player.id === params.p2)!;

    const allRounds = (rounds ?? []) as RoundRow[];

    const p1Rounds = allRounds
      .filter((round) => round.player_id === params.p1)
      .slice(0, 20);

    const p2Rounds = allRounds
      .filter((round) => round.player_id === params.p2)
      .slice(0, 20);

    const p1Diffs = p1Rounds
      .map((round) => Number(round.differential))
      .filter(Number.isFinite);

    const p2Diffs = p2Rounds
      .map((round) => Number(round.differential))
      .filter(Number.isFinite);

    const p1CompetitionDiffs = p1Rounds
      .filter((round) => isCompetition(round.score_type))
      .map((round) => Number(round.differential))
      .filter(Number.isFinite);

    const p2CompetitionDiffs = p2Rounds
      .filter((round) => isCompetition(round.score_type))
      .map((round) => Number(round.differential))
      .filter(Number.isFinite);

    const p1ActualHandicap = Number(p1Player.current_index ?? 0);
    const p2ActualHandicap = Number(p2Player.current_index ?? 0);

    const p1CompetitionDiff = avg(p1CompetitionDiffs);
    const p2CompetitionDiff = avg(p2CompetitionDiffs);

    const p1CompetitionMedian = median(p1CompetitionDiffs);
    const p2CompetitionMedian = median(p2CompetitionDiffs);

    const p1ExpectedDiff = p1CompetitionDiff ?? avg(p1Diffs);
    const p2ExpectedDiff = p2CompetitionDiff ?? avg(p2Diffs);

    const p1RecentDiff = avg(p1Diffs);
    const p2RecentDiff = avg(p2Diffs);

    const p1Volatility = stdDev(
      p1CompetitionDiffs.length ? p1CompetitionDiffs : p1Diffs
    );

    const p2Volatility = stdDev(
      p2CompetitionDiffs.length ? p2CompetitionDiffs : p2Diffs
    );

    const strokeP1 =
      p1ExpectedDiff == null || p2ExpectedDiff == null
        ? 0.5
        : estimateStrokePlay({
            p1ExpectedDiff,
            p1Volatility,
            p1ActualHandicap,
            p2ExpectedDiff,
            p2Volatility,
            p2ActualHandicap,
          });

    const allHoleRows: HoleScoreRow[] = (holeRows ?? []).map((row: any) => ({
      player_id: row.player_id,
      hole_number: row.hole_number,
      gross_score: row.gross_score,
      stroke_index: row.stroke_index,
      tee_name: row.tee_name,
      rounds: Array.isArray(row.rounds) ? row.rounds[0] ?? null : row.rounds,
    }));

    const holeModeRows =
      params.holeMode === "competition"
        ? allHoleRows.filter((row) => isCompetition(row.rounds?.score_type))
        : allHoleRows;

    const p1HolePool = holeModeRows.filter(
      (row) => row.player_id === params.p1
    );

    const p2HolePool = holeModeRows.filter(
      (row) => row.player_id === params.p2
    );

    const p1CommonTee = mostCommonTee(p1HolePool);
    const p2CommonTee = mostCommonTee(p2HolePool);

    const p1MatchRows =
      params.teeMode === "common" && p1CommonTee
        ? p1HolePool.filter(
            (row) => (row.tee_name ?? "Unknown").trim() === p1CommonTee
          )
        : p1HolePool;

    const p2MatchRows =
      params.teeMode === "common" && p2CommonTee
        ? p2HolePool.filter(
            (row) => (row.tee_name ?? "Unknown").trim() === p2CommonTee
          )
        : p2HolePool;

    const matchEstimate = estimateHoleByHoleMatchPlay({
      p1HoleRows: p1MatchRows,
      p2HoleRows: p2MatchRows,
      p1ActualHandicap,
      p2ActualHandicap,
    });

    const handicapDifference = Math.round(
      Math.abs(p1ActualHandicap - p2ActualHandicap)
    );

    return {
      p1Name: p1Player.full_name,
      p2Name: p2Player.full_name,

      p1ActualHandicap,
      p2ActualHandicap,

      p1CompetitionDiff,
      p2CompetitionDiff,

      p1CompetitionMedian,
      p2CompetitionMedian,

      p1RecentDiff,
      p2RecentDiff,

      p1CompVsHandicap:
        p1CompetitionDiff == null ? null : p1CompetitionDiff - p1ActualHandicap,
      p2CompVsHandicap:
        p2CompetitionDiff == null ? null : p2CompetitionDiff - p2ActualHandicap,

      p1CompRounds: p1CompetitionDiffs.length,
      p2CompRounds: p2CompetitionDiffs.length,
      p1TotalRounds: p1Diffs.length,
      p2TotalRounds: p2Diffs.length,

      p1Volatility,
      p2Volatility,

      strokeP1,
      strokeP2: 1 - strokeP1,

      matchP1: matchEstimate.p1MatchWinChance,
      matchP2: matchEstimate.p2MatchWinChance,

      strokesGiven: handicapDifference,
      strokesReceiver:
        p1ActualHandicap > p2ActualHandicap
          ? p1Player.full_name
          : p2Player.full_name,

      favorite: strokeP1 >= 0.5 ? p1Player.full_name : p2Player.full_name,

      p1ExpectedHoles: matchEstimate.p1ExpectedHoles,
      p2ExpectedHoles: matchEstimate.p2ExpectedHoles,
      expectedTies: matchEstimate.expectedTies,

      p1CommonTee,
      p2CommonTee,

      holeMode: params.holeMode,
      teeMode: params.teeMode,

      holeDetails: matchEstimate.holeDetails,
    };
  },
};