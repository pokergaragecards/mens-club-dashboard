import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type PageProps = {
  params: Promise<{ id: string }>;
};

type RoundRow = {
  id: string;
  played_at: string;
  gross_score: number | null;
  adjusted_gross_score: number | null;
  differential: number | null;
  score_type: string | null;
  course_name: string | null;
  tee_name: string | null;
};

type AuditGroup = {
  label: string;
  rounds: RoundRow[];
  hi: number | null;
  avgDiff: number | null;
};

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toFixed(decimals);
}

function isCompetition(scoreType: string | null | undefined) {
  return ["C", "CH", "CA", "ECH"].includes(scoreType ?? "");
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function whsHi(rounds: RoundRow[]) {
  const diffs = rounds
    .map((round) => Number(round.differential))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  const n = diffs.length;
  if (n < 5) return null;

  let count = 8;
  let adjustment = 0;

  if (n === 5) count = 1;
  else if (n === 6) {
    count = 2;
    adjustment = -1;
  } else if (n <= 8) count = 2;
  else if (n <= 11) count = 3;
  else if (n <= 14) count = 4;
  else if (n <= 16) count = 5;
  else if (n <= 18) count = 6;
  else if (n === 19) count = 7;

  const selected = diffs.slice(0, count);
  return average(selected) == null ? null : average(selected)! + adjustment;
}

function buildAuditGroups(rounds: RoundRow[]): AuditGroup[] {
  const sorted = rounds
    .filter((round) => round.differential != null)
    .sort(
      (a, b) =>
        new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    );

  const overall = sorted.slice(0, 20);
  const competition = sorted
    .filter((round) => isCompetition(round.score_type))
    .slice(0, 20);
  const general = sorted
    .filter((round) => !isCompetition(round.score_type))
    .slice(0, 20);

  return [
    {
      label: "Overall",
      rounds: overall,
      hi: whsHi(overall),
      avgDiff: average(overall.map((round) => Number(round.differential))),
    },
    {
      label: "Competition",
      rounds: competition,
      hi: whsHi(competition),
      avgDiff: average(competition.map((round) => Number(round.differential))),
    },
    {
      label: "General Play",
      rounds: general,
      hi: whsHi(general),
      avgDiff: average(general.map((round) => Number(round.differential))),
    },
  ];
}

function scoresList(rounds: RoundRow[]) {
  return rounds
    .map((round) => round.adjusted_gross_score ?? round.gross_score ?? "-")
    .join(", ");
}

export default async function PlayerAuditPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const [{ data: player, error: playerError }, { data: rounds, error: roundsError }] =
    await Promise.all([
      supabase
        .from("players")
        .select("id, full_name, ghin_number, current_index")
        .eq("id", id)
        .limit(1),

      supabase
        .from("player_display_rounds")
        .select(
          `
          id,
          played_at,
          gross_score,
          adjusted_gross_score,
          differential,
          score_type,
          course_name,
          tee_name
        `
        )
        .eq("player_id", id)
        .not("played_at", "is", null)
        .order("played_at", { ascending: false }),
    ]);

  if (playerError || roundsError) {
    return (
      <main className="p-8 font-bold text-red-700">
        {playerError?.message ?? roundsError?.message}
      </main>
    );
  }

  const playerRow = player?.[0];

  if (!playerRow) {
    return (
      <main className="p-8">
        <Link href="/audit" className="font-bold text-blue-800 hover:underline">
          ← Back to Audit
        </Link>
        <p className="mt-4 font-bold text-red-700">Player not found.</p>
      </main>
    );
  }

  const roundRows = (rounds ?? []) as RoundRow[];
  const groups = buildAuditGroups(roundRows);

  return (
    <main className="space-y-6 p-4 text-gray-900 md:p-8">
      <div>
        <Link href="/audit" className="font-bold text-blue-800 hover:underline">
          ← Back to Audit
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-950">
          {playerRow.full_name} Audit
        </h1>

        <p className="mt-1 text-sm text-gray-700">
          GHIN #{playerRow.ghin_number ?? "-"} • Current HI{" "}
          <span className="font-bold">
            {formatNumber(playerRow.current_index)}
          </span>
        </p>
      </div>

      <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Last 20 Handicap Breakdown
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b bg-gray-200 text-gray-950">
              <tr>
                <th className="p-3">Group</th>
                <th className="p-3 text-right"># Rounds</th>
                <th className="p-3 text-right">Calculated HI</th>
                <th className="p-3 text-right">Avg Differential</th>
                <th className="p-3">Scores Used</th>
              </tr>
            </thead>

            <tbody>
              {groups.map((group) => (
                <tr key={group.label} className="border-b hover:bg-blue-50">
                  <td className="p-3 font-bold">{group.label}</td>
                  <td className="p-3 text-right">{group.rounds.length}</td>
                  <td className="p-3 text-right font-bold">
                    {formatNumber(group.hi)}
                  </td>
                  <td className="p-3 text-right">
                    {formatNumber(group.avgDiff)}
                  </td>
                  <td className="p-3">{scoresList(group.rounds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Differentials Over Time
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-gray-200 text-gray-950">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Course</th>
                <th className="p-3">Tee</th>
                <th className="p-3 text-right">Score</th>
                <th className="p-3 text-right">Differential</th>
                <th className="p-3">Category</th>
              </tr>
            </thead>

            <tbody>
              {roundRows.map((round) => (
                <tr key={round.id} className="border-b hover:bg-blue-50">
                  <td className="p-3">{round.played_at}</td>
                  <td className="p-3">{round.score_type ?? "-"}</td>
                  <td className="p-3">{round.course_name ?? "-"}</td>
                  <td className="p-3">{round.tee_name ?? "-"}</td>
                  <td className="p-3 text-right">
                    {round.adjusted_gross_score ?? round.gross_score ?? "-"}
                  </td>
                  <td className="p-3 text-right font-bold">
                    {formatNumber(round.differential)}
                  </td>
                  <td className="p-3">
                    {isCompetition(round.score_type)
                      ? "Competition"
                      : "General Play"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}