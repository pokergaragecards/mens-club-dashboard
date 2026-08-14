import assert from "node:assert/strict";
import test from "node:test";

import {
  CONSERVATIVE_REVIEW_ADJUSTMENT_THRESHOLD,
  conservativeReviewRequiresAdjustment,
} from "../lib/auditDecisionPolicy.ts";

test("Conservative Review HI is the final adjustment test for every golfer", () => {
  assert.equal(CONSERVATIVE_REVIEW_ADJUSTMENT_THRESHOLD, 2);
  assert.equal(
    conservativeReviewRequiresAdjustment({
      currentHi: 14.8,
      conservativeReviewHi: 12.1,
    }),
    true,
    "Ron qualifies from the final 2.7-stroke comparison"
  );
  assert.equal(
    conservativeReviewRequiresAdjustment({
      currentHi: 20.3,
      conservativeReviewHi: 18.3,
    }),
    true,
    "the exact 2.0-stroke boundary qualifies"
  );
  assert.equal(
    conservativeReviewRequiresAdjustment({
      currentHi: 17.4,
      conservativeReviewHi: 15.5,
    }),
    false,
    "a 1.9-stroke comparison does not qualify"
  );
});

test("the final test requires both handicap values", () => {
  assert.equal(
    conservativeReviewRequiresAdjustment({
      currentHi: 12.0,
      conservativeReviewHi: null,
    }),
    false
  );
  assert.equal(
    conservativeReviewRequiresAdjustment({
      currentHi: null,
      conservativeReviewHi: 10.0,
    }),
    false
  );
});
