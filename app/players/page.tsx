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
      <div className="p-8 text-gray-900">
        <h1 className="text-3xl font-bold text-gray-950">Players</h1>
        <p className="mt-4 font-medium text-red-700">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="p-8 text-gray-900">
      <h1 className="text-3xl font-bold text-gray-950">Players</h1>
      <p className="mt-1 text-base font-medium text-gray-700">
        Club roster and scoring summary.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
        <table className="w-full text-left text-sm text-gray-900">
          <thead className="border-b border-gray-300 bg-gray-200 text-gray-950">
            <tr>
              <th className="p-3 font-bold">Player</th>
              <th className="p-3 font-bold">GHIN</th>
              <th className="p-3 text-right font-bold">Index</th>
              <th className="p-3 text-right font-bold">Rounds</th>
              <th className="p-3 text-right font-bold">Avg Diff</th>
              <th className="p-3 text-right font-bold">Best Diff</th>
              <th className="p-3 font-bold">Last Round</th>
            </tr>
          </thead>
          <tbody>
            {players?.map((player) => (
              <tr
                key={player.id}
                className="border-b border-gray-200 hover:bg-blue-50"
              >
                <td className="p-3 font-bold">
                  <Link
                    href={`/players/${player.id}`}
                    className="text-blue-800 hover:underline"
                  >
                    {player.full_name}
                  </Link>
                </td>
                <td className="p-3 font-medium">{player.ghin_number}</td>
                <td className="p-3 text-right font-medium">
                  {player.current_index ?? "-"}
                </td>
                <td className="p-3 text-right font-medium">
                  {player.total_rounds ?? 0}
                </td>
                <td className="p-3 text-right font-medium">
                  {player.average_differential != null
                    ? Number(player.average_differential).toFixed(1)
                    : "-"}
                </td>
                <td className="p-3 text-right font-medium">
                  {player.best_differential != null
                    ? Number(player.best_differential).toFixed(1)
                    : "-"}
                </td>
                <td className="p-3 font-medium">{player.last_round ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}