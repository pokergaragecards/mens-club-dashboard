import assert from "node:assert/strict";
import test from "node:test";

import { parseHoleByHoleText } from "../utils/holeByHoleParser.ts";
import { parseScoresPostedText } from "../utils/scoresPostedParser.ts";

const holes = [4, 4, 4, 5, 4, 3, 4, 3, 4, 35, 5, 4, 3, 4, 4, 5, 3, 3, 4, 35, 70];

test("Scores Posted does not treat slope ratings as GHIN numbers", () => {
  const text = [
    "117 26.8 23.8 3.0 COURSE 2180313 Dan Munson Active 4.8 1",
    "H 7/28/2024 80 70.1 117 7.4 4.8 2.6 Goodrich Golf Course",
    "129 8.0 Keller Golf Club 2180209 Robert Casura Active 6.5 10",
    "H 7/22/2024 82 70.1 129 8.9 6.5 2.4 Keller Golf Club",
  ].join(" ");

  const result = parseScoresPostedText(text);

  assert.deepEqual(
    result.validRounds.map((round) => [round.ghinNumber, round.golferName]),
    [
      ["2180313", "Dan Munson"],
      ["2180209", "Robert Casura"],
    ]
  );
});

test("Hole-by-hole import skips a slope-rating boundary and finds the real golfer", () => {
  const text = [
    "117 Course 2180313 Dan Munson 7/28/2024 4.8 10 H Blue Male 70.1 117",
    holes.join(" "),
  ].join(" ");

  const result = parseHoleByHoleText(text);

  assert.equal(result.validRounds.length, 1);
  assert.equal(result.validRounds[0].ghinNumber, "2180313");
  assert.equal(result.validRounds[0].golferName, "Dan Munson");
});
