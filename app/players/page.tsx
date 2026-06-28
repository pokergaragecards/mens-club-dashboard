import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";

export default async function PlayersPage() {
  const supabase = createSupabaseServerClient();

  const { data: players, error } = await supabase
    .from("player_summary")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Players</h1>
        <p className="mt-4 text-red-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold">Players</h1>
        <p className="mt-1 text-gray-600">Club roster and scoring summary.</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              <th className="p-3">Player</th>
              <th className="p-3">GHIN</th>
              <th className="p-3 text-right">Index</th>
              <th className="p-3 text-right">Rounds</th>
              <th className="p-3 text-right">Avg Diff</th>
              <th className="p-3 text-right">Best Diff</th>
              <th className="p-3">Last Round</th>
            </tr>
          </thead>
          <tbody>
            {players?.map((player) => (
              <tr key={player.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">
                  <Link href={`/players/${player.id}`} className="text-blue-700 hover:underline">
                    {player.full_name}
                  </Link>
                </td>
                <td className="p-3">{player.ghin_number}</td>
                <td className="p-3 text-right">{player.current_index ?? "-"}</td>
                <td className="p-3 text-right">{player.total_rounds ?? 0}</td>
                <td className="p-3 text-right">
                  {player.average_differential != null
                    ? Number(player.average_differential).toFixed(1)
                    : "-"}
                </td>
                <td className="p-3 text-right">
                  {player.best_differential != null
                    ? Number(player.best_differential).toFixed(1)
                    : "-"}
                </td>
                <td className="p-3">{player.last_round ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}