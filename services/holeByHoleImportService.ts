import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { HoleByHoleRound } from "@/utils/holeByHoleParser";
import { updateImportJob } from "@/services/importJobService";

const SOURCE = "GHIN_HBH_PDF";

export type HoleByHoleImportSummary = {
  roundsImported: number;
  roundsExisting: number;
  holesImported: number;
  holesExisting: number;
  playersCreated: number;
  playersUpdated: number;
  invalidRows: number;
};

function splitName(fullName: string | null | undefined) {
  const parts = String(fullName ?? "Unknown").trim().split(/\s+/);

  if (parts.length === 1) {
    return { first_name: parts[0], last_name: "" };
  }

  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().replace(/\s+/g, "").trim();
}

function isTempGhin(value: string | null | undefined) {
  return !value || value.startsWith("TEMP-");
}

function getRoundTotal(round: HoleByHoleRound) {
  return round.holes.reduce((sum, score) => sum + Number(score || 0), 0);
}

function getScoreType(round: HoleByHoleRound) {
  return round.scoreType ?? "";
}

async function findOrCreatePlayer(round: HoleByHoleRound) {
  const supabase = createSupabaseServerClient();
  const name = splitName(round.golferName);

  const { data: ghinMatches, error: ghinError } = await supabase
    .from("players")
    .select("id, full_name, ghin_number")
    .eq("ghin_number", round.ghinNumber)
    .limit(1);

  if (ghinError) throw ghinError;

  const ghinMatch = ghinMatches?.[0];

  if (ghinMatch) {
    const { error } = await supabase
      .from("players")
      .update({
        ...name,
        current_index: round.handicapIndex,
        is_active: true,
      })
      .eq("id", ghinMatch.id);

    if (error) throw error;

    return { id: ghinMatch.id as string, created: false };
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, full_name, ghin_number");

  if (playersError) throw playersError;

  const nameMatch = (players ?? []).find(
    (player) =>
      normalizeName(player.full_name) === normalizeName(round.golferName)
  );

  if (nameMatch && isTempGhin(nameMatch.ghin_number)) {
    const { error } = await supabase
      .from("players")
      .update({
        ...name,
        ghin_number: round.ghinNumber,
        current_index: round.handicapIndex,
        is_active: true,
      })
      .eq("id", nameMatch.id);

    if (error) throw error;

    return { id: nameMatch.id as string, created: false };
  }

  const { data: created, error: createError } = await supabase
    .from("players")
    .insert({
      ...name,
      ghin_number: round.ghinNumber,
      current_index: round.handicapIndex,
      is_active: true,
      sync_enabled: true,
    })
    .select("id")
    .single();

  if (createError) throw createError;

  return { id: created.id as string, created: true };
}

function buildExternalRoundKey(playerId: string, round: HoleByHoleRound) {
  return [
    playerId,
    round.playedAt,
    getScoreType(round),
    round.teeName,
    round.courseRating,
    round.slopeRating,
    getRoundTotal(round),
    round.holes.join("-"),
  ].join("|");
}

async function findExistingRound(params: {
  playerId: string;
  round: HoleByHoleRound;
  externalRoundKey: string;
}) {
  const supabase = createSupabaseServerClient();
  const scoreType = getScoreType(params.round);

  const { data: byKey, error: keyError } = await supabase
    .from("rounds")
    .select("id")
    .eq("external_round_key", params.externalRoundKey)
    .limit(1);

  if (keyError) throw keyError;
  if (byKey?.[0]) return byKey[0];

  let query = supabase
    .from("rounds")
    .select("id")
    .eq("player_id", params.playerId)
    .eq("played_at", params.round.playedAt)
    .eq("gross_score", getRoundTotal(params.round))
    .eq("tee_name", params.round.teeName)
    .eq("source", SOURCE)
    .limit(1);

  if (scoreType) {
    query = query.eq("score_type", scoreType);
  }

  const { data: byNaturalKey, error: naturalError } = await query;

  if (naturalError) throw naturalError;

  return byNaturalKey?.[0] ?? null;
}

async function upsertRound(params: {
  playerId: string;
  round: HoleByHoleRound;
  batchId: string | null;
}) {
  const supabase = createSupabaseServerClient();
  const total = getRoundTotal(params.round);
  const scoreType = getScoreType(params.round);
  const externalRoundKey = buildExternalRoundKey(params.playerId, params.round);

  const existing = await findExistingRound({
    playerId: params.playerId,
    round: params.round,
    externalRoundKey,
  });

  const payload = {
    player_id: params.playerId,
    played_at: params.round.playedAt,
    gross_score: total,
    adjusted_gross_score: total,
    differential: null,
    course_rating: params.round.courseRating,
    slope_rating: params.round.slopeRating,
    score_type: scoreType || null,
    tee_name: params.round.teeName,
    course_name: "Goodrich",
    handicap_index_used: params.round.handicapIndex,
    score_handicap_index: params.round.handicapIndex,
    is_home: scoreType.includes("H"),
    is_away: scoreType.includes("A"),
    is_competition: scoreType.includes("C"),
    ghin_number: params.round.ghinNumber,
    source: SOURCE,
    external_round_key: externalRoundKey,
    import_batch_id: params.batchId,
  };

  if (existing) {
    const { error } = await supabase
      .from("rounds")
      .update(payload)
      .eq("id", existing.id);

    if (error) throw error;

    return {
      id: existing.id as string,
      imported: false,
      existing: true,
    };
  }

  const { data: created, error } = await supabase
    .from("rounds")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;

  return {
    id: created.id as string,
    imported: true,
    existing: false,
  };
}

async function getCourseHoles(teeName: string | null | undefined) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("course_holes")
    .select("hole_number, par, handicap")
    .eq("course_name", "Goodrich")
    .eq("tee_name", teeName ?? "");

  if (error) throw error;

  const map = new Map<number, { par: number | null; handicap: number | null }>();

  for (const row of data ?? []) {
    map.set(Number(row.hole_number), {
      par: row.par == null ? null : Number(row.par),
      handicap: row.handicap == null ? null : Number(row.handicap),
    });
  }

  return map;
}

