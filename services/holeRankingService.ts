import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  aggregateRawPerformanceEstimate,
  expectedHoleScoreFromTeeRating,
  holeExpectationHandicapIndex,
  rankLeagueHolesByAverageToPar,
  shrinkPerformanceEstimate,
  type AggregatePerformanceObservation,
  type AggregateRawPerformanceEstimate,
} from "@/lib/holeRankingMath";
import {
  calculateHandicapIndexDetails,
  type AuditEvidenceRound,
} from "@/lib/auditEvidence";

export const GOODRICH_TEE_COLORS = ["Red", "Gold", "White", "Blue"] as const;
export const MINIMUM_HOLE_SCORES = 3;
export const PERFORMANCE_INDEX_BASE = 100;
export const STUDENT_T_DEGREES_OF_FREEDOM = 4;
const ROBUST_VARIANCE_PRIOR_OBSERVATIONS = 30;
const MIN_NUMERIC_VARIANCE = 1e-8;

export type GoodrichTeeColor = (typeof GOODRICH_TEE_COLORS)[number];
export type HoleRankingView = "worst" | "best";

export type PlayerHoleRanking = {
  playerId: string;
  playerName: string;
  teeRoundCount: number;
  scoreCount: number;
  averageGrossScore: number;
  averageExpectedScore: number;
  averageVsHandicap: number;
  rawPerformanceIndex: number | null;
  performanceIndex: number;
  performanceReliability: number;
  performanceConfidence: "Low" | "Moderate" | "High";
  posteriorStandardError: number;
  currentHandicapIndex: number | null;
  currentGoodrichTeeHandicapIndex: number | null;
  currentGoodrichTeeHandicapRoundCount: number;
  clubAverageIndex: number;
  vsClubIndex: number;
  rank: number;
  bestRank: number;
  qualifyingPlayers: number;
  worstPercentile: number;
  bestPercentile: number;
};

export type HoleRanking = {
  tee: GoodrichTeeColor;
  holeNumber: number;
  par: number | null;
  strokeIndex: number | null;
  yardage: number | null;
  robustScoringSigma: number | null;
  clubAverageIndex: number | null;
  leagueAverageGrossScore: number | null;
  leagueAverageToPar: number | null;
  leagueHoleIndex: number | null;
  players: PlayerHoleRanking[];
};

export type TeeHoleRankings = {
  tee: GoodrichTeeColor;
  teePar: number | null;
  courseRating: number | null;
  slopeRating: number | null;
  ratingRoundCount: number;
  holes: HoleRanking[];
};

export type PlayerGoodrichHoleRanking = {
  tee: GoodrichTeeColor;
  teePar: number | null;
  courseRating: number | null;
  slopeRating: number | null;
  holeNumber: number;
  par: number | null;
  strokeIndex: number | null;
  rawPerformanceIndex: number | null;
  adjustedPerformanceIndex: number;
  performanceReliability: number;
  performanceConfidence: "Low" | "Moderate" | "High";
  scoreCount: number;
  averageGrossScore: number;
  averageExpectedScore: number;
  averageVsExpected: number;
  currentHandicapIndex: number | null;
  currentGoodrichTeeHandicapIndex: number | null;
  currentGoodrichTeeHandicapRoundCount: number;
  clubAverageIndex: number;
  vsClubIndex: number;
  worstRank: number;
  bestRank: number;
  qualifyingPlayers: number;
  worstPercentile: number;
  bestPercentile: number;
};

export type HoleRankingReport = {
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  minimumScores: number;
  priorPerformanceIndex: number;
  priorStandardDeviationPoints: number;
  studentTDegreesOfFreedom: number;
  tees: TeeHoleRankings[];
  methodology: string;
};

export type HoleScoreRankingInput = {
  roundId: string;
  playerId: string;
  playerName: string;
  currentHandicapIndex: number | null;
  currentGoodrichTeeHandicapIndex: number | null;
  currentGoodrichTeeHandicapRoundCount: number;
  playedAt: string;
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
    | {
        full_name: string | null;
        is_active: boolean | null;
        current_index: number | null;
      }
    | {
        full_name: string | null;
        is_active: boolean | null;
        current_index: number | null;
      }[]
    | null;
  rounds:
    | { course_name: string | null; played_at: string | null }
    | { course_name: string | null; played_at: string | null }[]
    | null;
};

