import {
  expectedHoleScoreFromTeeRating,
  expectedRoundScoreFromHandicapIndex,
} from "@/lib/holeRankingMath";
import {
  calculateCourseHandicap,
  simulateBestThreeOfFour,
  type TeamEventEstimateRequest,
  type TeamEventEstimateResponse,
  type TeamEventPlayerSelection,
  type TeamEventPlayerOption,
  type TeamEventPlayerProfile,
  type TeamEventTeamProfile,
} from "@/lib/teamEventEstimator";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  GOODRICH_TEE_COLORS,
  getGoodrichHoleRankingReport,
  type GoodrichTeeColor,
} from "@/services/holeRankingService";

type PlayerRow = {
  id: string;
  full_name: string;
  current_index: number | string | null;
};

type CompetitionSummaryRow = {
  player_id: string;
  last20_competition_hi: number | string | null;
};

const SIMULATIONS = 20_000;
const MINIMUM_STANDARD_DEVIATION = 0.65;
const MAXIMUM_STANDARD_DEVIATION = 1.9;

export class TeamEventRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamEventRequestError";
  }
}

function invalidRequest(message: string): never {
  throw new TeamEventRequestError(message);
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hashSeed(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function validatedRequest(input: unknown): TeamEventEstimateRequest {
  if (!input || typeof input !== "object") {
    invalidRequest("The estimator request is missing.");
  }
  const request = input as Partial<TeamEventEstimateRequest>;
  if (request.scoring !== "net" && request.scoring !== "gross") {
    invalidRequest("Select Net or Gross scoring.");
  }
  if (
    !Number.isFinite(request.handicapAllowance) ||
    Number(request.handicapAllowance) < 0 ||
    Number(request.handicapAllowance) > 1
  ) {
    invalidRequest("Handicap allowance must be between 0% and 100%.");
  }
  if (!Array.isArray(request.teams) || request.teams.length < 2) {
    invalidRequest("Build at least two teams before calculating.");
  }
  if (request.teams.length > 20) {
    invalidRequest("The estimator supports up to 20 teams at a time.");
  }

  const allPlayerIds = new Set<string>();
  const teams = request.teams.map((team, index) => {
    const name = String(team?.name ?? "").trim() || `Team ${index + 1}`;
    const selections = Array.isArray(team?.players) ? team.players : [];
    if (selections.length !== 4) {
      invalidRequest(`${name} must have four selected players.`);
    }
    const teamPlayers = selections.map<TeamEventPlayerSelection>((selection) => {
      const playerId = String(selection?.playerId ?? "").trim();
      const tee = String(selection?.tee ?? "") as GoodrichTeeColor;
      if (!playerId) invalidRequest(`${name} must have four selected players.`);
      if (!GOODRICH_TEE_COLORS.includes(tee)) {
        invalidRequest(`Select a valid Goodrich tee for every player on ${name}.`);
      }
      return { playerId, tee };
    });
    if (new Set(teamPlayers.map((player) => player.playerId)).size !== 4) {
      invalidRequest(`${name} contains the same player more than once.`);
    }
    for (const { playerId } of teamPlayers) {
      if (allPlayerIds.has(playerId)) {
        invalidRequest("A player cannot appear on more than one team.");
      }
      allPlayerIds.add(playerId);
    }
    return {
      id: String(team?.id ?? `team-${index + 1}`).slice(0, 80),
      name: name.slice(0, 80),
      players: teamPlayers,
    };
  });

  return {
    scoring: request.scoring,
    handicapAllowance: Number(request.handicapAllowance),
    teams,
  };
}

export async function getTeamEventPlayerOptions() {
  const supabase = createSupabaseServerClient();
  const [playerResult, competitionResult] = await Promise.all([
    supabase
      .from("players")
      .select("id, full_name, current_index")
      .eq("is_active", true)
      .not("current_index", "is", null)
      .order("full_name"),
    supabase
      .from("player_handicap_summary")
      .select("player_id, last20_competition_hi"),
  ]);

  if (playerResult.error) {
    throw new Error(`Unable to load active players: ${playerResult.error.message}`);
  }
  if (competitionResult.error) {
    throw new Error(
      `Unable to load Competition HIs: ${competitionResult.error.message}`
    );
  }
  const competitionByPlayer = new Map(
    ((competitionResult.data ?? []) as CompetitionSummaryRow[]).map((row) => [
      row.player_id,
      finiteNumber(row.last20_competition_hi),
    ])
  );

  return ((playerResult.data ?? []) as PlayerRow[])
    .map<TeamEventPlayerOption | null>((player) => {
      const currentHandicapIndex = finiteNumber(player.current_index);
      const competitionHandicapIndex =
        competitionByPlayer.get(player.id) ?? null;
      if (
        currentHandicapIndex === null ||
        competitionHandicapIndex === null
      ) {
        return null;
      }
      return {
        id: player.id,
        fullName: player.full_name,
        currentHandicapIndex,
        competitionHandicapIndex,
      };
    })
    .filter((player): player is TeamEventPlayerOption => player !== null);
}

export async function estimateTeamEvent(
  input: unknown
): Promise<TeamEventEstimateResponse> {
  const request = validatedRequest(input);
  const [players, report] = await Promise.all([
    getTeamEventPlayerOptions(),
    getGoodrichHoleRankingReport(),
  ]);
  const playerById = new Map(players.map((player) => [player.id, player]));
  const selectedTeeColors = new Set(
    request.teams.flatMap((team) => team.players.map((player) => player.tee))
  );
  const tees = report.tees.filter((tee) => selectedTeeColors.has(tee.tee));
  const teeByColor = new Map(tees.map((tee) => [tee.tee, tee]));

  for (const teeColor of selectedTeeColors) {
    const tee = teeByColor.get(teeColor);
    if (
      !tee ||
      tee.teePar === null ||
      tee.courseRating === null ||
      tee.slopeRating === null
    ) {
      throw new Error(`Goodrich ${teeColor} tee information is incomplete.`);
    }
    if (tee.holes.length !== 18) {
      throw new Error(`Goodrich ${teeColor} tee does not have all 18 holes.`);
    }
  }

  const referenceTee = tees[0];
  if (!referenceTee || referenceTee.teePar === null) {
    throw new Error("No complete Goodrich tee was selected.");
  }
  const referencePars = [...referenceTee.holes]
    .sort((a, b) => a.holeNumber - b.holeNumber)
    .map((hole) => hole.par ?? 4);
  for (const tee of tees) {
    const pars = [...tee.holes]
      .sort((a, b) => a.holeNumber - b.holeNumber)
      .map((hole) => hole.par ?? 4);
    if (pars.some((par, index) => par !== referencePars[index])) {
      throw new Error("The selected Goodrich tees do not share the same hole pars.");
    }
  }

  const buildPlayerProfile = (
    selection: TeamEventPlayerSelection
  ): TeamEventPlayerProfile => {
    const { playerId, tee: teeColor } = selection;
    const player = playerById.get(playerId);
    if (!player) {
      invalidRequest(
        "A selected player is inactive or does not have an established Competition HI."
      );
    }
    const tee = teeByColor.get(teeColor)!;
    const courseHandicap = calculateCourseHandicap(
      player.currentHandicapIndex,
      tee.slopeRating!,
      tee.courseRating!,
      tee.teePar!
    );
    const targetCompetitionScore = expectedRoundScoreFromHandicapIndex(
      player.competitionHandicapIndex,
      tee.courseRating!,
      tee.slopeRating!
    );
    if (targetCompetitionScore === null) {
      throw new Error(`Unable to calculate ${player.fullName}'s expectation.`);
    }
    const holes = [...tee.holes]
      .sort((a, b) => a.holeNumber - b.holeNumber)
      .map((hole) => {
        const par = hole.par ?? 4;
        const baseline = expectedHoleScoreFromTeeRating(
          par,
          tee.teePar!,
          player.competitionHandicapIndex,
          tee.courseRating!,
          tee.slopeRating!
        );
        if (baseline === null) {
          throw new Error(`Unable to calculate ${player.fullName}'s expectation.`);
        }
        const historical = hole.players.find(
          (candidate) => candidate.playerId === player.id
        );
        const sampleCount = historical?.scoreCount ?? 0;
        const historyWeight = sampleCount >= 3 ? sampleCount / (sampleCount + 6) : 0;
        const expectedGross = historical
          ? baseline + historyWeight * (historical.averageGrossScore - baseline)
          : baseline;
        const clubSigma = finiteNumber(hole.robustScoringSigma) ?? 1;
        const handicapVarianceFactor =
          1 +
          Math.min(
            0.25,
            Math.max(0, player.competitionHandicapIndex) / 100
          );

        return {
          holeNumber: hole.holeNumber,
          par,
          strokeIndex: hole.strokeIndex ?? hole.holeNumber,
          expectedGross,
          standardDeviation: Math.min(
            MAXIMUM_STANDARD_DEVIATION,
            Math.max(
              MINIMUM_STANDARD_DEVIATION,
              clubSigma * handicapVarianceFactor
            )
          ),
          sampleCount,
        };
      });
    const uncenteredTotal = holes.reduce(
      (sum, hole) => sum + hole.expectedGross,
      0
    );
    const totalCorrection = targetCompetitionScore - uncenteredTotal;
    const centeredHoles = holes.map((hole) => ({
      ...hole,
      expectedGross:
        hole.expectedGross + totalCorrection * (hole.par / tee.teePar!),
    }));

    return {
      id: player.id,
      name: player.fullName,
      tee: teeColor,
      currentHandicapIndex: player.currentHandicapIndex,
      competitionHandicapIndex: player.competitionHandicapIndex,
      courseHandicap,
      holes: centeredHoles,
    };
  };

  const teams = request.teams.map<TeamEventTeamProfile>((team) => ({
    id: team.id,
    name: team.name,
    players: team.players.map(buildPlayerProfile),
  }));
  const seed = hashSeed(JSON.stringify(request));
  const simulation = simulateBestThreeOfFour(teams, {
    scoring: request.scoring,
    handicapAllowance: request.handicapAllowance,
    simulations: SIMULATIONS,
    seed,
    teamPar: referenceTee.teePar * 3,
  });

  return {
    ...simulation,
    tees: GOODRICH_TEE_COLORS.filter((teeColor) =>
      selectedTeeColors.has(teeColor)
    ).map((teeColor) => {
      const tee = teeByColor.get(teeColor)!;
      return {
        tee: teeColor,
        teePar: tee.teePar!,
        courseRating: tee.courseRating!,
        slopeRating: tee.slopeRating!,
      };
    }),
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    methodology:
      "Each simulation creates 18 hole scores for every player. On each hole, the highest of the team's four balls is discarded and the three lowest balls are added to the team's running stroke-play total. Last 20 Competition HI establishes how the player is expected to score from the selected tee, while Current HI is converted through that tee's rating and slope to determine the player's event Course Handicap and net strokes. Qualifying Goodrich scores from the latest 12 months on that same tee identify relative hole-by-hole strengths and weaknesses; limited samples are shrunk, and all 18 hole expectations are re-centered so their total remains anchored to Competition HI. Teams are ranked by their final 18-hole best-three total, and tied wins split the win credit. Shared round-level form and hole-level scoring variation are both simulated.",
  };
}
