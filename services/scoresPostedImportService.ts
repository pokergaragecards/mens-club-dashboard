import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { ScoresPostedRound } from "@/utils/scoresPostedParser";

const SOURCE = "SCORES_POSTED_REPORT";
const HBH_SOURCE = "GHIN_HBH_PDF";

export type ScoresPostedImportSummary = {
  roundsImported: number;
  roundsExisting: number;
  goodrichRoundsUpdated: number;
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

function normalizeName(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").trim();
}

function isTempGhin(value: string | null | undefined) {
  return !value || value.startsWith("TEMP-");
}

function isGoodrichCourse(courseName: string | null | undefined) {
  return String(courseName ?? "").toLowerCase().includes("goodrich");
}

async function findOrCreatePlayer(round: ScoresPostedRound) {
  const supabase = createSupabaseServerClient();
  const name = splitName(round.golferName);

  const { data: ghinMatch, error: ghinError } = await supabase
    .from("players")
    .select("id, full_name, ghin_number")
    .eq("ghin_number", round.ghinNumber)
    .maybeSingle();

  if (ghinError) throw ghinError;

  if (ghinMatch) {
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
      .eq("id", ghinMatch.id);

    if (error) throw error;

    return {
      id: ghinMatch.id as string,
      created: false,
    };
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, full_name, ghin_number");

  if (playersError) throw playersError;

  const nameMatch = (players ?? []).find(
    (player) => normalizeName(player.full_name ?? "") === normalizeName(round.golferName)
  );

  if (nameMatch && isTempGhin(nameMatch.ghin_number)) {
    const { error } = await supabase
      .from("players")
      .update({
        ...name,
        ghin_number: round.ghinNumber,
        current_index: round.handicapIndex,
        golfer_status: round.golferStatus,
        last_round_count: round.roundCount,
        last_scores_posted_import: new Date().toISOString(),
        is_active: round.golferStatus === "Active",
      })
      .eq("id", nameMatch.id);

    if (error) throw error;

    return {
      id: nameMatch.id as string,
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

async function findExistingScoresPostedRound(externalKey: string) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("rounds")
    .select("id")
    .eq("external_round_key", externalKey)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function findMatchingGoodrichHbhRound(params: {
  playerId: string;
  playedAt: string;
  grossScore: number | null;
  scoreType: string | null;
}) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("rounds")
    .select("id")
    .eq("player_id", params.playerId)
    .eq("played_at", params.playedAt)
    .eq("source", HBH_SOURCE);

  if (params.grossScore == null) {
    query = query.is("gross_score", null);
  } else {
    query = query.eq("gross_score", params.grossScore);
  }

  if (params.scoreType) {
    query = query.eq("score_type", params.scoreType);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;

  return data;
}

async function updateGoodrichHbhRound(params: {
  hbhRoundId: string;
  round: ScoresPostedRound;
  batchId: string | null;
}) {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("rounds")
    .update({
      adjusted_gross_score: params.round.adjustedGrossScore,
      gross_score: params.round.adjustedGrossScore,
      differential: params.round.differential,
      course_rating: params.round.courseRating,
      slope_rating: params.round.slopeRating,
      pcc: params.round.pcc,
      score_type: params.round.scoreType,
      score_handicap_index: params.round.scoreHandicapIndex,
      net_score_differential: params.round.netScoreDifferential,
      handicap_index_used: params.round.scoreHandicapIndex,
      ghin_number: params.round.ghinNumber,
      golfer_status: params.round.golferStatus,
      round_count: params.round.roundCount,
      import_batch_id: params.batchId,
    })
    .eq("id", params.hbhRoundId);

  if (error) throw error;
}

async function insertOrUpdateScoresPostedRound(params: {
  playerId: string;
  round: ScoresPostedRound;
  batchId: string | null;
}) {
  const supabase = createSupabaseServerClient();

  const existing = await findExistingScoresPostedRound(params.round.externalKey);

  if (existing) {
    const { error } = await supabase
      .from("rounds")
      .update({
        adjusted_gross_score: params.round.adjustedGrossScore,
        gross_score: params.round.adjustedGrossScore,
        differential: params.round.differential,
        course_rating: params.round.courseRating,
        slope_rating: params.round.slopeRating,
        pcc: params.round.pcc,
        score_type: params.round.scoreType,
        course_name: params.round.courseName,
        score_handicap_index: params.round.scoreHandicapIndex,
        net_score_differential: params.round.netScoreDifferential,
        handicap_index_used: params.round.scoreHandicapIndex,
        ghin_number: params.round.ghinNumber,
        golfer_status: params.round.golferStatus,
        round_count: params.round.roundCount,
        source: SOURCE,
        import_batch_id: params.batchId,
      })
      .eq("id", existing.id);

    if (error) throw error;

    return {
      imported: false,
      existing: true,
    };
  }

  const { error } = await supabase.from("rounds").insert({
    player_id: params.playerId,
    played_at: params.round.playedAt,
    posted_at: null,

    gross_score: params.round.adjustedGrossScore,
    adjusted_gross_score: params.round.adjustedGrossScore,
    differential: params.round.differential,

    course_rating: params.round.courseRating,
    slope_rating: params.round.slopeRating,
    pcc: params.round.pcc,

    score_type: params.round.scoreType,
    course_name: params.round.courseName,
    score_handicap_index: params.round.scoreHandicapIndex,
    net_score_differential: params.round.netScoreDifferential,
    handicap_index_used: params.round.scoreHandicapIndex,

    is_home: params.round.scoreType.includes("H"),
    is_away: params.round.scoreType.includes("A"),
    is_competition: params.round.scoreType.includes("C"),

    ghin_number: params.round.ghinNumber,
    golfer_status: params.round.golferStatus,
    round_count: params.round.roundCount,

    source: SOURCE,
    external_round_key: params.round.externalKey,
    import_batch_id: params.batchId,
  });

  if (error) throw error;

  return {
    imported: true,
    existing: false,
  };
}

async function importRound(params: {
  playerId: string;
  round: ScoresPostedRound;
  batchId: string | null;
}) {
  if (isGoodrichCourse(params.round.courseName)) {
    const hbhRound = await findMatchingGoodrichHbhRound({
      playerId: params.playerId,
      playedAt: params.round.playedAt,
      grossScore: params.round.adjustedGrossScore,
      scoreType: params.round.scoreType,
    });

    if (hbhRound) {
      await updateGoodrichHbhRound({
        hbhRoundId: hbhRound.id,
        round: params.round,
        batchId: params.batchId,
      });

      return {
        imported: false,
        existing: true,
        goodrichUpdated: true,
      };
    }
  }

  const result = await insertOrUpdateScoresPostedRound(params);

  return {
    ...result,
    goodrichUpdated: false,
  };
}

async function createImportBatch(params: {
  fileName: string;
  rowsFound: number;
  rowsInvalid: number;
}) {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("score_import_batches")
    .insert({
      import_type: "scores_posted",
      source: SOURCE,
      file_name: params.fileName,
      rows_found: params.rowsFound,
      rows_invalid: params.rowsInvalid,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("Score import batch could not be created:", error.message);
    return null;
  }

  return data.id as string;
}

async function updateImportBatch(params: {
  batchId: string | null;
  roundsImported: number;
  roundsExisting: number;
  goodrichRoundsUpdated: number;
  playersCreated: number;
  playersUpdated: number;
}) {
  if (!params.batchId) return;

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("score_import_batches")
    .update({
      rounds_imported: params.roundsImported,
      rounds_existing: params.roundsExisting,
      players_created: params.playersCreated,
      players_updated: params.playersUpdated,
    })
    .eq("id", params.batchId);

  if (error) {
    console.warn("Score import batch could not be updated:", error.message);
  }
}

export async function importScoresPostedReport(params: {
  fileName: string;
  rounds: ScoresPostedRound[];
  rowsInvalid: number;
}): Promise<ScoresPostedImportSummary> {
  let roundsImported = 0;
  let roundsExisting = 0;
  let goodrichRoundsUpdated = 0;
  let playersCreated = 0;
  let playersUpdated = 0;

  const batchId = await createImportBatch({
    fileName: params.fileName,
    rowsFound: params.rounds.length,
    rowsInvalid: params.rowsInvalid,
  });

  for (const round of params.rounds) {
    const player = await findOrCreatePlayer(round);

    if (player.created) playersCreated++;
    else playersUpdated++;

    const result = await importRound({
      playerId: player.id,
      round,
      batchId,
    });

    if (result.imported) roundsImported++;
    if (result.existing) roundsExisting++;
    if (result.goodrichUpdated) goodrichRoundsUpdated++;
  }

  await updateImportBatch({
    batchId,
    roundsImported,
    roundsExisting,
    goodrichRoundsUpdated,
    playersCreated,
    playersUpdated,
  });

  return {
    roundsImported,
    roundsExisting,
    goodrichRoundsUpdated,
    playersCreated,
    playersUpdated,
    rowsInvalid: params.rowsInvalid,
  };
}