import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function PlayerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single();

  const { data: rounds, error: roundsError } = await supabase
    .from("rounds")
    .select("*")
    .eq("player_id", id)
    .order("played_at", { ascending: false })
    .limit(20);

  if (playerError || !player) {
    return (
      <div className="p-8">
        <Link href="/players" className="text-blue-700 hover:underline">
          ← Back to Players
        </Link>
        <p className="mt-4 text-red-600">Player not found.</p>
      </div>
    );
  }

  if (roundsError) {
    return <div className="p-8 text-red-600">{roundsError.message}</div>;
  }

  return (
    <div className="p-8">
      <Link href="/players" className="text-blue-700 hover:underline">
        ← Back to Players
      </Link>

      <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold">{player.full_name}</h1>
        <p className="mt-1 text-gray-600">GHIN: {player.ghin_number}</p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Current Index</p>
            <p className="text-2xl font-bold">{player.current_index ?? "-"}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Low Index</p>
            <p className="text-2xl font-bold">{player.low_index ?? "-"}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Rounds</p>
            <p className="text-2xl font-bold">{rounds?.length ?? 0}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-gray-500">Fetch Enabled</p>
            <p className="text-2xl font-bold">
              {player.score_fetch_enabled ? "Yes" : "No"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="text-xl font-semibold">Recent Rounds</h2>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Type</th>
              <th className="p-3 text-right">Score</th>
              <th className="p-3 text-right">Adj</th>
              <th className="p-3 text-right">Diff</th>
              <th className="p-3 text-right">Rating</th>
              <th className="p-3 text-right">Slope</th>
            </tr>
          </thead>
          <tbody>
            {rounds?.length ? (
              rounds.map((round) => (
                <tr key={round.id} className="border-b">
                  <td className="p-3">{round.played_at}</td>
                  <td className="p-3">{round.score_type ?? "-"}</td>
                  <td className="p-3 text-right">{round.gross_score ?? "-"}</td>
                  <td className="p-3 text-right">
                    {round.adjusted_gross_score ?? "-"}
                  </td>
                  <td className="p-3 text-right">
                    {round.differential != null
                      ? Number(round.differential).toFixed(1)
                      : "-"}
                  </td>
                  <td className="p-3 text-right">{round.course_rating ?? "-"}</td>
                  <td className="p-3 text-right">{round.slope_rating ?? "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-4 text-gray-500" colSpan={7}>
                  No rounds imported yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}