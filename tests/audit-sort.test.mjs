import assert from "node:assert/strict";
import test from "node:test";

import { compareAuditRowsByStrokeDiscrepancy } from "../lib/auditSort.ts";

test("audit rows sort from highest Stroke Discrepancy to lowest", () => {
  const rows = [
    { full_name: "No Evidence", competitionVsOverallGap: null },
    { full_name: "Two Strokes", competitionVsOverallGap: 2 },
    { full_name: "Largest Gap", competitionVsOverallGap: 5.4 },
    { full_name: "Negative Gap", competitionVsOverallGap: -1.2 },
  ].sort(compareAuditRowsByStrokeDiscrepancy);

  assert.deepEqual(
    rows.map((row) => row.full_name),
    ["Largest Gap", "Two Strokes", "Negative Gap", "No Evidence"]
  );
});

test("equal discrepancies sort by player name", () => {
  const rows = [
    { full_name: "Zach", competitionVsOverallGap: 2 },
    { full_name: "Aaron", competitionVsOverallGap: 2 },
  ].sort(compareAuditRowsByStrokeDiscrepancy);

  assert.deepEqual(
    rows.map((row) => row.full_name),
    ["Aaron", "Zach"]
  );
});
