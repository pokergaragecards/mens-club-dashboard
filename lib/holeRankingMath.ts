const MIN_NUMERIC_VARIANCE = 1e-8;
const MAX_PRIOR_SHRINKAGE = 0.4;

export type AggregatePerformanceObservation = {
  expectedAllowance: number;
  deviationFromExpected: number;
};

export type AggregateRawPerformanceEstimate = {
  effect: number;
  measurementVariance: number;
  scoringStandardDeviation: number;
  observationCount: number;
};

export type ShrunkPerformanceEstimate = {
  adjustedEffect: number;
  reliability: number;
  posteriorStandardError: number;
};

export type LeagueHoleAverage = {
  holeNumber: number;
  par: number;
  averageGrossScore: number;
};

export type RankedLeagueHoleAverage = LeagueHoleAverage & {
  averageToPar: number;
  leagueHoleIndex: number;
};

export type HoleExpectationHandicapInput = {
  currentGoodrichTeeHandicapIndex: number | null;
  currentHandicapIndex: number | null;
  importedHandicapIndex: number | null;
  importedCourseHandicap: number | null;
  teePar: number | null;
  courseRating: number | null;
  slopeRating: number | null;
};

function sampleStandardDeviation(values: number[], fallback: number) {
  if (values.length < 2) return fallback;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  const standardDeviation = Math.sqrt(Math.max(variance, 0));
  return standardDeviation > MIN_NUMERIC_VARIANCE
    ? standardDeviation
    : fallback;
}

export function golfSampleConfidence(scoreCount: number) {
  if (!Number.isFinite(scoreCount) || scoreCount <= 0) return 0;
  const confidence = Math.round((0.25 + 0.1 * (scoreCount - 5)) * 100) / 100;
  return Math.min(1, Math.max(0, confidence));
}

export function priorShrinkageFraction(confidence: number) {
  const boundedConfidence = Math.min(1, Math.max(0, confidence));
  return MAX_PRIOR_SHRINKAGE * (1 - boundedConfidence);
}

export function expectedRoundScoreFromHandicapIndex(
  handicapIndex: number,
  courseRating: number,
  slopeRating: number
) {
  if (
    !Number.isFinite(handicapIndex) ||
    !Number.isFinite(courseRating) ||
    !Number.isFinite(slopeRating) ||
    courseRating <= 0 ||
    slopeRating <= 0
  ) {
    return null;
  }

  return courseRating + handicapIndex * (slopeRating / 113);
}

export function holeExpectationHandicapIndex({
  currentGoodrichTeeHandicapIndex,
  currentHandicapIndex,
  importedHandicapIndex,
  importedCourseHandicap,
  teePar,
  courseRating,
  slopeRating,
}: HoleExpectationHandicapInput) {
  for (const handicapIndex of [
    currentGoodrichTeeHandicapIndex,
    currentHandicapIndex,
    importedHandicapIndex,
  ]) {
    if (handicapIndex !== null && Number.isFinite(handicapIndex)) {
      return handicapIndex;
    }
  }

  if (
    importedCourseHandicap === null ||
    !Number.isFinite(importedCourseHandicap) ||
    teePar === null ||
    !Number.isFinite(teePar) ||
    courseRating === null ||
    !Number.isFinite(courseRating) ||
    slopeRating === null ||
    !Number.isFinite(slopeRating) ||
    slopeRating <= 0
  ) {
    return null;
  }

  return (
    (importedCourseHandicap - (courseRating - teePar)) *
    (113 / slopeRating)
  );
}

export function expectedHoleScoreFromTeeRating(
  par: number,
  teePar: number,
  handicapIndex: number,
  courseRating: number,
  slopeRating: number
) {
  const expectedRoundScore = expectedRoundScoreFromHandicapIndex(
    handicapIndex,
    courseRating,
    slopeRating
  );

  if (
    !Number.isFinite(par) ||
    !Number.isFinite(teePar) ||
    expectedRoundScore === null ||
    par <= 0 ||
    teePar <= 0 ||
    expectedRoundScore <= 0
  ) {
    return null;
  }

  return par * (expectedRoundScore / teePar);
}

