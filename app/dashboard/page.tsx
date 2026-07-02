import { createSupabaseServerClient } from "@/lib/supabaseServer";

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toFixed(decimals);
}

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();

  const { data: club } = await supabase
    .from("club_dashboard_summary")
    .select("*")
    .single();

  const { data: rounds } = await supabase
    .from("club_round_summary")
    .select("*")
    .single();

  const { data: holes } = await supabase
    .from("club_hole_summary")
    .select("*")
    .single();

  const cards = [
    ["Players", club?.total_players ?? 0],
    ["Active Players", club?.active_players ?? 0],
    ["Average Index", formatNumber(club?.average_index)],
    ["Lowest Index", formatNumber(club?.lowest_index)],
    ["Total Rounds", rounds?.total_rounds ?? 0],
    ["Rounds Last 30", rounds?.rounds_last_30 ?? 0],
    ["Avg Differential", formatNumber(rounds?.average_differential)],
    ["Best Differential", formatNumber(rounds?.best_differential)],
    ["Hole Scores", holes?.total_hole_scores ?? 0],
    ["Avg Hole Score", formatNumber(holes?.average_hole_score)],
    ["Best Hole Score", holes?.best_hole_score ?? "-"],
    ["Worst Hole Score", holes?.worst_hole_score ?? "-"],
  ];

  return (
    <div className="p-8 text-gray-900">
      <h1 className="text-4xl font-bold text-gray-950">
        Men&apos;s Club Dashboard
      </h1>
      <p className="mt-2 text-base font-medium text-gray-700">
        Club-wide handicap, round, and hole-by-hole analytics.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-bold text-gray-700">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-950">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}