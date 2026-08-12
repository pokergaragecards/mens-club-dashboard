export type TeamEventScoring = "net" | "gross";

export type TeamEventTeamSelection = {
  id: string;
  name: string;
  playerIds: string[];
};

export type TeamEventEstimateRequest = {
  tee: "Red" | "Gold" | "White" | "Blue";
  scoring: TeamEventScoring;
  handicapAllowance: number;
  teams: TeamEventTeamSelection[];
};

export type TeamEventPlayerOption = {
  id: string;
  fullName: string;
  currentHandicapIndex: number;
};

export type TeamEventHoleProfile = {
  holeNumber: number;
  par: number;
  strokeIndex: number;
  expectedGross: number;
  standardDeviation: number;
  sampleCount: number;
};

export type TeamEventPlayerProfile = {
  id: string;
  name: string;
  currentHandicapIndex: number;
  courseHandicap: number;
  holes: TeamEventHoleProfile[];
};

export type TeamEventTeamProfile = {
  id: string;
  name: string;
  players: TeamEventPlayerProfile[];
};

export type TeamEventSimulationOptions = {
  scoring: TeamEventScoring;
  handicapAllowance: number;
  simulations: number;
  seed: number;
  teePar: number;
};

export type TeamEventPlayerSummary = {
  id: string;
  name: string;
  currentHandicapIndex: number;
  playingHandicap: number;
  historicalHoles: number;
};

export type TeamEventTeamResult = {
  rank: number;
  teamId: string;
  teamName: string;
  winProbability: number;
  topThreeProbability: number;
  estimatedScore: number;
  estimatedToPar: number;
  likelyLowScore: number;
  likelyHighScore: number;
  players: TeamEventPlayerSummary[];
};

export type TeamEventSimulationResult = {
  simulations: number;
  scoring: TeamEventScoring;
  handicapAllowance: number;
  teamPar: number;
  teams: TeamEventTeamResult[];
};

export type TeamEventEstimateResponse = TeamEventSimulationResult & {
  tee: TeamEventEstimateRequest["tee"];
  teePar: number;
  courseRating: number;
  slopeRating: number;
  periodStart: string;
  periodEnd: string;
  methodology: string;
};

function roundNearest(value: number) {
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
}

export function calculateCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  teePar: number
) {
  return roundNearest(
    handicapIndex * (slopeRating / 113) + (courseRating - teePar)
  );
}

export function playingHandicap(
  courseHandicap: number,
  handicapAllowance: number
) {
  return roundNearest(courseHandicap * handicapAllowance);
}

export function strokesReceivedOnHole(
  playingCourseHandicap: number,
  strokeIndex: number
) {
  const boundedStrokeIndex = Math.min(18, Math.max(1, Math.trunc(strokeIndex)));
  if (playingCourseHandicap === 0) return 0;

  const absoluteHandicap = Math.abs(playingCourseHandicap);
  const fullCycles = Math.floor(absoluteHandicap / 18);
  const remainder = absoluteHandicap % 18;

  if (playingCourseHandicap > 0) {
    return fullCycles + (boundedStrokeIndex <= remainder ? 1 : 0);
  }

  // Plus players give strokes back beginning with stroke index 18, then 17, etc.
  const returnedStrokes =
    fullCycles + (boundedStrokeIndex > 18 - remainder ? 1 : 0);
  return returnedStrokes ? -returnedStrokes : 0;
}

export function bestThreeBallTotal(scores: number[]) {
  if (scores.length !== 4) {
    throw new Error("A best-three-of-four team must contain exactly four scores.");
  }
  return [...scores]
    .sort((a, b) => a - b)
    .slice(0, 3)
    .reduce((sum, score) => sum + score, 0);
}

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function normal(random: () => number) {
  const first = Math.max(Number.EPSILON, random());
  const second = random();
  return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
}

function quantile(sorted: number[], fraction: number) {
  if (!sorted.length) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((sorted.length - 1) * fraction))
  );
  return sorted[index];
}

function boundedGrossScore(value: number, par: number) {
  return Math.min(par + 8, Math.max(1, roundNearest(value)));
}

function roundDayStandardDeviation(handicapIndex: number) {
  return 0.16 + Math.min(0.24, Math.max(0, handicapIndex) * 0.006);
}

