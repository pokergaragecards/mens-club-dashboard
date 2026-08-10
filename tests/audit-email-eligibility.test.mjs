import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowPrepareEmail } from "../lib/auditEmailEligibility.ts";

test("Prepare Email is limited to decisions that apply an adjustment now", () => {
  assert.equal(
    shouldShowPrepareEmail({
      code: "adjustment_supported",
      suggestedIndex: 18,
    }),
    true
  );
  assert.equal(
    shouldShowPrepareEmail({
      code: "provisional_adjustment",
      suggestedIndex: 22,
    }),
    true
  );

  for (const code of [
    "monitor",
    "no_adjustment",
    "no_action",
    "manual_review",
  ]) {
    assert.equal(
      shouldShowPrepareEmail({ code, suggestedIndex: null }),
      false,
      code
    );
  }
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
