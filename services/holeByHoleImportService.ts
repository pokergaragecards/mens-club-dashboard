import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { HoleByHoleRound } from "@/utils/holeByHoleParser";
import { findOrCreatePlayer } from "./holeByHolePlayerService";
import { importRound } from "./holeByHoleRoundService";

const IMPORT_SOURCE = "GHIN_HBH_PDF";

export interface HoleByHoleImportSummary {
  roundsImported: number;
  roundsSkipped: number;
  holesImported: number;
  rowsSkipped: number;
}

async function syncCurrentIndexesFromLatestHbhRound() {
  const supabase = createSupabaseServerClient();

  const { error } = await supabase.rpc(
    "sync_current_indexes_from_latest_hbh_round"
  );

  if (error) {
    throw error;
  }
}

export async function importHoleByHoleRounds(params: {
  fileName: string;
  rounds: HoleByHoleRound[];
}): Promise<HoleByHoleImportSummary> {
  const supabase = createSupabaseServerClient();

  let roundsImported = 0;
  let roundsSkipped = 0;
  let holesImported = 0;
  let rowsSkipped = 0;

  const { data: batch, error: batchError } = await supabase
    .from("hole_score_import_batches")
    .insert({
      source: IMPORT_SOURCE,
      file_name: params.fileName,
      rows_found: params.rounds.length,
      rounds_imported: 0,
      holes_imported: 0,
      rows_skipped: 0,
    })
    .select("id")
    .single();

  if (batchError) {
    throw batchError;
  }

  for (const round of params.rounds) {
    try {
      if (!round.holes || round.holes.length !== 18) {
        rowsSkipped++;
        continue;
      }

      const playerId = await findOrCreatePlayer(round);

      if (!playerId) {
        console.error("HBH Import Error: no playerId returned", {
          golferName: round.golferName,
          ghinNumber: round.ghinNumber,
          playedAt: round.playedAt,
          totalScore: round.totalScore,
        });

        rowsSkipped++;
        continue;
      }

      const result = await importRound(playerId, round);

      if (result.skipped) {
        roundsSkipped++;
        continue;
      }

      roundsImported++;
      holesImported += result.holesInserted;
    } catch (error) {
      console.error("HBH Import Error", round.golferName, round.playedAt, error);
      rowsSkipped++;
    }
  }

  await supabase
    .from("hole_score_import_batches")
    .update({
      rounds_imported: roundsImported,
      holes_imported: holesImported,
      rows_skipped: rowsSkipped,
    })
    .eq("id", batch.id);

  await syncCurrentIndexesFromLatestHbhRound();

  return {
    roundsImported,
    roundsSkipped,
    holesImported,
    rowsSkipped,
  };
}