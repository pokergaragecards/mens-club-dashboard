import { createSupabaseServerClient } from "@/lib/supabaseServer";
import type { HoleByHoleRound } from "@/utils/holeByHoleParser";

const supabase = createSupabaseServerClient();

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

export async function findOrCreatePlayer(
  round: HoleByHoleRound
): Promise<string> {
  //
  // First try GHIN number
  //
  if (round.ghinNumber) {
    const { data } = await supabase
      .from("players")
      .select("id")
      .eq("ghin_number", round.ghinNumber)
      .maybeSingle();

    if (data) {
      return data.id;
    }
  }

  //
  // Then try by generated full_name
  //
  const { data: existingByName } = await supabase
    .from("players")
    .select("id")
    .eq("full_name", round.golferName)
    .maybeSingle();

  if (existingByName) {
    return existingByName.id;
  }

  //
  // Create player
  //
  const name = splitName(round.golferName);

  const { data: created, error } = await supabase
    .from("players")
    .insert({
      first_name: name.firstName,
      last_name: name.lastName,
      ghin_number: round.ghinNumber || null,
      current_index: round.handicapIndex,
      is_active: true,
      sync_enabled: true,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return created.id;
}

export async function updatePlayerHandicap(
  playerId: string,
  handicapIndex: number | null
) {
  if (handicapIndex == null) {
    return;
  }

  const { error } = await supabase
    .from("players")
    .update({
      current_index: handicapIndex,
    })
    .eq("id", playerId);

  if (error) {
    throw error;
  }
}