type CourseHoleQueryRow = {
  tee_name: string | null;
  hole_number: number;
  par: number | null;
  handicap: number | null;
  yardage: number | null;
};

type GoodrichHandicapRoundQueryRow = {
  id: string;
  player_id: string;
  played_at: string;
  differential: number | null;
  score_type: string | null;
  course_name: string | null;
  tee_name: string | null;
};

type CurrentGoodrichTeeHandicap = {
  index: number | null;
  roundCount: number;
};

type ScoreObservation = {
  playerId: string;
  playerName: string;
  currentHandicapIndex: number | null;
  currentGoodrichTeeHandicapIndex: number | null;
  currentGoodrichTeeHandicapRoundCount: number;
  par: number;
  grossScore: number;
  expectedScore: number;
  expectedAllowance: number;
  deviationFromExpected: number;
};

export type BayesianPerformanceObservation = AggregatePerformanceObservation;

export type BayesianPerformanceEstimate = {
  rawEffect: number | null;
  adjustedEffect: number;
  reliability: number;
  posteriorStandardError: number;
};

type RawPerformanceEstimate = AggregateRawPerformanceEstimate;

type EmpiricalBayesPrior = {
  mean: number;
  standardDeviation: number;
};

const METHODOLOGY =
  "Only hole scores from the latest 12 months are included. A separate Current Goodrich Tee HI is calculated for each player and tee from up to the 20 most recent HI-counting Goodrich differentials on that exact tee, using the WHS score-count table and fewer-than-20 adjustment. The tee-specific Goodrich HI is converted without rounding: expected round score equals Course Rating plus Goodrich Tee HI multiplied by Slope Rating divided by 113. Expected hole score equals hole par multiplied by expected round score divided by tee par. The displayed Course Rating and Slope Rating are the median values from distinct qualifying imported Goodrich rounds for that tee; each score uses its own imported rating and slope when available. If fewer than three same-tee Goodrich differentials are available, the official Current HI is used, followed by the imported round index as a fallback. A negative Handicap Index can still produce an expected score above par when the tee's Course Rating is above par. The Raw Performance Index is calculated directly from aggregate averages: 100 plus 100 times aggregate strokes versus expected divided by aggregate expected strokes from par. An index of 100 matches expectation, 120 is 20% worse, and 80 is 20% better. The Adjusted Performance Index moves the raw index only partway toward the learned club baseline: 40% of the distance at 0% confidence, 20% at 50% confidence, and 0% at 100% confidence. Confidence uses the greater of the statistical reliability and a golf sample-size floor: three scores equal 5%, four equal 15%, five equal 25%, and each additional score adds 10 percentage points up to 100%. Player scoring variance is partially pooled with the tee-and-hole variance, and a robust empirical-Bayes prior prevents one unusual player from moving the club baseline excessively. Players need at least three scores on the same tee and hole during the 12-month window. Club averages give each qualifying player equal weight.";

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

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function robustStandardDeviation(values: number[], fallback: number) {
  if (values.length < 2) return fallback;
  const center = median(values);
  const mad = median(values.map((value) => Math.abs(value - center)));
  const madSigma = mad * 1.4826;
  if (madSigma > MIN_NUMERIC_VARIANCE) return madSigma;

  const rms = Math.sqrt(
    values.reduce((sum, value) => sum + (value - center) ** 2, 0) /
      Math.max(values.length - 1, 1)
  );
  return rms > MIN_NUMERIC_VARIANCE ? rms : fallback;
}

function studentTWeight(standardizedResidual: number) {
  return (
    (STUDENT_T_DEGREES_OF_FREEDOM + 1) /
    (STUDENT_T_DEGREES_OF_FREEDOM + standardizedResidual ** 2)
  );
}

