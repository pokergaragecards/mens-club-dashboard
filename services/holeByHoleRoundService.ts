import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { HoleByHoleRound } from "@/utils/holeByHoleParser";

const COURSE_NAME = "Goodrich";
const IMPORT_SOURCE = "GHIN_HBH_PDF";

const supabase = createSupabaseServerClient();

export interface RoundImportResult {
  imported: boolean;
  skipped: boolean;
  roundId: string | null;
  holesInserted: number;
}

type CourseHole = {
  hole_number: number;
  tee_name: string;
  par: number | null;
  handicap: number | null;
};

function normalizeTee(value: string | null | undefined) {
  return (value ?? "Unknown").trim();
}

function buildRoundSignature(playerId: string, round: HoleByHoleRound) {
  return [
    playerId,
    round.playedAt,
    round.scoreType ?? "",
    normalizeTee(round.teeName),
    round.courseRating ?? "",
    round.slopeRating ?? "",
    round.totalScore ?? "",
    round.holes.join("-"),
  ].join("|");
}

let courseHoleCache: Map<string, CourseHole> | null = null;

async function loadCourseHoles() {
  if (courseHoleCache) return courseHoleCache;

  const { data, error } = await supabase
    .from("course_holes")
    .select("hole_number, tee_name, par, handicap")
    .eq("course_name", COURSE_NAME);

  if (error) throw error;

  const map = new Map<string, CourseHole>();

  for (const hole of data ?? []) {
    map.set(`${normalizeTee(hole.tee_name)}|${hole.hole_number}`, hole);
  }

  courseHoleCache = map;
  return map;
}

async function roundAlreadyExists(playerId: string, signature: string) {
  const { data, error } = await supabase
    .from("rounds")
    .select("id")
    .eq("player_id", playerId)
    .eq("external_round_key", signature)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function createRound(
  playerId: string,
  round: HoleByHoleRound,
  signature: string
) {
  const teeName = normalizeTee(round.teeName);

  const { data, error } = await supabase
    .from("rounds")
    .insert({
      player_id: playerId,
      played_at: round.playedAt,

      course_name: COURSE_NAME,
      tee_name: teeName,
      tee_gender: round.teeGender,

      gross_score: round.totalScore,
      adjusted_gross_score: round.totalScore,
      front9_score: round.outScore,
      back9_score: round.inScore,

      handicap_index_used: round.handicapIndex,
      course_rating: round.courseRating,
      slope_rating: round.slopeRating,

      score_type: round.scoreType,
      is_home: round.scoreType === "H",
      is_away: round.scoreType !== "H",
      is_competition: round.scoreType === "CH",

      source: IMPORT_SOURCE,
      external_round_key: signature,

      course_id: null,
      tee_id: null,
    })
    .select("id")
    .single();

  if (error) throw error;

  return data.id as string;
}

export async function importRound(
  playerId: string,
  round: HoleByHoleRound
): Promise<RoundImportResult> {
  if (!round.holes || round.holes.length !== 18) {
    return {
      imported: false,
      skipped: true,
      roundId: null,
      holesInserted: 0,
    };
  }

  const signature = buildRoundSignature(playerId, round);

  const existing = await roundAlreadyExists(playerId, signature);

  if (existing) {
    return {
      imported: false,
      skipped: true,
      roundId: existing.id,
      holesInserted: 0,
    };
  }

  const roundId = await createRound(playerId, round, signature);
  const courseHoles = await loadCourseHoles();
  const teeName = normalizeTee(round.teeName);

  const holeRows = round.holes.map((grossScore, index) => {
    const holeNumber = index + 1;
    const courseHole = courseHoles.get(`${teeName}|${holeNumber}`) ?? null;

    const par = courseHole?.par ?? null;
    const strokeIndex = courseHole?.handicap ?? null;

    return {
      round_id: roundId,
      player_id: playerId,
      played_at: round.playedAt,

      hole_number: holeNumber,
      par,
      stroke_index: strokeIndex,
      gross_score: grossScore,
      score_to_par: par == null ? null : grossScore - par,

      score_type: round.scoreType,
      tee_name: teeName,
      tee_gender: round.teeGender,
      course_rating: round.courseRating,
      slope_rating: round.slopeRating,

      source: IMPORT_SOURCE,
      round_signature: signature,
      external_hole_key: `${signature}|${holeNumber}`,

      net_score: null,
      putts: null,
      fairway_hit: null,
      green_in_regulation: null,
      sand_save: null,
      penalty_strokes: null,
    };
  });

  const { error: holeError } = await supabase
    .from("hole_scores")
    .insert(holeRows);

  if (holeError) {
    await supabase.from("rounds").delete().eq("id", roundId);
    throw holeError;
  }

  return {
    imported: true,
    skipped: false,
    roundId,
    holesInserted: holeRows.length,
  };
}