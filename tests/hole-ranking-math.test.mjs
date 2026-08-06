import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateRawPerformanceEstimate,
  golfSampleConfidence,
  priorShrinkageFraction,
  shrinkPerformanceEstimate,
} from "../lib/holeRankingMath.ts";

test("raw performance index uses the ratio of aggregate averages", () => {
  const observations = Array.from({ length: 26 }, () => ({
    expectedAllowance: 0.45,
    deviationFromExpected: 0.13,
  }));
  const estimate = aggregateRawPerformanceEstimate(observations, 0.8);

  assert.ok(estimate);
  const rawIndex = 100 + 100 * estimate.effect;
  assert.ok(Math.abs(rawIndex - 128.8888888889) < 1e-9);
});

test("adjusted effect uses the gentler confidence-based shrinkage", () => {
  const estimate = shrinkPerformanceEstimate(
    {
      effect: 0.5,
      measurementVariance: 0.04,
      scoringStandardDeviation: 0.8,
      observationCount: 5,
    },
    0.1,
    0.2
  );

  assert.equal(estimate.reliability, 0.5);
  assert.equal(priorShrinkageFraction(0), 0.4);
  assert.equal(priorShrinkageFraction(0.5), 0.2);
  assert.equal(priorShrinkageFraction(1), 0);
  assert.ok(Math.abs(estimate.adjustedEffect - 0.42) < 1e-12);
  assert.ok(Math.abs(estimate.posteriorStandardError - Math.sqrt(0.02)) < 1e-12);
});

test("low-confidence Goodrich table values retain most of the raw index", () => {
  const estimate = shrinkPerformanceEstimate(
    {
      effect: 2.044,
      measurementVariance: 0.76,
      scoringStandardDeviation: 0.8,
      observationCount: 3,
    },
    0.265,
    0.2
  );

  assert.ok(Math.abs(estimate.reliability - 0.05) < 1e-12);
  assert.ok(Math.abs(100 + 100 * estimate.adjustedEffect - 236.798) < 1e-9);
});

test("golf confidence starts at 25 percent for five scores and adds ten points", () => {
  assert.equal(golfSampleConfidence(3), 0.05);
  assert.equal(golfSampleConfidence(4), 0.15);
  assert.equal(golfSampleConfidence(5), 0.25);
  assert.equal(golfSampleConfidence(6), 0.35);
  assert.equal(golfSampleConfidence(10), 0.75);
  assert.equal(golfSampleConfidence(12), 0.95);
  assert.equal(golfSampleConfidence(13), 1);
  assert.equal(golfSampleConfidence(30), 1);
});

test("more scores increase reliability when allowance and variability match", () => {
  const observation = {
    expectedAllowance: 0.5,
    deviationFromExpected: 0.1,
  };
  const smallSample = aggregateRawPerformanceEstimate(
    Array.from({ length: 3 }, () => observation),
    0.8
  );
  const largeSample = aggregateRawPerformanceEstimate(
    Array.from({ length: 30 }, () => observation),
    0.8
  );

  assert.ok(smallSample);
  assert.ok(largeSample);
  assert.ok(largeSample.measurementVariance < smallSample.measurementVariance);
});

test("greater score variability decreases reliability", () => {
  const stable = aggregateRawPerformanceEstimate(
    [0.1, 0.1, 0.1, 0.1, 0.1].map((deviationFromExpected) => ({
      expectedAllowance: 0.5,
      deviationFromExpected,
    })),
    0.5
  );
  const volatile = aggregateRawPerformanceEstimate(
    [-1.5, -0.5, 0.1, 0.7, 1.7].map((deviationFromExpected) => ({
      expectedAllowance: 0.5,
      deviationFromExpected,
    })),
    0.5
  );

  assert.ok(stable);
  assert.ok(volatile);
  const stableAdjusted = shrinkPerformanceEstimate(stable, 0.1, 0.3);
  const volatileAdjusted = shrinkPerformanceEstimate(volatile, 0.1, 0.3);
  assert.ok(volatileAdjusted.reliability < stableAdjusted.reliability);
});
