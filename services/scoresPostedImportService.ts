import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { ScoresPostedRound } from "@/utils/scoresPostedParser";
import { updateImportJob } from "@/services/importJobService";

const SOURCE = "SCORES_POSTED_REPORT";
const HBH_SOURCE = "GHIN_HBH_PDF";

export type ScoresPostedImportSummary = {
  roundsImported: number;
  roundsExisting: number;
  goodrichRoundsUpdated: number;
  playersCreated: number;
  playersUpdated: number;
  rowsFailed: number;
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

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
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
    (player) => normalizeName(player.full_name) === normalizeName(round.golferName)
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

  const { data: createdRows, error: createError } = await supabase
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
    .limit(1);

  if (createError) throw createError;

  const created = createdRows?.[0];
  if (!created) throw new Error("Player insert returned no rows.");

  return { id: created.id as string, created: true };
}

async function findExistingScoresPostedRound(params: {
  playerId: string;
  round: ScoresPostedRound;
}) {
  const supabase = createSupabaseServerClient();

  const { data: byKey, error: keyError } = await supabase
    .from("rounds")
    .select("id")
    .eq("external_round_key", params.round.externalKey)
    .limit(1);

  if (keyError) throw keyError;
  if (byKey?.[0]) return byKey[0];

  const { data: natural, error: naturalError } = await supabase
    .from("rounds")
    .select("id")
    .eq("player_id", params.playerId)
    .eq("played_at", params.round.playedAt)
    .eq("source", SOURCE)
    .eq("score_type", params.round.scoreType || "")
    .eq("adjusted_gross_score", params.round.adjustedGrossScore)
    .eq("differential", params.round.differential)
    .limit(1);

  if (naturalError) throw naturalError;
  return natural?.[0] ?? null;
}

async function findMatchingGoodrichHbhRound(params: {
  playerId: string;
  playedAt: string;
  grossScore: number | null;
}) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("rounds")
    .select(`
      id,
      adjusted_gross_score,
      differential,
      course_rating,
      slope_rating,
      pcc,
      score_type,
      score_handicap_index,
      net_score_differential,
      handicap_index_used,
      ghin_number,
      golfer_status,
      round_count
    `)
    .eq("player_id", params.playerId)
    .eq("played_at", params.playedAt)
    .eq("source", HBH_SOURCE)
    .limit(1);

  if (params.grossScore == null) {
    query = query.is("gross_score", null);
  } else {
    query = query.eq("gross_score", params.grossScore);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data?.[0] ?? null;
}

async function updateGoodrichHbhRound(params: {
  hbhRound: {
    id: string;
    adjusted_gross_score: number | null;
    differential: number | null;
    course_rating: number | null;
    slope_rating: number | null;
    pcc: number | null;
    score_type: string | null;
    score_handicap_index: number | null;
    net_score_differential: number | null;
    handicap_index_used: number | null;
    ghin_number: string | null;
    golfer_status: string | null;
    round_count: number | null;
  };
  round: ScoresPostedRound;
  batchId: string | null;
}) {
  const supabase = createSupabaseServerClient();
  const existing = params.hbhRound;
  const payload = {
    adjusted_gross_score:
      existing.adjusted_gross_score ?? params.round.adjustedGrossScore,
    differential: existing.differential ?? params.round.differential,
    course_rating: existing.course_rating ?? params.round.courseRating,
    slope_rating: existing.slope_rating ?? params.round.slopeRating,
    pcc: existing.pcc ?? params.round.pcc,
    score_type: existing.score_type || params.round.scoreType,
    score_handicap_index:
      existing.score_handicap_index ?? params.round.scoreHandicapIndex,
    net_score_differential:
      existing.net_score_differential ?? params.round.netScoreDifferential,
    handicap_index_used:
      existing.handicap_index_used ?? params.round.scoreHandicapIndex,
    ghin_number: existing.ghin_number || params.round.ghinNumber,
    golfer_status: existing.golfer_status || params.round.golferStatus,
    round_count: existing.round_count ?? params.round.roundCount,
    import_batch_id: params.batchId,
  };

  const { error } = await supabase
    .from("rounds")
    .update(payload)
    .eq("id", existing.id);

  if (error) throw error;

  const { error: holeError } = await supabase
    .from("hole_scores")
    .update({
      differential: payload.differential,
      handicap_index_used: payload.handicap_index_used,
    })
    .eq("round_id", existing.id);

  if (holeError) throw holeError;
}

async function insertOrUpdateScoresPostedRound(params: {
  playerId: string;
  round: ScoresPostedRound;
  batchId: string | null;
}) {
  const supabase = createSupabaseServerClient();

  const existing = await findExistingScoresPostedRound({
    playerId: params.playerId,
    round: params.round,
  });

  const payload = {
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
  };

  if (existing) {
    const { error } = await supabase
      .from("rounds")
      .update(payload)
      .eq("id", existing.id);

    if (error) throw error;

    return {
      imported: false,
      existing: true,
    };
  }

  const { error } = await supabase.from("rounds").insert(payload);

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
    });

    if (hbhRound) {
      await updateGoodrichHbhRound({
        hbhRound,
        round: params.round,
        batchId: params.batchId,
      });
    }

    const result = await insertOrUpdateScoresPostedRound(params);
    return { ...result, goodrichUpdated: Boolean(hbhRound) };
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
    .limit(1);

  if (error) {
    console.warn("Score import batch could not be created:", error.message);
    return null;
  }

  return data?.[0]?.id as string | null;
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
      goodrich_rounds_updated: params.goodrichRoundsUpdated,
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
  jobId?: string | null;
}): Promise<ScoresPostedImportSummary> {
  let roundsImported = 0;
  let roundsExisting = 0;
  let goodrichRoundsUpdated = 0;
  let playersCreated = 0;
  let playersUpdated = 0;
  let rowsFailed = 0;

  const batchId = await createImportBatch({
    fileName: params.fileName,
    rowsFound: params.rounds.length,
    rowsInvalid: params.rowsInvalid,
  });

  const total = params.rounds.length;

  for (let index = 0; index < total; index++) {
    const round = params.rounds[index];
    const processed = index + 1;

    await updateImportJob(params.jobId, {
      status: "running",
      progress: Math.min(95, 30 + Math.round((processed / total) * 65)),
      stage: `Importing Scores Posted round ${processed} of ${total}`,
      rowsTotal: total,
      rowsProcessed: processed,
    });

    try {
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
    } catch (error) {
      rowsFailed++;
      console.error(
        `Scores Posted row ${processed} failed for ${round.golferName} ${round.playedAt}:`,
        error
      );
    }
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
    rowsFailed,
    rowsInvalid: params.rowsInvalid,
  };
}
