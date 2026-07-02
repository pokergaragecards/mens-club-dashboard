import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { CompareTable } from "@/components/compare/CompareTable";

export default async function ComparePage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("player_comparison_summary")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    return <div className="p-8 font-bold text-red-700">{error.message}</div>;
  }

  return (
    <div className="p-8 text-gray-900">
      <h1 className="text-3xl font-bold text-gray-950">Player Comparison</h1>
      <p className="mt-1 text-base font-medium text-gray-700">
        Compare handicap, scoring, and differential performance across players.
      </p>

      <CompareTable players={data ?? []} />
    </div>
  );
}