function validateTeams(teams: TeamEventTeamProfile[]) {
  if (teams.length < 2) throw new Error("At least two teams are required.");

  const playerIds = new Set<string>();
  for (const team of teams) {
    if (team.players.length !== 4) {
      throw new Error(`${team.name} must contain exactly four players.`);
    }
    for (const player of team.players) {
      if (playerIds.has(player.id)) {
        throw new Error(`${player.name} appears on more than one team.`);
      }
      playerIds.add(player.id);
      if (player.holes.length !== 18) {
        throw new Error(`${player.name} does not have an 18-hole profile.`);
      }
    }
  }
}

export function simulateBestThreeOfFour(
  teams: TeamEventTeamProfile[],
  options: TeamEventSimulationOptions
): TeamEventSimulationResult {
  validateTeams(teams);
  const simulations = Math.min(50_000, Math.max(1_000, options.simulations));
  const random = createRandom(options.seed);
  const totals = teams.map(() => [] as number[]);
  const winCredits = teams.map(() => 0);
  const topThreeCounts = teams.map(() => 0);
  const playerDayEffects = new Map<string, number>();

  for (let simulation = 0; simulation < simulations; simulation += 1) {
    playerDayEffects.clear();
    for (const team of teams) {
      for (const player of team.players) {
        playerDayEffects.set(
          player.id,
          normal(random) * roundDayStandardDeviation(player.currentHandicapIndex)
        );
      }
    }

    const simulationTotals = teams.map((team) => {
      const playerHandicaps = team.players.map((player) =>
        playingHandicap(player.courseHandicap, options.handicapAllowance)
      );
      let total = 0;

      for (let holeIndex = 0; holeIndex < 18; holeIndex += 1) {
        const balls = team.players.map((player, playerIndex) => {
          const hole = player.holes[holeIndex];
          const gross = boundedGrossScore(
            hole.expectedGross +
              (playerDayEffects.get(player.id) ?? 0) +
              normal(random) * hole.standardDeviation,
            hole.par
          );
          if (options.scoring === "gross") return gross;
          return (
            gross -
            strokesReceivedOnHole(
              playerHandicaps[playerIndex],
              hole.strokeIndex
            )
          );
        });
        total += bestThreeBallTotal(balls);
      }

      return total;
    });

    simulationTotals.forEach((score, teamIndex) => totals[teamIndex].push(score));
    const winningScore = Math.min(...simulationTotals);
    const winners = simulationTotals
      .map((score, teamIndex) => ({ score, teamIndex }))
      .filter(({ score }) => score === winningScore);
    for (const winner of winners) {
      winCredits[winner.teamIndex] += 1 / winners.length;
    }

    const thirdPlaceScore = [...simulationTotals].sort((a, b) => a - b)[
      Math.min(2, simulationTotals.length - 1)
    ];
    simulationTotals.forEach((score, teamIndex) => {
      if (score <= thirdPlaceScore) topThreeCounts[teamIndex] += 1;
    });
  }

  const teamPar = options.teePar * 3;
  const results = teams.map<TeamEventTeamResult>((team, teamIndex) => {
    const sortedScores = [...totals[teamIndex]].sort((a, b) => a - b);
    const averageScore =
      sortedScores.reduce((sum, score) => sum + score, 0) / sortedScores.length;

    return {
      rank: 0,
      teamId: team.id,
      teamName: team.name,
      winProbability: winCredits[teamIndex] / simulations,
      topThreeProbability: topThreeCounts[teamIndex] / simulations,
      estimatedScore: Math.round(averageScore * 10) / 10,
      estimatedToPar: Math.round((averageScore - teamPar) * 10) / 10,
      likelyLowScore: quantile(sortedScores, 0.1),
      likelyHighScore: quantile(sortedScores, 0.9),
      players: team.players.map((player) => ({
        id: player.id,
        name: player.name,
        currentHandicapIndex: player.currentHandicapIndex,
        playingHandicap: playingHandicap(
          player.courseHandicap,
          options.handicapAllowance
        ),
        historicalHoles: player.holes.filter((hole) => hole.sampleCount >= 3)
          .length,
      })),
    };
  });

  results.sort(
    (a, b) =>
      b.winProbability - a.winProbability ||
      a.estimatedScore - b.estimatedScore ||
      a.teamName.localeCompare(b.teamName)
  );
  results.forEach((team, index) => {
    team.rank = index + 1;
  });

  return {
    simulations,
    scoring: options.scoring,
    handicapAllowance: options.handicapAllowance,
    teamPar,
    teams: results,
  };
}
