import assert from "node:assert/strict";
import test from "node:test";

import {
  bestThreeBallTotal,
  calculateCourseHandicap,
  simulateBestThreeOfFour,
  strokesReceivedOnHole,
} from "../lib/teamEventEstimator.ts";

test("best three ball drops the highest of four scores", () => {
  assert.equal(bestThreeBallTotal([5, 4, 7, 3]), 12);
});

test("course handicap includes slope and rating-minus-par", () => {
  assert.equal(calculateCourseHandicap(17, 125, 71, 70), 20);
  assert.equal(calculateCourseHandicap(-3, 125, 71, 70), -2);
});

test("positive and plus handicaps allocate strokes by hole index", () => {
  assert.equal(strokesReceivedOnHole(20, 1), 2);
  assert.equal(strokesReceivedOnHole(20, 3), 1);
  assert.equal(strokesReceivedOnHole(-2, 18), -1);
  assert.equal(strokesReceivedOnHole(-2, 17), -1);
  assert.equal(strokesReceivedOnHole(-2, 1), 0);
});

function player(id, expectedGross, tee = "White") {
  return {
    id,
    name: id,
    tee,
    currentHandicapIndex: 10,
    competitionHandicapIndex: 10,
    courseHandicap: 10,
    holes: Array.from({ length: 18 }, (_, index) => ({
      holeNumber: index + 1,
      par: 4,
      strokeIndex: index + 1,
      expectedGross,
      standardDeviation: 0.55,
      sampleCount: 5,
    })),
  };
}

test("simulation is deterministic and ranks the stronger team first", () => {
  const teams = [
    {
      id: "strong",
      name: "Strong Team",
      players: [
        player("s1", 4.2, "Gold"),
        ...[2, 3, 4].map((number) => player(`s${number}`, 4.2)),
      ],
    },
    {
      id: "weak",
      name: "Weak Team",
      players: [1, 2, 3, 4].map((number) => player(`w${number}`, 5.2)),
    },
  ];
  const options = {
    scoring: "gross",
    handicapAllowance: 1,
    simulations: 2_000,
    seed: 12345,
    teamPar: 216,
  };

  const first = simulateBestThreeOfFour(teams, options);
  const second = simulateBestThreeOfFour(teams, options);

  assert.deepEqual(first, second);
  assert.equal(first.teams[0].teamId, "strong");
  assert.equal(first.teams[0].players[0].tee, "Gold");
  assert.equal(first.teams[0].players[0].courseHandicap, 10);
  assert.ok(first.teams[0].winProbability > first.teams[1].winProbability);
  assert.ok(
    Math.abs(
      first.teams.reduce((sum, team) => sum + team.winProbability, 0) - 1
    ) < 1e-9
  );
});
