export type HandicapRound = {
  played_at: string;
  differential: number | null;
};

export type HandicapCalculation = {
  eligibleRounds: number;
  usedRounds: number;
  handicapIndex: number | null;
  bestDifferentials: number[];
  recentDifferentials: number[];
};

function getCountToUse(roundCount: number) {
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

export function calculateHandicapIndex(rounds: HandicapRound[]): HandicapCalculation {
  const recentDifferentials = rounds
    .filter((round) => round.differential !== null && round.differential !== undefined)
    .sort(
      (a, b) =>
        new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    )
    .slice(0, 20)
    .map((round) => Number(round.differential));

  const eligibleRounds = recentDifferentials.length;
  const usedRounds = getCountToUse(eligibleRounds);

  if (usedRounds === 0) {
    return {
      eligibleRounds,
      usedRounds,
      handicapIndex: null,
      bestDifferentials: [],
      recentDifferentials,
    };
  }

  const bestDifferentials = [...recentDifferentials]
    .sort((a, b) => a - b)
    .slice(0, usedRounds);

  const average =
    bestDifferentials.reduce((sum, value) => sum + value, 0) /
    bestDifferentials.length;

  const handicapIndex = Math.round(average * 10) / 10;

  return {
    eligibleRounds,
    usedRounds,
    handicapIndex,
    bestDifferentials,
    recentDifferentials,
  };
}