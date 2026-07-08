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

function buildGroups(rounds: RoundRow[]) {
  const rows = rounds
    .filter((round) => round.differential != null)
    .map((round) => ({
      ...round,
      diff: Number(round.differential),
      score: Number(round.adjusted_gross_score ?? round.gross_score),
      isCompetition: isCompetition(round.score_type),
    }));

  const comp = rows.filter((row) => row.isCompetition);
  const general = rows.filter((row) => !row.isCompetition);

  return {
    overall: {
      label: "Overall",
      rounds: rows.length,
      avgDiff: average(rows.map((row) => row.diff)),
      bestDiff: rows.length ? Math.min(...rows.map((row) => row.diff)) : null,
      avgScore: average(rows.map((row) => row.score).filter(Number.isFinite)),
    },
    competition: {
      label: "Competition",
      rounds: comp.length,
      avgDiff: average(comp.map((row) => row.diff)),
      bestDiff: comp.length ? Math.min(...comp.map((row) => row.diff)) : null,
      avgScore: average(comp.map((row) => row.score).filter(Number.isFinite)),
    },
    general: {
      label: "General Play",
      rounds: general.length,
      avgDiff: average(general.map((row) => row.diff)),
      bestDiff: general.length ? Math.min(...general.map((row) => row.diff)) : null,
      avgScore: average(general.map((row) => row.score).filter(Number.isFinite)),
    },
  };
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
        .order("played_at", { ascending: true }),
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
  const groups = buildGroups(roundRows);

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
          <span className="font-bold">{formatNumber(playerRow.current_index)}</span>
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AuditSummaryCard {...groups.overall} />
        <AuditSummaryCard {...groups.competition} />
        <AuditSummaryCard {...groups.general} />
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
              {roundRows
                .slice()
                .reverse()
                .map((round) => (
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

function AuditSummaryCard({
  label,
  rounds,
  avgDiff,
  bestDiff,
  avgScore,
}: {
  label: string;
  rounds: number;
  avgDiff: number | null;
  bestDiff: number | null;
  avgScore: number | null;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-bold text-gray-950">{label}</h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MiniStat label="# Rounds" value={rounds} />
        <MiniStat label="Avg Diff" value={formatNumber(avgDiff)} />
        <MiniStat label="Best Diff" value={formatNumber(bestDiff)} />
        <MiniStat label="Avg Score" value={formatNumber(avgScore)} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-950">{value}</div>
    </div>
  );
}