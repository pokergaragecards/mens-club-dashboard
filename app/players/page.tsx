import { createSupabaseServerClient } from "@/lib/supabaseServer";
import Link from "next/link";

type SortKey = "name" | "index";
type SortDir = "asc" | "desc";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    sort?: SortKey;
    dir?: SortDir;
  }>;
};

type PlayerSummaryRow = {
  player_id: string;
  all_rounds: number | string | null;
  avg_diff: number | string | null;
  best_diff: number | string | null;
  last_round: string | null;
};

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toFixed(decimals);
}

function sortLink(
  label: string,
  key: SortKey,
  currentSort: SortKey,
  currentDir: SortDir,
  q: string
) {
  const nextDir =
    currentSort === key && currentDir === "asc" ? "desc" : "asc";

  const params = new URLSearchParams();
  params.set("sort", key);
  params.set("dir", nextDir);
  if (q) params.set("q", q);

  const arrow =
    currentSort === key ? (currentDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <Link href={`/players?${params.toString()}`} className="hover:underline">
      {label}
      {arrow}
    </Link>
  );
}

export default async function PlayersPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim() ?? "";
  const sort: SortKey = params.sort === "index" ? "index" : "name";
  const dir: SortDir = params.dir === "desc" ? "desc" : "asc";

  const supabase = createSupabaseServerClient();

  let playerQuery = supabase
    .from("players")
    .select("id, full_name, ghin_number, current_index")
    .eq("is_active", true);

  if (q) {
    playerQuery = playerQuery.or(
      `full_name.ilike.%${q}%,ghin_number.ilike.%${q}%`
    );
  }

  const { data: players, error: playersError } = await playerQuery;

  if (playersError) {
    return (
      <div className="p-8 font-bold text-red-700">
        {playersError.message}
      </div>
    );
  }

  const playerIds = (players ?? []).map((player) => player.id);

  const { data: summaries, error: summariesError } = playerIds.length
    ? await supabase
        .from("player_round_summary")
        .select("player_id, all_rounds, avg_diff, best_diff, last_round")
        .in("player_id", playerIds)
    : { data: [], error: null };

  if (summariesError) {
    return (
      <div className="p-8 font-bold text-red-700">
        {summariesError.message}
      </div>
    );
  }

  const summaryByPlayerId = new Map<string, PlayerSummaryRow>(
    ((summaries ?? []) as PlayerSummaryRow[]).map((summary) => [
      summary.player_id,
      summary,
    ])
  );

  const rows = (players ?? [])
    .map((player) => {
      const summary = summaryByPlayerId.get(player.id);

      return {
        ...player,
        totalRounds: Number(summary?.all_rounds ?? 0),
        averageDifferential: summary?.avg_diff ?? null,
        bestDifferential: summary?.best_diff ?? null,
        lastRound: summary?.last_round ?? null,
      };
    })
    .sort((a, b) => {
      if (sort === "index") {
        const aIndex = a.current_index == null ? 999 : Number(a.current_index);
        const bIndex = b.current_index == null ? 999 : Number(b.current_index);
        return dir === "asc" ? aIndex - bIndex : bIndex - aIndex;
      }

      return dir === "asc"
        ? a.full_name.localeCompare(b.full_name)
        : b.full_name.localeCompare(a.full_name);
    });

  return (
    <div className="p-4 text-gray-900 md:p-8">
      <h1 className="text-3xl font-bold text-gray-950">Players</h1>

      <p className="mt-1 text-base font-medium text-gray-700">
        Club roster and deduped All Rounds summary.
      </p>

      <form className="mt-6 flex flex-col gap-3 rounded-xl border border-gray-300 bg-white p-4 shadow-sm md:flex-row md:items-end">
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-700">
            Search players
          </label>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name or GHIN..."
            className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium text-gray-900"
          />
        </div>

        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />

        <button
          type="submit"
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white"
        >
          Search
        </button>

        <Link
          href="/players"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-bold text-gray-800 hover:bg-gray-100"
        >
          Clear
        </Link>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-300 bg-white shadow-sm">
        <table className="w-full min-w-[850px] text-left text-sm text-gray-900">
          <thead className="border-b border-gray-300 bg-gray-200 text-gray-950">
            <tr>
              <th className="p-3 font-bold">
                {sortLink("Player", "name", sort, dir, q)}
              </th>
              <th className="p-3 font-bold">GHIN</th>
              <th className="p-3 text-right font-bold">
                {sortLink("Current HI", "index", sort, dir, q)}
              </th>
              <th className="p-3 text-right font-bold">All Rounds</th>
              <th className="p-3 text-right font-bold">Avg Diff</th>
              <th className="p-3 text-right font-bold">Best Diff</th>
              <th className="p-3 font-bold">Last Round</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((player) => (
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

                <td className="p-3 font-medium">
                  {player.ghin_number ?? "-"}
                </td>

                <td className="p-3 text-right font-medium">
                  {formatNumber(player.current_index)}
                </td>

                <td className="p-3 text-right font-medium">
                  {player.totalRounds}
                </td>

                <td className="p-3 text-right font-medium">
                  {formatNumber(player.averageDifferential)}
                </td>

                <td className="p-3 text-right font-medium">
                  {formatNumber(player.bestDifferential)}
                </td>

                <td className="p-3 font-medium">
                  {player.lastRound ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}