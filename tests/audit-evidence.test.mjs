import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAuditEvidence,
  calculateHandicapIndex,
  isCompetitionScoreType,
  selectConservativeReviewHi,
} from "../lib/auditEvidence.ts";

test("nine-hole competition round types count as competition", () => {
  assert.equal(isCompetitionScoreType("NCH"), true);
  assert.equal(isCompetitionScoreType("NCA"), true);
  assert.equal(isCompetitionScoreType("NH"), false);
  assert.equal(isCompetitionScoreType("NA"), false);
});

function rounds({
  count,
  startDiff,
  scoreType = "C",
  courseName = "Goodrich Golf Course",
  idPrefix,
}) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${idPrefix}-${index}`,
    played_at: `2026-${String(7 - Math.floor(index / 28)).padStart(2, "0")}-${String(
      28 - (index % 28)
    ).padStart(2, "0")}`,
    differential: startDiff + index,
    score_type: scoreType,
    course_name: courseName,
  }));
}

test("uses 24-month Goodrich competition HI when at least 10 rounds exist", () => {
  const evidence = buildAuditEvidence(
    [
      ...rounds({ count: 10, startDiff: 10, idPrefix: "gc" }),
      ...rounds({
        count: 5,
        startDiff: 2,
        courseName: "Away Club",
        idPrefix: "away",
      }),
    ],
    "2024-08-10"
  );

  assert.equal(evidence.basis, "goodrich_competition");
  assert.equal(evidence.goodrichCompetitionRounds, 10);
  assert.equal(evidence.allCompetitionRounds, 15);
  assert.equal(
    evidence.committeeEvidenceHi,
    evidence.goodrichCompetitionHi
  );
});

test("falls back to all-course competition HI when total reaches 10", () => {
  const evidence = buildAuditEvidence(
    [
      ...rounds({ count: 5, startDiff: 10, idPrefix: "gc" }),
      ...rounds({
        count: 5,
        startDiff: 15,
        courseName: "Away Club",
        idPrefix: "away",
      }),
    ],
    "2024-08-10"
  );

  assert.equal(evidence.basis, "all_competition");
  assert.equal(evidence.goodrichCompetitionRounds, 5);
  assert.equal(evidence.allCompetitionRounds, 10);
  assert.equal(evidence.committeeEvidenceHi, evidence.allCompetitionHi);
});

test("blends 3-9 competition rounds with last-10 Goodrich general play", () => {
  const competition = rounds({
    count: 7,
    startDiff: 10,
    idPrefix: "comp",
  });
  const general = rounds({
    count: 12,
    startDiff: 20,
    scoreType: "H",
    idPrefix: "general",
  });
  const evidence = buildAuditEvidence(
    [...competition, ...general],
    "2024-08-10"
  );

  assert.equal(calculateHandicapIndex(competition), 10.5);
  assert.equal(evidence.goodrichGeneralRounds, 10);
  assert.equal(evidence.goodrichGeneralHi, 21);
  assert.equal(evidence.basis, "blended_competition_general");
  assert.equal(evidence.competitionWeight, 0.7);
  assert.equal(evidence.generalWeight, 0.3);
  assert.equal(evidence.committeeEvidenceHi, 13.7);
  assert.match(evidence.formula, /70% All Competition HI/);
});

test("uses Goodrich general play for monitoring only below three competition rounds", () => {
  const evidence = buildAuditEvidence(
    [
      ...rounds({ count: 2, startDiff: 5, idPrefix: "comp" }),
      ...rounds({
        count: 5,
        startDiff: 15,
        scoreType: "H",
        idPrefix: "general",
      }),
    ],
    "2024-08-10"
  );

  assert.equal(evidence.allCompetitionHi, null);
  assert.equal(evidence.basis, "goodrich_general_monitor");
  assert.equal(evidence.committeeEvidenceHi, evidence.goodrichGeneralHi);
  assert.match(evidence.formula, /cannot support a competition adjustment/);
});

test("excludes rounds older than the two-year cutoff", () => {
  const oldRounds = rounds({ count: 10, startDiff: 1, idPrefix: "old" }).map(
    (round) => ({ ...round, played_at: "2024-08-09" })
  );
  const evidence = buildAuditEvidence(oldRounds, "2024-08-10");

  assert.equal(evidence.allCompetitionRounds, 0);
  assert.equal(evidence.committeeEvidenceHi, null);
  assert.equal(evidence.basis, "unavailable");
});

test("uses the higher HI as benefit of the doubt below 10 Goodrich competition rounds", () => {
  const last20Wins = selectConservativeReviewHi({
    goodrichCompetitionRounds: 9,
    last20CompetitionHi: 16.2,
    committeeEvidenceHi: 13.7,
  });
  assert.equal(last20Wins.index, 16.2);
  assert.equal(last20Wins.usedBenefitOfDoubt, true);
  assert.match(last20Wins.basisLabel, /Last 20 Competition HI/);

  const evidenceWins = selectConservativeReviewHi({
    goodrichCompetitionRounds: 4,
    last20CompetitionHi: 12.1,
    committeeEvidenceHi: 14.4,
  });
  assert.equal(evidenceWins.index, 14.4);
  assert.match(evidenceWins.basisLabel, /Two-Year Committee Evidence HI/);
});

test("uses two-year evidence directly at 10 Goodrich competition rounds", () => {
  const selection = selectConservativeReviewHi({
    goodrichCompetitionRounds: 10,
    last20CompetitionHi: 18.1,
    committeeEvidenceHi: 14.2,
  });

  assert.equal(selection.index, 14.2);
  assert.equal(selection.usedBenefitOfDoubt, false);
});
