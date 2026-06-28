import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function PlayersPage() {
  const supabase = createSupabaseServerClient();

  const { data: players, error } = await supabase
    .from("players")
    .select("id, full_name, ghin_number, current_index, is_active")
    .order("last_name", { ascending: true });

  if (error) {
    return (
      <main className="p-8">
        <h1 className="text-3xl font-bold">Players</h1>
        <p className="mt-4 text-red-600">{error.message}</p>
      </main>
    );
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Players</h1>

      <div className="mt-6 rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">GHIN</th>
              <th className="p-3">Index</th>
              <th className="p-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {players?.map((player) => (
              <tr key={player.id} className="border-b">
                <td className="p-3">{player.full_name}</td>
                <td className="p-3">{player.ghin_number}</td>
                <td className="p-3">{player.current_index ?? "-"}</td>
                <td className="p-3">{player.is_active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}