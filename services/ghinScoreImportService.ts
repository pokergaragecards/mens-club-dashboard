import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { NormalizedGhinRound } from "@/utils/ghinParser";

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);

  return {
    first_name: parts[0] ?? "Unknown",
    last_name: parts.slice(1).join(" ") || "Unknown",
  };
}

export async function previewGhinImport(
  playerName: string,
  rounds: NormalizedGhinRound[]
) {
  const supabase = createSupabaseServerClient();
  const nameParts = splitName(playerName);

  let { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, full_name, ghin_number")
    .ilike("first_name", nameParts.first_name)
    .ilike("last_name", nameParts.last_name)
    .maybeSingle();

  if (playerError) throw new Error(playerError.message);

  if (!player) {
    const { data: newPlayer, error: createError } = await supabase
      .from("players")
      .insert({
        ghin_number: `TEMP-${crypto.randomUUID()}`,
        first_name: nameParts.first_name,
        last_name: nameParts.last_name,
        is_active: true,
      })
      .select("id, full_name, ghin_number")
      .single();

    if (createError || !newPlayer) {
      throw new Error(createError?.message ?? `Could not create ${playerName}`);
    }

    player = newPlayer;
  }

  const uniqueRounds = Array.from(
    new Map(rounds.map((round) => [round.importKey, round])).values()
  );

  const { data: existingRounds, error } = await supabase
    .from("rounds")
    .select("external_round_key")
    .eq("player_id", player.id);

  if (error) {
    throw new Error(error.message || "Could not check existing rounds.");
  }

  const existingSet = new Set(
    existingRounds?.map((round) => round.external_round_key) ?? []
  );

  const newRounds = uniqueRounds.filter(
    (round) => !existingSet.has(`${player.id}|${round.importKey}`)
  );

  return {
    player,
    rowsValid: rounds.length,
    rowsDeduped: uniqueRounds.length,
    rowsNew: newRounds.length,
    rowsExisting: uniqueRounds.length - newRounds.length,
    rowsDuplicateInFile: rounds.length - uniqueRounds.length,
    newRounds,
  };
}

export async function importGhinRounds(params: {
  playerName: string;
  fileName: string;
  rounds: NormalizedGhinRound[];
}) {
  const supabase = createSupabaseServerClient();
  const preview = await previewGhinImport(params.playerName, params.rounds);

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      source: "GHIN",
      file_name: params.fileName,
      player_id: preview.player.id,
      rows_imported: 0,
      rows_skipped: preview.rowsExisting + preview.rowsDuplicateInFile,
    })
    .select("id")
    .single();

  if (batchError) throw new Error(batchError.message);

  const rowsToInsert = preview.newRounds.map((round) => ({
    player_id: preview.player.id,
    score_type: round.scoreType,
    played_at: round.playedAt,
    posted_at: round.postedAt,
    gross_score: round.adjustedGrossScore,
    adjusted_gross_score: round.adjustedGrossScore,
    course_rating: round.courseRating,
    slope_rating: round.slopeRating,
    pcc: round.pcc,
    differential: round.differential,
    esr: round.esr,
    is_home: round.scoreType === "H",
    is_away: round.scoreType === "A",
    is_competition: round.scoreType?.includes("C") ?? false,
    source: "GHIN",
    external_round_key: `${preview.player.id}|${round.importKey}`,
    notes: `${round.courseName ?? ""} - ${round.teeName ?? ""}`,
  }));

  const uniqueRowsToInsert = Array.from(
    new Map(rowsToInsert.map((row) => [row.external_round_key, row])).values()
  );

  if (uniqueRowsToInsert.length > 0) {
    const { error: upsertError } = await supabase
      .from("rounds")
      .upsert(uniqueRowsToInsert, {
        onConflict: "external_round_key",
        ignoreDuplicates: true,
      });

    if (upsertError) throw new Error(upsertError.message);
  }

  const rowsSkipped =
    preview.rowsExisting +
    preview.rowsDuplicateInFile +
    (rowsToInsert.length - uniqueRowsToInsert.length);

  await supabase
    .from("import_batches")
    .update({
      rows_imported: uniqueRowsToInsert.length,
      rows_skipped: rowsSkipped,
    })
    .eq("id", batch.id);

  return {
    player: preview.player,
    rowsImported: uniqueRowsToInsert.length,
    rowsExisting: preview.rowsExisting,
    rowsDuplicateInFile: preview.rowsDuplicateInFile,
    rowsSkipped,
    rowsValid: preview.rowsValid,
    rowsDeduped: preview.rowsDeduped,
  };
}