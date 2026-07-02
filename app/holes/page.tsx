import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { HoleStatsTable } from "@/components/holes/HoleStatsTable";

type SearchParams = {
  player?: string;
  start?: string;
  end?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

function getDefaultStartDate() {
  return `${new Date().getFullYear()}-01-01`;
}

function getDefaultEndDate() {
  return new Date().toISOString().slice(0, 10);
}

export default async function HolesPage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};

  const startDate = params.start ?? getDefaultStartDate();
  const endDate = params.end ?? getDefaultEndDate();

  const supabase = createSupabaseServerClient();

  //
  // Active players
  //
  const { data: players, error: playerError } = await supabase
    .from("players")
    .select(`
      id,
      full_name,
      ghin_number,
      current_index
    `)
    .eq("is_active", true)
    .order("full_name");

  if (playerError) {
    throw new Error(playerError.message);
  }

  const selectedPlayerId =
    players?.find((p) => p.id === params.player)?.id ??
    players?.[0]?.id ??
    "";

  //
  // Goodrich hole definitions
  //
  const { data: courseHoles, error: courseError } = await supabase
    .from("course_holes")
    .select("*")
    .eq("course_name", "Goodrich")
    .order("tee_name")
    .order("hole_number");

  if (courseError) {
    throw new Error(courseError.message);
  }

  //
  // Hole scores
  //
  const { data: holeScores, error: scoreError } =
    selectedPlayerId
      ? await supabase
          .from("hole_scores")
          .select(`
            player_id,
            played_at,
            tee_name,
            hole_number,
            gross_score,
            players (
              full_name,
              ghin_number
            )
          `)
          .eq("player_id", selectedPlayerId)
          .eq("source", "GHIN_HBH_PDF")
          .gte("played_at", startDate)
          .lte("played_at", endDate)
          .order("played_at", {
            ascending: false,
          })
          .order("tee_name")
          .order("hole_number")
      : {
          data: [],
          error: null,
        };

  if (scoreError) {
    throw new Error(scoreError.message);
  }

  const rows =
    (holeScores ?? []).map((row: any) => ({
      player_id: row.player_id,
      full_name: row.players?.full_name ?? "",
      ghin_number: row.players?.ghin_number ?? "",
      played_at: row.played_at,
      tee_name: row.tee_name,
      hole_number: row.hole_number,
      gross_score: row.gross_score,
    }));

  return (
    <main className="space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">
          Hole Statistics
        </h1>

        <p className="mt-2 text-gray-600">
          View hole-by-hole scoring history by
          player and tee box.
        </p>
      </div>

      <HoleStatsTable
        rows={rows}
        players={players ?? []}
        courseHoles={courseHoles ?? []}
        startDate={startDate}
        endDate={endDate}
        initialPlayerId={selectedPlayerId}
      />
    </main>
  );
}