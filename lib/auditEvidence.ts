export const COMPETITION_SCORE_TYPES = ["C", "CH", "CA", "ECH"] as const;

export type AuditEvidenceRound = {
  id: string;
  played_at: string;
  differential: number | string | null;
  score_type: string | null;
  course_name: string | null;
};

export type AuditEvidenceBasis =
  | "goodrich_competition"
  | "all_competition"
  | "blended_competition_general"
  | "limited_competition"
  | "goodrich_general_monitor"
  | "unavailable";

export type HandicapIndexDetails = {
  index: number | null;
  selected: AuditEvidenceRound[];
  used: AuditEvidenceRound[];
};

export type AuditEvidence = {
  cutoffDate: string;
  goodrichCompetitionHi: number | null;
  goodrichCompetitionRounds: number;
  allCompetitionHi: number | null;
  allCompetitionRounds: number;
  goodrichGeneralHi: number | null;
  goodrichGeneralRounds: number;
  committeeEvidenceHi: number | null;
  basis: AuditEvidenceBasis;
  basisLabel: string;
  formula: string;
  competitionWeight: number | null;
  generalWeight: number | null;
  competitionHiForComparison: number | null;
  sensitivity: number | null;
};

export type ConservativeReviewSelection = {
  index: number | null;
  basisLabel: string;
  usedBenefitOfDoubt: boolean;
};

function byMostRecent(a: AuditEvidenceRound, b: AuditEvidenceRound) {
  const dateDifference =
    new Date(b.played_at).getTime() - new Date(a.played_at).getTime();
  return dateDifference || b.id.localeCompare(a.id);
}

function roundToTenth(value: number) {
  return Math.round((value + 1e-9) * 10) / 10;
}

export function isCompetitionScoreType(
  scoreType: string | null | undefined
) {
  return COMPETITION_SCORE_TYPES.includes(
    (scoreType ?? "") as (typeof COMPETITION_SCORE_TYPES)[number]
  );
}

export function isGoodrichCourse(
  courseName: string | null | undefined
) {
  return /\bgoodrich\b/i.test(courseName ?? "");
}

export function whsUsedDifferentialCount(roundCount: number) {
  if (roundCount < 3) return 0;
  if (roundCount <= 5) return 1;
  if (roundCount <= 8) return 2;
  if (roundCount <= 11) return 3;
  if (roundCount <= 14) return 4;
  if (roundCount <= 16) return 5;
  if (roundCount <= 18) return 6;
  if (roundCount === 19) return 7;
  return 8;
}

export function fewerThan20Adjustment(roundCount: number) {
  if (roundCount === 3) return -2;
  if (roundCount === 4 || roundCount === 6) return -1;
  return 0;
}

export function calculateHandicapIndexDetails(
  rounds: AuditEvidenceRound[],
  maximumRounds = 20
): HandicapIndexDetails {
  const selected = [...rounds]
    .filter((round) => Number.isFinite(Number(round.differential)))
    .sort(byMostRecent)
    .slice(0, maximumRounds);
  const usedCount = whsUsedDifferentialCount(selected.length);

  if (!usedCount) {
    return { index: null, selected, used: [] };
  }

  const used = [...selected]
    .sort(
      (a, b) => Number(a.differential) - Number(b.differential)
    )
    .slice(0, usedCount);
  const average =
    used.reduce((sum, round) => sum + Number(round.differential), 0) /
    used.length;
  const index = roundToTenth(
    average + fewerThan20Adjustment(selected.length)
  );

  return { index, selected, used };
}

export function calculateHandicapIndex(
  rounds: AuditEvidenceRound[],
  maximumRounds = 20
) {
  return calculateHandicapIndexDetails(rounds, maximumRounds).index;
}

export function selectConservativeReviewHi(params: {
  goodrichCompetitionRounds: number;
  last20CompetitionHi: number | null;
  committeeEvidenceHi: number | null;
}): ConservativeReviewSelection {
  const {
    goodrichCompetitionRounds,
    last20CompetitionHi,
    committeeEvidenceHi,
  } = params;

  if (goodrichCompetitionRounds >= 10) {
    return {
      index: committeeEvidenceHi,
      basisLabel: "Two-Year Committee Evidence HI",
      usedBenefitOfDoubt: false,
    };
  }

  if (last20CompetitionHi == null) {
    return {
      index: committeeEvidenceHi,
      basisLabel: "Two-Year Committee Evidence HI (Last 20 unavailable)",
      usedBenefitOfDoubt: true,
    };
  }

  if (committeeEvidenceHi == null) {
    return {
      index: last20CompetitionHi,
      basisLabel: "Last 20 Competition HI (two-year evidence unavailable)",
      usedBenefitOfDoubt: true,
    };
  }

  const useLast20 = last20CompetitionHi >= committeeEvidenceHi;
  return {
    index: useLast20 ? last20CompetitionHi : committeeEvidenceHi,
    basisLabel: useLast20
      ? "Higher value: Last 20 Competition HI"
      : "Higher value: Two-Year Committee Evidence HI",
    usedBenefitOfDoubt: true,
  };
}

