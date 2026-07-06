import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { ScoresPostedRound } from "@/utils/scoresPostedParser";

const SOURCE = "SCORES_POSTED_REPORT";

export type ScoresPostedImportSummary = {
  roundsImported: number;
  roundsExisting: number;
  playersCreated: number;
  playersUpdated: number;
  rowsInvalid: number;
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 1) {
    return {
      first_name: parts[0],
      last_name: "",
    };
  }

  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  };
}

async function findOrCreatePlayer(round: ScoresPostedRound) {
  const supabase = createSupabaseServerClient();

  const { data: existing, error: existingError } = await supabase
    .from("players")
    .select("id")
    .eq("ghin_number", round.ghinNumber)
    .maybeSingle();

  if (existingError) throw existingError;

  const name = splitName(round.golferName);

  if (existing) {
    const { error } = await supabase
      .from("players")
      .update({
        ...name,
        current_index: round.handicapIndex,
        golfer_status: round.golferStatus,
        last_round_count: round.roundCount,
        last_scores_posted_import: new Date().toISOString(),
        is_active: round.golferStatus === "Active",
      })
      .eq("id", existing.id);

    if (error) throw error;

    return {
      id: existing.id as string,
      created: false,
    };
  }

  const { data: created, error: createError } = await supabase
    .from("players")
    .insert({
      ...name,
      ghin_number: round.ghinNumber,
      current_index: round.handicapIndex,
      golfer_status: round.golferStatus,
      last_round_count: round.roundCount,
      last_scores_posted_import: new Date().toISOString(),
      is_active: round.golferStatus === "Active",
      sync_enabled: true,
    })
    .select("id")
    .single();

  if (createError) throw createError;

  return {
    id: created.id as string,
    created: true,
  };
}

async function roundExists(externalKey: string) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("rounds")
    .select("id")
    .eq("external_round_key", externalKey)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function importRound(
  playerId: string,
  round: ScoresPostedRound,
  batchId: string
) {
  const supabase = createSupabaseServerClient();

  const existing = await roundExists(round.externalKey);

  if (existing) {
    const { error } = await supabase
      .from("rounds")
      .update({
        adjusted_gross_score: round.adjustedGrossScore,
        gross_score: round.adjustedGrossScore,
        differential: round.differential,
        course_rating: round.courseRating,
        slope_rating: round.slopeRating,
        pcc: round.pcc,
        score_type: round.scoreType,
        course_name: round.courseName,
        score_handicap_index: round.scoreHandicapIndex,
        net_score_differential: round.netScoreDifferential,
        handicap_index_used: round.scoreHandicapIndex,
        ghin_number: round.ghinNumber,
        golfer_status: round.golferStatus,
        round_count: round.roundCount,
        source: SOURCE,
        import_batch_id: batchId,
      })
      .eq("id", existing.id);

    if (error) throw error;

    return {
      imported: false,
      existing: true,
    };
  }

  const { error } = await supabase.from("rounds").insert({
    player_id: playerId,
    played_at: round.playedAt,
    posted_at: null,

    gross_score: round.adjustedGrossScore,
    adjusted_gross_score: round.adjustedGrossScore,
    differential: round.differential,

    course_rating: round.courseRating,
    slope_rating: round.slopeRating,
    pcc: round.pcc,

    score_type: round.scoreType,
    course_name: round.courseName,
    score_handicap_index: round.scoreHandicapIndex,
    net_score_differential: round.netScoreDifferential,
    handicap_index_used: round.scoreHandicapIndex,

    is_home: round.scoreType.includes("H"),
    is_away: round.scoreType.includes("A"),
    is_competition: round.scoreType.includes("C"),

    ghin_number: round.ghinNumber,
    golfer_status: round.golferStatus,
    round_count: round.roundCount,

    source: SOURCE,
    external_round_key: round.externalKey,
    import_batch_id: batchId,
  });

  if (error) throw error;

  return {
    imported: true,
    existing: false,
  };
}

export async function importScoresPostedReport(params: {
  fileName: string;
  rounds: ScoresPostedRound[];
  rowsInvalid: number;
}): Promise<ScoresPostedImportSummary> {
  const supabase = createSupabaseServerClient();

  let roundsImported = 0;
  let roundsExisting = 0;
  let playersCreated = 0;
  let playersUpdated = 0;

  const { data: batch, error: batchError } = await supabase
    .from("score_import_batches")
    .insert({
      import_type: "scores_posted",
      source: SOURCE,
      file_name: params.fileName,
      rows_found: params.rounds.length,
      rows_invalid: params.rowsInvalid,
    })
    .select("id")
    .single();

  if (batchError) throw batchError;

  for (const round of params.rounds) {
    const player = await findOrCreatePlayer(round);

    if (player.created) playersCreated++;
    else playersUpdated++;

    const result = await importRound(player.id, round, batch.id);

    if (result.imported) roundsImported++;
    if (result.existing) roundsExisting++;
  }

  const { error: updateBatchError } = await supabase
    .from("score_import_batches")
    .update({
      rounds_imported: roundsImported,
      rounds_existing: roundsExisting,
      players_created: playersCreated,
      players_updated: playersUpdated,
    })
    .eq("id", batch.id);

  if (updateBatchError) throw updateBatchError;

  return {
    roundsImported,
    roundsExisting,
    playersCreated,
    playersUpdated,
    rowsInvalid: params.rowsInvalid,
  };
}