async function deleteExistingHoleScores(roundId: string) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("hole_scores")
    .delete()
    .eq("round_id", roundId);

  if (error) throw error;
}

async function insertHoleScores(params: {
  roundId: string;
  playerId: string;
  round: HoleByHoleRound;
}) {
  const supabase = createSupabaseServerClient();
  const courseHoles = await getCourseHoles(params.round.teeName);

  const rows = params.round.holes.map((score, index) => {
    const holeNumber = index + 1;
    const courseHole = courseHoles.get(holeNumber);
    const par = courseHole?.par ?? null;

    return {
      round_id: params.roundId,
      player_id: params.playerId,
      hole_number: holeNumber,
      gross_score: Number(score),
      par,
      score_to_par: par == null ? null : Number(score) - par,
      stroke_index: courseHole?.handicap ?? null,
      tee_name: params.round.teeName,
      course_name: "Goodrich",
    };
  });

  const { error } = await supabase.from("hole_scores").insert(rows);

  if (error) throw error;

  return rows.length;
}

async function createImportBatch(params: {
  fileName: string;
  rowsFound: number;
  invalidRows: number;
}) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("import_batches")
    .insert({
      import_type: "hole_by_hole",
      source: SOURCE,
      file_name: params.fileName,
      rows_found: params.rowsFound,
      rows_invalid: params.invalidRows,
    })
    .select("id")
    .limit(1);

  if (error) {
    console.warn("Hole-by-hole import batch could not be created:", error.message);
    return null;
  }

  return data?.[0]?.id as string | null;
}

async function updateImportBatch(params: {
  batchId: string | null;
  roundsImported: number;
  roundsExisting: number;
  holesImported: number;
  holesExisting: number;
  playersCreated: number;
  playersUpdated: number;
}) {
  if (!params.batchId) return;

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("import_batches")
    .update({
      rounds_imported: params.roundsImported,
      rounds_existing: params.roundsExisting,
      holes_imported: params.holesImported,
      holes_existing: params.holesExisting,
      players_created: params.playersCreated,
      players_updated: params.playersUpdated,
    })
    .eq("id", params.batchId);

  if (error) {
    console.warn("Hole-by-hole import batch could not be updated:", error.message);
  }
}

export async function importHoleByHoleRounds(params: {
  fileName: string;
  rounds: HoleByHoleRound[];
  invalidRows: number;
  jobId?: string | null;
}): Promise<HoleByHoleImportSummary> {
  let roundsImported = 0;
  let roundsExisting = 0;
  let holesImported = 0;
  let holesExisting = 0;
  let playersCreated = 0;
  let playersUpdated = 0;

  const batchId = await createImportBatch({
    fileName: params.fileName,
    rowsFound: params.rounds.length,
    invalidRows: params.invalidRows,
  });

  const total = params.rounds.length;

  for (let index = 0; index < total; index++) {
    const round = params.rounds[index];
    const processed = index + 1;

    await updateImportJob(params.jobId, {
      status: "running",
      progress: Math.min(95, 30 + Math.round((processed / total) * 65)),
      stage: `Importing hole-by-hole round ${processed} of ${total}`,
      rowsTotal: total,
      rowsProcessed: processed,
    });

    const player = await findOrCreatePlayer(round);

    if (player.created) playersCreated++;
    else playersUpdated++;

    const roundResult = await upsertRound({
      playerId: player.id,
      round,
      batchId,
    });

    if (roundResult.imported) roundsImported++;
    if (roundResult.existing) roundsExisting++;

    await deleteExistingHoleScores(roundResult.id);

    const insertedHoles = await insertHoleScores({
      roundId: roundResult.id,
      playerId: player.id,
      round,
    });

    holesImported += insertedHoles;
  }

  await updateImportBatch({
    batchId,
    roundsImported,
    roundsExisting,
    holesImported,
    holesExisting,
    playersCreated,
    playersUpdated,
  });

  return {
    roundsImported,
    roundsExisting,
    holesImported,
    holesExisting,
    playersCreated,
    playersUpdated,
    invalidRows: params.invalidRows,
  };
}