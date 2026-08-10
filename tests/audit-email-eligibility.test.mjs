import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowPrepareEmail } from "../lib/auditEmailEligibility.ts";

test("Prepare Email appears for every audit with a suggested index", () => {
  assert.equal(
    shouldShowPrepareEmail({
      code: "adjustment_supported",
      suggestedIndex: 18,
    }),
    true
  );
  assert.equal(
    shouldShowPrepareEmail({
      code: "manual_review",
      suggestedIndex: 13,
    }),
    true
  );

  for (const code of ["monitor", "no_adjustment", "no_action"]) {
    assert.equal(
      shouldShowPrepareEmail({ code, suggestedIndex: null }),
      false,
      code
    );
  }
});

test("Prepare Email rejects non-finite suggestions", () => {
  assert.equal(
    shouldShowPrepareEmail({
      code: "adjustment_supported",
      suggestedIndex: Number.NaN,
    }),
    false
  );
});

test("Prepare Email stays hidden when an adjustment has no suggested index", () => {
  assert.equal(
    shouldShowPrepareEmail({
      code: "adjustment_supported",
      suggestedIndex: null,
    }),
    false
  );
});