function withoutLowestSensitivity(rounds: AuditEvidenceRound[]) {
  const details = calculateHandicapIndexDetails(rounds);
  if (details.index == null || !details.selected.length) return null;

  const lowest = [...details.selected].sort(
    (a, b) => Number(a.differential) - Number(b.differential)
  )[0];
  const withoutLowest = calculateHandicapIndex(
    rounds.filter((round) => round.id !== lowest.id)
  );

  return withoutLowest == null
    ? null
    : Number((withoutLowest - details.index).toFixed(1));
}

export function buildAuditEvidence(
  rounds: AuditEvidenceRound[],
  cutoffDate: string
): AuditEvidence {
  const eligible = rounds.filter(
    (round) =>
      round.played_at >= cutoffDate &&
      Number.isFinite(Number(round.differential))
  );
  const allCompetition = eligible.filter((round) =>
    isCompetitionScoreType(round.score_type)
  );
  const goodrichCompetition = allCompetition.filter((round) =>
    isGoodrichCourse(round.course_name)
  );
  const goodrichGeneral = eligible
    .filter(
      (round) =>
        !isCompetitionScoreType(round.score_type) &&
        isGoodrichCourse(round.course_name)
    )
    .sort(byMostRecent)
    .slice(0, 10);

  const goodrichCompetitionHi = calculateHandicapIndex(
    goodrichCompetition
  );
  const allCompetitionHi = calculateHandicapIndex(allCompetition);
  const goodrichGeneralHi = calculateHandicapIndex(goodrichGeneral, 10);
  const goodrichCompetitionRounds = goodrichCompetition.length;
  const allCompetitionRounds = allCompetition.length;
  const goodrichGeneralRounds = goodrichGeneral.length;

  let committeeEvidenceHi: number | null = null;
  let basis: AuditEvidenceBasis = "unavailable";
  let basisLabel = "Not established";
  let formula =
    "No two-year evidence group has the three scores required to calculate a Handicap Index.";
  let competitionWeight: number | null = null;
  let generalWeight: number | null = null;
  let competitionHiForComparison: number | null = allCompetitionHi;
  let sensitivityRounds = allCompetition;

  if (
    goodrichCompetitionRounds >= 10 &&
    goodrichCompetitionHi != null
  ) {
    committeeEvidenceHi = goodrichCompetitionHi;
    basis = "goodrich_competition";
    basisLabel = "24-month Goodrich Competition HI";
    formula =
      "At least 10 Goodrich competition rounds are available, so the Goodrich-only competition HI is used directly.";
    competitionWeight = 1;
    generalWeight = 0;
    competitionHiForComparison = goodrichCompetitionHi;
    sensitivityRounds = goodrichCompetition;
  } else if (allCompetitionRounds >= 10 && allCompetitionHi != null) {
    committeeEvidenceHi = allCompetitionHi;
    basis = "all_competition";
    basisLabel = "24-month All Competition HI";
    formula =
      "Goodrich has fewer than 10 competition rounds, but at least 10 total competition rounds are available, so the all-course competition HI is used directly.";
    competitionWeight = 1;
    generalWeight = 0;
  } else if (allCompetitionRounds >= 3 && allCompetitionHi != null) {
    if (goodrichGeneralHi != null) {
      competitionWeight = allCompetitionRounds / 10;
      generalWeight = Number((1 - competitionWeight).toFixed(1));
      committeeEvidenceHi = roundToTenth(
        allCompetitionHi * competitionWeight +
          goodrichGeneralHi * generalWeight
      );
      basis = "blended_competition_general";
      basisLabel = "Blended 24-month Evidence HI";
      formula = `${Math.round(
        competitionWeight * 100
      )}% All Competition HI + ${Math.round(
        generalWeight * 100
      )}% Last-10 Goodrich General HI`;
    } else {
      committeeEvidenceHi = allCompetitionHi;
      basis = "limited_competition";
      basisLabel = "Limited 24-month Competition HI";
      formula =
        "Only 3-9 competition rounds are available and a Goodrich general-play HI could not be established, so the competition HI is shown for manual review only.";
      competitionWeight = 1;
      generalWeight = 0;
    }
  } else if (goodrichGeneralHi != null) {
    committeeEvidenceHi = goodrichGeneralHi;
    basis = "goodrich_general_monitor";
    basisLabel = "Goodrich General-Play Monitor HI";
    formula =
      "Fewer than three competition rounds are available. The last-10 Goodrich general-play HI is context for monitoring only and cannot support a competition adjustment.";
    competitionWeight = 0;
    generalWeight = 1;
  }

  return {
    cutoffDate,
    goodrichCompetitionHi,
    goodrichCompetitionRounds,
    allCompetitionHi,
    allCompetitionRounds,
    goodrichGeneralHi,
    goodrichGeneralRounds,
    committeeEvidenceHi,
    basis,
    basisLabel,
    formula,
    competitionWeight,
    generalWeight,
    competitionHiForComparison,
    sensitivity: withoutLowestSensitivity(sensitivityRounds),
  };
}
