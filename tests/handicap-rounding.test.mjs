import assert from "node:assert/strict";
import test from "node:test";

import { roundHandicapUpToHalf } from "../lib/handicapRounding.ts";

test("suggested handicaps always round upward to the nearest half stroke", () => {
  assert.equal(roundHandicapUpToHalf(12), 12);
  assert.equal(roundHandicapUpToHalf(12.1), 12.5);
  assert.equal(roundHandicapUpToHalf(12.5), 12.5);
  assert.equal(roundHandicapUpToHalf(12.6), 13);
  assert.equal(roundHandicapUpToHalf(13.01), 13.5);
});