function empiricalBayesPrior(
  estimates: RawPerformanceEstimate[]
): EmpiricalBayesPrior {
  if (!estimates.length) {
    return { mean: 0, standardDeviation: 0.5 };
  }

  const effects = estimates.map((estimate) => estimate.effect);
  const initialMean = median(effects);
  const observedScale = robustStandardDeviation(effects, 0.5);
  const largestMeasurementSigma = Math.sqrt(
    Math.max(...estimates.map((estimate) => estimate.measurementVariance))
  );
  const minimumPriorSigma = 0.01;
  const maximumPriorSigma = Math.max(
    0.2,
    observedScale * 4,
    largestMeasurementSigma
  );
  let bestPrior: EmpiricalBayesPrior = {
    mean: initialMean,
    standardDeviation: observedScale,
  };
  let bestObjective = Number.POSITIVE_INFINITY;

  for (let index = 0; index <= 160; index += 1) {
    const fraction = index / 160;
    const standardDeviation =
      minimumPriorSigma *
      (maximumPriorSigma / minimumPriorSigma) ** fraction;
    const priorVariance = standardDeviation ** 2;
    let mean = initialMean;

    for (let iteration = 0; iteration < 8; iteration += 1) {
      let numerator = 0;
      let denominator = 0;

      for (const estimate of estimates) {
        const marginalVariance =
          priorVariance + estimate.measurementVariance;
        const standardizedResidual =
          (estimate.effect - mean) / Math.sqrt(marginalVariance);
        const precision =
          studentTWeight(standardizedResidual) / marginalVariance;
        numerator += precision * estimate.effect;
        denominator += precision;
      }

      if (denominator <= MIN_NUMERIC_VARIANCE) break;
      const updatedMean = numerator / denominator;
      if (Math.abs(updatedMean - mean) < 1e-7) {
        mean = updatedMean;
        break;
      }
      mean = updatedMean;
    }

    const objective = estimates.reduce((sum, estimate) => {
      const marginalVariance = priorVariance + estimate.measurementVariance;
      const standardizedSquared = (estimate.effect - mean) ** 2 / marginalVariance;
      return (
        sum +
        0.5 * Math.log(marginalVariance) +
        ((STUDENT_T_DEGREES_OF_FREEDOM + 1) / 2) *
          Math.log1p(
            standardizedSquared / STUDENT_T_DEGREES_OF_FREEDOM
          )
      );
    }, 0);

    if (objective < bestObjective) {
      bestObjective = objective;
      bestPrior = { mean, standardDeviation };
    }
  }

  return bestPrior;
}

export function calculateBayesianPerformanceEstimate(
  observations: BayesianPerformanceObservation[],
  scoringSigma: number,
  priorMean: number,
  priorStandardDeviation: number
): BayesianPerformanceEstimate {
  const rawEstimate = aggregateRawPerformanceEstimate(
    observations,
    scoringSigma
  );
  const adjusted = shrinkPerformanceEstimate(
    rawEstimate,
    priorMean,
    priorStandardDeviation
  );

  return {
    rawEffect: rawEstimate?.effect ?? null,
    adjustedEffect: adjusted.adjustedEffect,
    reliability: adjusted.reliability,
    posteriorStandardError: adjusted.posteriorStandardError,
  };
}

function performanceConfidence(reliability: number) {
  if (reliability >= 0.8) return "High" as const;
  if (reliability >= 0.5) return "Moderate" as const;
  return "Low" as const;
}

export function twelveMonthHoleRankingPeriod(generatedAt: string) {
  const periodEnd = generatedAt.slice(0, 10);
  const startDate = new Date(`${periodEnd}T00:00:00.000Z`);
  startDate.setUTCFullYear(startDate.getUTCFullYear() - 1);

  return {
    periodStart: startDate.toISOString().slice(0, 10),
    periodEnd,
  };
}

export function normalizeHoleRankingView(
  value: string | null | undefined
): HoleRankingView {
  return value?.toLowerCase() === "best" ? "best" : "worst";
}

export function holeRankingRank(
  player: PlayerHoleRanking,
  view: HoleRankingView
) {
  return view === "best" ? player.bestRank : player.rank;
}

export function holeRankingPercentile(
  player: PlayerHoleRanking,
  view: HoleRankingView
) {
  return view === "best" ? player.bestPercentile : player.worstPercentile;
}

