const MIN_NUMERIC_VARIANCE = 1e-8;

export type AggregatePerformanceObservation = {
  expectedAllowance: number;
  deviationFromExpected: number;
};

export type AggregateRawPerformanceEstimate = {
  effect: number;
  measurementVariance: number;
  scoringStandardDeviation: number;
};

export type ShrunkPerformanceEstimate = {
  adjustedEffect: number;
  reliability: number;
  posteriorStandardError: number;
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
  const reliability = priorVariance / (priorVariance + measurementVariance);
  const adjustedEffect =
    priorMean + reliability * (rawEstimate.effect - priorMean);
  const posteriorVariance =
    (priorVariance * measurementVariance) /
    (priorVariance + measurementVariance);

  return {
    adjustedEffect,
    reliability,
    posteriorStandardError: Math.sqrt(posteriorVariance),
  };
}
