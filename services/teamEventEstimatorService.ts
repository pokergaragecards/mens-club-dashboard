import { expectedHoleScoreFromTeeRating } from "@/lib/holeRankingMath";
import {
  calculateCourseHandicap,
  simulateBestThreeOfFour,
  type TeamEventEstimateRequest,
  type TeamEventEstimateResponse,
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
  if (!GOODRICH_TEE_COLORS.includes(request.tee as GoodrichTeeColor)) {
    invalidRequest("Select a valid Goodrich tee.");
  }
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
  if (request.teams.length > 16) {
    invalidRequest("The estimator supports up to 16 teams at a time.");
  }

  const allPlayerIds = new Set<string>();
  const teams = request.teams.map((team, index) => {
    const name = String(team?.name ?? "").trim() || `Team ${index + 1}`;
    const playerIds = Array.isArray(team?.playerIds)
      ? team.playerIds.map((id) => String(id ?? "").trim())
      : [];
    if (playerIds.length !== 4 || playerIds.some((id) => !id)) {
      invalidRequest(`${name} must have four selected players.`);
    }
    if (new Set(playerIds).size !== 4) {
      invalidRequest(`${name} contains the same player more than once.`);
    }
    for (const playerId of playerIds) {
      if (allPlayerIds.has(playerId)) {
        invalidRequest("A player cannot appear on more than one team.");
      }
      allPlayerIds.add(playerId);
    }
    return {
      id: String(team?.id ?? `team-${index + 1}`).slice(0, 80),
      name: name.slice(0, 80),
      playerIds,
    };
  });

  return {
    tee: request.tee as GoodrichTeeColor,
    scoring: request.scoring,
    handicapAllowance: Number(request.handicapAllowance),
    teams,
  };
}

export async function getTeamEventPlayerOptions() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, full_name, current_index")
    .eq("is_active", true)
    .not("current_index", "is", null)
    .order("full_name");

  if (error) {
    throw new Error(`Unable to load active players: ${error.message}`);
  }

  return ((data ?? []) as PlayerRow[])
    .map<TeamEventPlayerOption | null>((player) => {
      const currentHandicapIndex = finiteNumber(player.current_index);
      if (currentHandicapIndex === null) return null;
      return {
        id: player.id,
        fullName: player.full_name,
        currentHandicapIndex,
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
  const tee = report.tees.find((candidate) => candidate.tee === request.tee);

  if (
    !tee ||
    tee.teePar === null ||
    tee.courseRating === null ||
    tee.slopeRating === null
  ) {
    throw new Error(`Goodrich ${request.tee} tee information is incomplete.`);
  }
  if (tee.holes.length !== 18) {
    throw new Error(`Goodrich ${request.tee} tee does not have all 18 holes.`);
  }

  const buildPlayerProfile = (playerId: string): TeamEventPlayerProfile => {
    const player = playerById.get(playerId);
    if (!player) {
      invalidRequest("A selected player is inactive or has no Current HI.");
    }
    const courseHandicap = calculateCourseHandicap(
      player.currentHandicapIndex,
      tee.slopeRating!,
      tee.courseRating!,
      tee.teePar!
    );

    return {
      id: player.id,
      name: player.fullName,
      currentHandicapIndex: player.currentHandicapIndex,
      courseHandicap,
      holes: [...tee.holes]
        .sort((a, b) => a.holeNumber - b.holeNumber)
        .map((hole) => {
          const par = hole.par ?? 4;
          const baseline = expectedHoleScoreFromTeeRating(
            par,
            tee.teePar!,
            player.currentHandicapIndex,
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
            ? baseline +
              historyWeight * (historical.averageGrossScore - baseline)
            : baseline;
          const clubSigma = finiteNumber(hole.robustScoringSigma) ?? 1;
          const handicapVarianceFactor =
            1 + Math.min(0.25, Math.max(0, player.currentHandicapIndex) / 100);

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
        }),
    };
  };

  const teams = request.teams.map<TeamEventTeamProfile>((team) => ({
    id: team.id,
    name: team.name,
    players: team.playerIds.map(buildPlayerProfile),
  }));
  const seed = hashSeed(JSON.stringify(request));
  const simulation = simulateBestThreeOfFour(teams, {
    scoring: request.scoring,
    handicapAllowance: request.handicapAllowance,
    simulations: SIMULATIONS,
    seed,
    teePar: tee.teePar,
  });

  return {
    ...simulation,
    tee: request.tee,
    teePar: tee.teePar,
    courseRating: tee.courseRating,
    slopeRating: tee.slopeRating,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    methodology:
      "Each simulation creates 18 hole scores for every player, keeps each team's three lowest balls per hole, and ranks the resulting team totals. Current HI establishes the tee-adjusted baseline. A player's qualifying Goodrich scores from the latest 12 months pull that baseline toward the player's actual hole average; limited samples are shrunk toward the handicap expectation. Shared round-level form and hole-level scoring variation are both simulated. Tied wins split the win credit.",
  };
}