export function playersForHoleRankingView(
  players: PlayerHoleRanking[],
  view: HoleRankingView
) {
  return [...players].sort((a, b) => {
    const rankDifference = holeRankingRank(a, view) - holeRankingRank(b, view);
    if (rankDifference !== 0) return rankDifference;
    if (a.performanceIndex !== b.performanceIndex) {
      return view === "best"
        ? a.performanceIndex - b.performanceIndex
        : b.performanceIndex - a.performanceIndex;
    }
    return a.playerName.localeCompare(b.playerName);
  });
}

export function goodrichHoleRankingsForPlayer(
  report: HoleRankingReport,
  playerId: string
): PlayerGoodrichHoleRanking[] {
  return report.tees.flatMap((tee) =>
    tee.holes.flatMap((hole) => {
      const ranking = hole.players.find(
        (candidate) => candidate.playerId === playerId
      );
      if (!ranking) return [];

      return [
        {
          tee: tee.tee,
          teePar: tee.teePar,
          courseRating: tee.courseRating,
          slopeRating: tee.slopeRating,
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokeIndex: hole.strokeIndex,
          rawPerformanceIndex: ranking.rawPerformanceIndex,
          adjustedPerformanceIndex: ranking.performanceIndex,
          performanceReliability: ranking.performanceReliability,
          performanceConfidence: ranking.performanceConfidence,
          scoreCount: ranking.scoreCount,
          averageGrossScore: ranking.averageGrossScore,
          averageExpectedScore: ranking.averageExpectedScore,
          averageVsExpected: ranking.averageVsHandicap,
          currentHandicapIndex: ranking.currentHandicapIndex,
          currentGoodrichTeeHandicapIndex:
            ranking.currentGoodrichTeeHandicapIndex,
          currentGoodrichTeeHandicapRoundCount:
            ranking.currentGoodrichTeeHandicapRoundCount,
          clubAverageIndex: ranking.clubAverageIndex,
          vsClubIndex: ranking.vsClubIndex,
          worstRank: ranking.rank,
          bestRank: ranking.bestRank,
          qualifyingPlayers: ranking.qualifyingPlayers,
          worstPercentile: ranking.worstPercentile,
          bestPercentile: ranking.bestPercentile,
        },
      ];
    })
  );
}