export function rankLeagueHolesByAverageToPar(
  holes: LeagueHoleAverage[]
): RankedLeagueHoleAverage[] {
  return holes
    .filter(
      (hole) =>
        Number.isInteger(hole.holeNumber) &&
        hole.holeNumber > 0 &&
        Number.isFinite(hole.par) &&
        hole.par > 0 &&
        Number.isFinite(hole.averageGrossScore) &&
        hole.averageGrossScore > 0
    )
    .map((hole) => ({
      ...hole,
      averageToPar: hole.averageGrossScore - hole.par,
      leagueHoleIndex: 0,
    }))
    .sort((a, b) => {
      if (a.averageToPar !== b.averageToPar) {
        return b.averageToPar - a.averageToPar;
      }
      return a.holeNumber - b.holeNumber;
    })
    .map((hole, index) => ({
      ...hole,
      leagueHoleIndex: index + 1,
    }));
}

export function aggregateRawPerformanceEstimate(
  observations: AggregatePerformanceObservation[],
  clubScoringStandardDeviation: number,
  variancePriorObservations = 5
): AggregateRawPerformanceEstimate | null {
  if (!observations.length) return null;

  const totalAllowance = observations.reduce(
    (sum, observation) => sum + Math.abs(observation.expectedAllowance),
    0
  );
  if (totalAllowance <= MIN_NUMERIC_VARIANCE) return null;

  const effect =
    observations.reduce(
      (sum, observation) => sum + observation.deviationFromExpected,
      0
    ) / totalAllowance;
  const residuals = observations.map(
    (observation) =>
      observation.deviationFromExpected -
      Math.abs(observation.expectedAllowance) * effect
  );
  const stableClubSigma = Math.max(
    clubScoringStandardDeviation,
    Math.sqrt(MIN_NUMERIC_VARIANCE)
  );
  const playerSigma = sampleStandardDeviation(residuals, stableClubSigma);
  const playerVarianceWeight =
    observations.length /
    (observations.length + Math.max(variancePriorObservations, 0));
  const pooledScoringVariance =
    playerVarianceWeight * playerSigma ** 2 +
    (1 - playerVarianceWeight) * stableClubSigma ** 2;

  return {
    effect,
    measurementVariance:
      (pooledScoringVariance * observations.length) /
      Math.max(totalAllowance ** 2, MIN_NUMERIC_VARIANCE),
    scoringStandardDeviation: Math.sqrt(pooledScoringVariance),
    observationCount: observations.length,
  };
}

export function shrinkPerformanceEstimate(
  rawEstimate: AggregateRawPerformanceEstimate | null,
  priorMean: number,
  priorStandardDeviation: number
): ShrunkPerformanceEstimate {
  const stablePriorStandardDeviation = Math.max(
    priorStandardDeviation,
    Math.sqrt(MIN_NUMERIC_VARIANCE)
  );
  const priorVariance = stablePriorStandardDeviation ** 2;

  if (!rawEstimate) {
    return {
      adjustedEffect: priorMean,
      reliability: 0,
      posteriorStandardError: stablePriorStandardDeviation,
    };
  }

  const measurementVariance = Math.max(
    rawEstimate.measurementVariance,
    MIN_NUMERIC_VARIANCE
  );
  const statisticalReliability =
    priorVariance / (priorVariance + measurementVariance);
  const reliability = Math.max(
    statisticalReliability,
    golfSampleConfidence(rawEstimate.observationCount)
  );
  const shrinkageFraction = priorShrinkageFraction(reliability);
  const adjustedEffect =
    rawEstimate.effect +
    shrinkageFraction * (priorMean - rawEstimate.effect);
  const posteriorVariance = priorVariance * (1 - reliability);

  return {
    adjustedEffect,
    reliability,
    posteriorStandardError: Math.sqrt(posteriorVariance),
  };
}
