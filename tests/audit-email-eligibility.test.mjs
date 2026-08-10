import assert from "node:assert/strict";
import test from "node:test";

import { shouldShowPrepareEmail } from "../lib/auditEmailEligibility.ts";

test("Prepare Email appears only when the rules produce an adjustment", () => {
  for (const code of ["adjustment_supported", "provisional_adjustment"]) {
    assert.equal(
      shouldShowPrepareEmail({ code, suggestedIndex: 12.5 }),
      true,
      code
    );
  }

  for (const code of [
    "manual_review",
    "monitor",
    "no_adjustment",
    "no_action",
  ]) {
    assert.equal(
      shouldShowPrepareEmail({ code, suggestedIndex: 12.5 }),
      false,
      code
    );
  }
});

test("Prepare Email requires a finite suggested index", () => {
  assert.equal(
    shouldShowPrepareEmail({
      code: "adjustment_supported",
      suggestedIndex: null,
    }),
    false
  );
  assert.equal(
    shouldShowPrepareEmail({
      code: "adjustment_supported",
      suggestedIndex: Number.NaN,
    }),
    false
  );
});