export function normalizeGoodrichTee(
  teeName: string | null | undefined
): GoodrichTeeColor | null {
  const words = (teeName ?? "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((word) => (word === "yellow" ? "gold" : word));
  const matches = GOODRICH_TEE_COLORS.filter((color) =>
    words.includes(color.toLowerCase())
  );

  // A combo tee such as "Blue/White" is not mixed into either single-tee group.
  return matches.length === 1 ? matches[0] : null;
}

function deriveExpectationHandicapIndex(
  row: HoleScoreRankingInput,
  teePar: number | null,
  courseRating: number | null,
  slopeRating: number | null
) {
  return holeExpectationHandicapIndex({
    currentGoodrichTeeHandicapIndex: finiteNumber(
      row.currentGoodrichTeeHandicapIndex
    ),
    currentHandicapIndex: finiteNumber(row.currentHandicapIndex),
    importedHandicapIndex: finiteNumber(row.handicapIndexUsed),
    importedCourseHandicap: finiteNumber(row.courseHandicap),
    teePar,
    courseRating,
    slopeRating,
  });
}

export function buildHoleRankingReport(
  scoreRows: HoleScoreRankingInput[],
  courseRows: CourseHoleRankingInput[],
  generatedAt = new Date().toISOString()
): HoleRankingReport {
  const { periodStart, periodEnd } = twelveMonthHoleRankingPeriod(generatedAt);
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

  const teeRatingSamples = new Map<
    GoodrichTeeColor,
    Array<{ courseRating: number; slopeRating: number }>
  >();
  const seenRatingRounds = new Set<string>();

  for (const row of scoreRows) {
    const tee = normalizeGoodrichTee(row.teeName);
    const playedAt = row.playedAt.slice(0, 10);
    const courseRating = finiteNumber(row.courseRating);
    const slopeRating = finiteNumber(row.slopeRating);
    if (
      !tee ||
      playedAt < periodStart ||
      playedAt > periodEnd ||
      courseRating === null ||
      courseRating <= 0 ||
      slopeRating === null ||
      slopeRating <= 0
    ) {
      continue;
    }

    const roundKey = `${row.roundId}|${row.playerId}|${tee}`;
    if (seenRatingRounds.has(roundKey)) continue;
    seenRatingRounds.add(roundKey);
    const samples = teeRatingSamples.get(tee) ?? [];
    samples.push({ courseRating, slopeRating });
    teeRatingSamples.set(tee, samples);
  }

  const teeRatingProfiles = new Map(
    GOODRICH_TEE_COLORS.map((tee) => {
      const samples = teeRatingSamples.get(tee) ?? [];
      return [
        tee,
        {
          courseRating: samples.length
            ? median(samples.map((sample) => sample.courseRating))
            : null,
          slopeRating: samples.length
            ? median(samples.map((sample) => sample.slopeRating))
            : null,
          roundCount: samples.length,
        },
      ] as const;
    })
  );

  const observations = new Map<string, ScoreObservation[]>();
  const seenScores = new Set<string>();
  const roundIdsByTeePlayer = new Map<string, Set<string>>();

  for (const row of scoreRows) {
    const tee = normalizeGoodrichTee(row.teeName);
    const holeNumber = finiteNumber(row.holeNumber);
    const grossScore = finiteNumber(row.grossScore);
    const playedAt = row.playedAt.slice(0, 10);

    if (
      !tee ||
      playedAt < periodStart ||
      playedAt > periodEnd ||
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
    const teeRatingProfile = teeRatingProfiles.get(tee);
    const courseRating =
      finiteNumber(row.courseRating) ?? teeRatingProfile?.courseRating ?? null;
    const slopeRating =
      finiteNumber(row.slopeRating) ?? teeRatingProfile?.slopeRating ?? null;
    const expectationHandicapIndex = deriveExpectationHandicapIndex(
      row,
      teePar,
      courseRating,
      slopeRating
    );

    if (
      par === null ||
      expectationHandicapIndex === null ||
      teePar === null ||
      courseRating === null ||
      slopeRating === null
    ) {
      continue;
    }

    const expectedScore = expectedHoleScoreFromTeeRating(
      par,
      teePar,
      expectationHandicapIndex,
      courseRating,
      slopeRating
    );
    if (expectedScore === null) continue;
    const expectedAllowance = Math.abs(expectedScore - par);
    const deviationFromExpected = grossScore - expectedScore;
    const key = `${tee}|${holeNumber}|${row.playerId}`;
    const current = observations.get(key) ?? [];
    current.push({
      playerId: row.playerId,
      playerName: row.playerName.trim() || "Unknown Player",
      currentHandicapIndex: finiteNumber(row.currentHandicapIndex),
      currentGoodrichTeeHandicapIndex: finiteNumber(
        row.currentGoodrichTeeHandicapIndex
      ),
      currentGoodrichTeeHandicapRoundCount:
        row.currentGoodrichTeeHandicapRoundCount,
      par,
      grossScore,
      expectedScore,
      expectedAllowance,
      deviationFromExpected,
    });
    observations.set(key, current);

    const teePlayerKey = `${tee}|${row.playerId}`;
    const roundIds = roundIdsByTeePlayer.get(teePlayerKey) ?? new Set<string>();
    roundIds.add(row.roundId);
    roundIdsByTeePlayer.set(teePlayerKey, roundIds);
  }

  const centeredResidualsByHole = new Map<string, number[]>();
  const pooledCenteredResiduals: number[] = [];

  for (const [key, values] of observations) {
    if (values.length < 2) continue;
    const [tee, holeNumber] = key.split("|");
    const holeKey = `${tee}|${holeNumber}`;
    const playerCenter = median(
      values.map((value) => value.deviationFromExpected)
    );
    const holeResiduals = centeredResidualsByHole.get(holeKey) ?? [];

    for (const value of values) {
      const centered = value.deviationFromExpected - playerCenter;
      holeResiduals.push(centered);
      pooledCenteredResiduals.push(centered);
    }
    centeredResidualsByHole.set(holeKey, holeResiduals);
  }

  const pooledScoringSigma = robustStandardDeviation(
    pooledCenteredResiduals,
    1
  );
  const scoringSigmaByHole = new Map<string, number>();

  for (const tee of GOODRICH_TEE_COLORS) {
    for (let holeNumber = 1; holeNumber <= 18; holeNumber += 1) {
      const holeKey = `${tee}|${holeNumber}`;
      const residuals = centeredResidualsByHole.get(holeKey) ?? [];
      const holeSigma = robustStandardDeviation(
        residuals,
        pooledScoringSigma
      );
      const holeWeight =
        residuals.length /
        (residuals.length + ROBUST_VARIANCE_PRIOR_OBSERVATIONS);
      const partiallyPooledVariance =
        holeWeight * holeSigma ** 2 +
        (1 - holeWeight) * pooledScoringSigma ** 2;
      scoringSigmaByHole.set(
        holeKey,
        Math.sqrt(Math.max(partiallyPooledVariance, MIN_NUMERIC_VARIANCE))
      );
    }
  }

  const priorObservationsByPlayer = new Map<string, ScoreObservation[]>();
  for (const values of observations.values()) {
    const playerId = values[0]?.playerId;
    if (!playerId) continue;
    const current = priorObservationsByPlayer.get(playerId) ?? [];
    current.push(...values);
    priorObservationsByPlayer.set(playerId, current);
  }
  const rawEstimates = Array.from(priorObservationsByPlayer.values()).flatMap(
    (values) => {
      if (values.length < 18) return [];
      const estimate = aggregateRawPerformanceEstimate(
        values,
        pooledScoringSigma
      );
      return estimate ? [estimate] : [];
    }
  );
  const prior = empiricalBayesPrior(rawEstimates);

  const leagueHoleStatistics = new Map<
    string,
    {
      averageGrossScore: number;
      averageToPar: number;
      leagueHoleIndex: number;
    }
  >();

  for (const tee of GOODRICH_TEE_COLORS) {
    const teeHoleAverages = Array.from({ length: 18 }, (_, index) => {
      const holeNumber = index + 1;
      const grossScores = Array.from(observations.entries())
        .filter(([key]) => {
          const [rowTee, rowHole] = key.split("|");
          return rowTee === tee && Number(rowHole) === holeNumber;
        })
        .flatMap(([, values]) => values.map((value) => value.grossScore));
      const par = finiteNumber(courseHoleMap.get(`${tee}|${holeNumber}`)?.par);

      if (!grossScores.length || par === null) return null;
      return {
        holeNumber,
        par,
        averageGrossScore: average(grossScores),
      };
    }).filter((hole): hole is NonNullable<typeof hole> => hole !== null);

    for (const hole of rankLeagueHolesByAverageToPar(teeHoleAverages)) {
      leagueHoleStatistics.set(`${tee}|${hole.holeNumber}`, {
        averageGrossScore: rounded(hole.averageGrossScore),
        averageToPar: rounded(hole.averageToPar),
        leagueHoleIndex: hole.leagueHoleIndex,
      });
    }
  }

  const tees = GOODRICH_TEE_COLORS.map<TeeHoleRankings>((tee) => ({
    tee,
    teePar: (teePars.get(tee) ?? 0) || null,
    courseRating:
      teeRatingProfiles.get(tee)?.courseRating === null
        ? null
        : rounded(teeRatingProfiles.get(tee)?.courseRating ?? 0, 1),
    slopeRating:
      teeRatingProfiles.get(tee)?.slopeRating === null
        ? null
        : rounded(teeRatingProfiles.get(tee)?.slopeRating ?? 0, 1),
    ratingRoundCount: teeRatingProfiles.get(tee)?.roundCount ?? 0,
    holes: Array.from({ length: 18 }, (_, index): HoleRanking => {
      const holeNumber = index + 1;
      const definition = courseHoleMap.get(`${tee}|${holeNumber}`);
      const leagueStatistics = leagueHoleStatistics.get(
        `${tee}|${holeNumber}`
      );
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
          const rawAverageVsExpected =
            rawAverageGrossScore - rawAverageExpectedScore;
          const scoringSigma =
            scoringSigmaByHole.get(`${tee}|${holeNumber}`) ??
            pooledScoringSigma;
          const estimate = calculateBayesianPerformanceEstimate(
            values,
            scoringSigma,
            prior.mean,
            prior.standardDeviation
          );

          return {
            playerId: values[0].playerId,
            playerName: values[0].playerName,
            currentHandicapIndex: values[0].currentHandicapIndex,
            currentGoodrichTeeHandicapIndex:
              values[0].currentGoodrichTeeHandicapIndex,
            currentGoodrichTeeHandicapRoundCount:
              values[0].currentGoodrichTeeHandicapRoundCount,
            teeRoundCount:
              roundIdsByTeePlayer.get(`${tee}|${values[0].playerId}`)?.size ??
              values.length,
            scoreCount: values.length,
            averageGrossScore: rounded(rawAverageGrossScore),
            averageExpectedScore: rounded(rawAverageExpectedScore),
            averageVsHandicap: rounded(rawAverageVsExpected),
            rawPerformanceIndex:
              estimate.rawEffect === null
                ? null
                : rounded(
                    PERFORMANCE_INDEX_BASE +
                      PERFORMANCE_INDEX_BASE * estimate.rawEffect,
                    2
                  ),
            performanceIndex: rounded(
              PERFORMANCE_INDEX_BASE +
                PERFORMANCE_INDEX_BASE * estimate.adjustedEffect,
              2
            ),
            performanceReliability: rounded(estimate.reliability, 4),
            performanceConfidence: performanceConfidence(estimate.reliability),
            posteriorStandardError: rounded(
              estimate.posteriorStandardError,
              4
            ),
          };
        })
        .sort((a, b) => {
          if (a.performanceIndex !== b.performanceIndex) {
            return b.performanceIndex - a.performanceIndex;
          }
          if (a.averageVsHandicap !== b.averageVsHandicap) {
            return b.averageVsHandicap - a.averageVsHandicap;
          }
          if (a.averageGrossScore !== b.averageGrossScore) {
            return b.averageGrossScore - a.averageGrossScore;
          }
          return a.playerName.localeCompare(b.playerName);
        });

      const clubAverageIndex = playerRows.length
        ? rounded(
            average(playerRows.map((player) => player.performanceIndex)),
            2
          )
        : null;
      let previousValue: number | null = null;
      let previousRank = 0;

      const players = playerRows.map<PlayerHoleRanking>((player, rowIndex) => {
        const isTie =
          previousValue !== null &&
          Math.abs(player.performanceIndex - previousValue) < 0.001;
        const rank = isTie ? previousRank : rowIndex + 1;
        previousValue = player.performanceIndex;
        previousRank = rank;
        const qualifyingPlayers = playerRows.length;
        const bestRank =
          1 +
          playerRows.filter(
            (candidate) =>
              candidate.performanceIndex < player.performanceIndex - 0.001
          ).length;

        return {
          ...player,
          clubAverageIndex: clubAverageIndex ?? PERFORMANCE_INDEX_BASE,
          vsClubIndex: rounded(
            player.performanceIndex -
              (clubAverageIndex ?? PERFORMANCE_INDEX_BASE),
            2
          ),
          rank,
          bestRank,
          qualifyingPlayers,
          worstPercentile:
            qualifyingPlayers <= 1
              ? 100
              : rounded(
                  ((qualifyingPlayers - rank) / (qualifyingPlayers - 1)) * 100,
                  1
                ),
          bestPercentile:
            qualifyingPlayers <= 1
              ? 100
              : rounded(
                  ((qualifyingPlayers - bestRank) /
                    (qualifyingPlayers - 1)) *
                    100,
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
        robustScoringSigma: rounded(
          scoringSigmaByHole.get(`${tee}|${holeNumber}`) ??
            pooledScoringSigma,
          3
        ),
        clubAverageIndex,
        leagueAverageGrossScore:
          leagueStatistics?.averageGrossScore ?? null,
        leagueAverageToPar: leagueStatistics?.averageToPar ?? null,
        leagueHoleIndex: leagueStatistics?.leagueHoleIndex ?? null,
        players,
      };
    }),
  }));

  return {
    generatedAt,
    periodStart,
    periodEnd,
    minimumScores: MINIMUM_HOLE_SCORES,
    priorPerformanceIndex: rounded(
      PERFORMANCE_INDEX_BASE + PERFORMANCE_INDEX_BASE * prior.mean,
      2
    ),
    priorStandardDeviationPoints: rounded(
      PERFORMANCE_INDEX_BASE * prior.standardDeviation,
      2
    ),
    studentTDegreesOfFreedom: STUDENT_T_DEGREES_OF_FREEDOM,
    tees,
    methodology: METHODOLOGY,
  };
}

async function loadAllHoleScores(periodStart: string, periodEnd: string) {
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
        players!inner(full_name, is_active, current_index),
        rounds!inner(course_name, played_at)
      `)
      .eq("source", "GHIN_HBH_PDF")
      .eq("players.is_active", true)
      .ilike("rounds.course_name", "%Goodrich%")
      .gte("rounds.played_at", periodStart)
      .lte("rounds.played_at", periodEnd)
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

async function loadAllCurrentGoodrichTeeHandicapRounds(periodEnd: string) {
  const supabase = createSupabaseServerClient();
  const pageSize = 1_000;
  const rows: GoodrichHandicapRoundQueryRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("player_display_rounds")
      .select(`
        id,
        player_id,
        played_at,
        differential,
        score_type,
        course_name,
        tee_name
      `)
      .eq("counts_for_hi", true)
      .ilike("course_name", "%Goodrich%")
      .not("differential", "is", null)
      .not("played_at", "is", null)
      .lte("played_at", periodEnd)
      .order("player_id", { ascending: true })
      .order("played_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const page = (data ?? []) as unknown as GoodrichHandicapRoundQueryRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

function currentGoodrichTeeHandicaps(
  rows: GoodrichHandicapRoundQueryRow[]
) {
  const roundsByPlayerAndTee = new Map<string, AuditEvidenceRound[]>();

  for (const row of rows) {
    const tee = normalizeGoodrichTee(row.tee_name);
    if (!tee || !row.player_id) continue;

    const key = `${tee}|${row.player_id}`;
    const current = roundsByPlayerAndTee.get(key) ?? [];
    current.push({
      id: row.id,
      played_at: row.played_at,
      differential: row.differential,
      score_type: row.score_type,
      course_name: row.course_name,
    });
    roundsByPlayerAndTee.set(key, current);
  }

  return new Map<string, CurrentGoodrichTeeHandicap>(
    Array.from(roundsByPlayerAndTee.entries()).map(([key, rounds]) => {
      const details = calculateHandicapIndexDetails(rounds);
      return [
        key,
        {
          index: details.index,
          roundCount: details.selected.length,
        },
      ];
    })
  );
}

export async function getGoodrichHoleRankingReport(
  generatedAt = new Date().toISOString()
) {
  const supabase = createSupabaseServerClient();
  const { periodStart, periodEnd } = twelveMonthHoleRankingPeriod(generatedAt);
  const [scoreRows, handicapRows, courseResult] = await Promise.all([
    loadAllHoleScores(periodStart, periodEnd),
    loadAllCurrentGoodrichTeeHandicapRounds(periodEnd),
    supabase
      .from("course_holes")
      .select("tee_name, hole_number, par, handicap, yardage")
      .eq("course_name", "Goodrich")
      .order("tee_name")
      .order("hole_number"),
  ]);

  if (courseResult.error) throw courseResult.error;

  const currentGoodrichTeeHandicapByPlayer =
    currentGoodrichTeeHandicaps(handicapRows);

  const scores = scoreRows.map<HoleScoreRankingInput>((row) => {
    const player = firstRelation(row.players);
    const round = firstRelation(row.rounds);
    const tee = normalizeGoodrichTee(row.tee_name);
    const goodrichTeeHandicap = tee
      ? currentGoodrichTeeHandicapByPlayer.get(`${tee}|${row.player_id}`)
      : null;

    return {
      roundId: row.round_id,
      playerId: row.player_id,
      playerName: player?.full_name ?? "Unknown Player",
      currentHandicapIndex: finiteNumber(player?.current_index),
      currentGoodrichTeeHandicapIndex:
        goodrichTeeHandicap?.index ?? null,
      currentGoodrichTeeHandicapRoundCount:
        goodrichTeeHandicap?.roundCount ?? 0,
      playedAt: round?.played_at ?? "",
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

  return buildHoleRankingReport(scores, courseHoles, generatedAt);
}
