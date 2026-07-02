import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function createScoreSyncQueue() {
  const supabase = createSupabaseServerClient();

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, ghin_number, score_maintenance_url")
    .eq("sync_enabled", true)
    .not("ghin_number", "like", "TEMP-%")
    .order("last_name", { ascending: true });

  if (playersError) throw new Error(playersError.message);

  const { data: run, error: runError } = await supabase
    .from("score_sync_runs")
    .insert({
      status: "queued",
      players_queued: players?.length ?? 0,
    })
    .select("id")
    .single();

  if (runError) throw new Error(runError.message);

  const queueRows =
    players?.map((player) => ({
      player_id: player.id,
      ghin_number: player.ghin_number,
      score_maintenance_url:
        player.score_maintenance_url ??
        `https://adminportal.usga.org/manage/association/45/club/19968/golfer/${player.ghin_number}/score-maintenance`,
      status: "pending",
    })) ?? [];

  if (queueRows.length > 0) {
    const { error: queueError } = await supabase
      .from("score_sync_queue")
      .insert(queueRows);

    if (queueError) throw new Error(queueError.message);
  }

  return {
    runId: run.id,
    playersQueued: queueRows.length,
  };
}