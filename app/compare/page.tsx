import { createSupabaseServerClient } from "@/lib/supabaseServer";

type SearchParams = {
  p1?: string;
  p2?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

type RoundRow = {
  player_id: string;
  played_at: string;
  differential: number | null;
  gross_score: number | null;
};

function avg(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values: number[]) {
  if (values.length < 2) return 4;
  const mean = avg(values) ?? 0;
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function normalCdf(x: number) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function erf(x: number) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * x);
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-x * x));

  return sign * y;
}

function winProbability(
  p1Avg: number,
  p1Sd: number,
  p2Avg: number,
  p2Sd: number,
  p1Handicap: number,
  p2Handicap: number
) {
  const p1NetAvg = p1Avg - p1Handicap;
  const p2NetAvg = p2Avg - p2Handicap;

  const meanDifference = p2NetAvg - p1NetAvg;
  const combinedSd = Math.sqrt(p1Sd * p1Sd + p2Sd * p2Sd);

  return normalCdf(meanDifference / combinedSd);
}

function formatPercent(value: number | null) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number | null, decimals = 1) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toFixed(decimals);
}

export default async function ComparePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const p1 = params.p1 ?? "";
  const p2 = params.p2 ?? "";

  const supabase = createSupabaseServerClient();

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, full_name, current_index")
    .eq("is_active", true)
    .order("full_name");

  if (playersError) {
    return <div className="p-8 font-bold text-red-700">{playersError.message}</div>;
  }

  const selectedPlayers = (players ?? []).filter(
    (player) => player.id === p1 || player.id === p2
  );

  let analysis: null | {
    p1Name: string;
    p2Name: string;
    p1Index: number;
    p2Index: number;
    p1Avg: number | null;
    p2Avg: number | null;
    p1Sd: number;
    p2Sd: number;
    strokeP1: number;
    strokeP2: number;
    matchP1: number;
    matchP2: number;
    strokesGiven: number;
    favorite: string;
  } = null;

  if (p1 && p2 && p1 !== p2 && selectedPlayers.length === 2) {
    const { data: rounds } = await supabase
      .from("rounds")
      .select("player_id, played_at, differential, gross_score")
      .in("player_id", [p1, p2])
      .not("differential", "is", null)
      .order("played_at", { ascending: false });

    const playerOne = selectedPlayers.find((player) => player.id === p1)!;
    const playerTwo = selectedPlayers.find((player) => player.id === p2)!;

    const p1Diffs = ((rounds ?? []) as RoundRow[])
      .filter((round) => round.player_id === p1)
      .slice(0, 20)
      .map((round) => Number(round.differential))
      .filter(Number.isFinite);

    const p2Diffs = ((rounds ?? []) as RoundRow[])
      .filter((round) => round.player_id === p2)
      .slice(0, 20)
      .map((round) => Number(round.differential))
      .filter(Number.isFinite);

    const p1Avg = avg(p1Diffs);
    const p2Avg = avg(p2Diffs);

    const p1Index = Number(playerOne.current_index ?? 0);
    const p2Index = Number(playerTwo.current_index ?? 0);

    const p1Sd = stdDev(p1Diffs);
    const p2Sd = stdDev(p2Diffs);

    const strokeP1 =
      p1Avg == null || p2Avg == null
        ? 0.5
        : winProbability(p1Avg, p1Sd, p2Avg, p2Sd, p1Index, p2Index);

    const matchP1 =
      p1Avg == null || p2Avg == null
        ? 0.5
        : winProbability(p1Avg, p1Sd * 0.9, p2Avg, p2Sd * 0.9, p1Index, p2Index);

    analysis = {
      p1Name: playerOne.full_name,
      p2Name: playerTwo.full_name,
      p1Index,
      p2Index,
      p1Avg,
      p2Avg,
      p1Sd,
      p2Sd,
      strokeP1,
      strokeP2: 1 - strokeP1,
      matchP1,
      matchP2: 1 - matchP1,
      strokesGiven: Math.abs(Math.round(p1Index - p2Index)),
      favorite: strokeP1 >= 0.5 ? playerOne.full_name : playerTwo.full_name,
    };
  }

  return (
    <main className="p-4 text-gray-900 md:p-8">
      <h1 className="text-3xl font-bold text-gray-950">Player Matchup</h1>
      <p className="mt-1 text-base font-medium text-gray-700">
        Compare two players using GHIN differentials, handicaps, stroke play odds,
        and match play odds.
      </p>

      <form className="mt-6 grid gap-4 rounded-xl border border-gray-300 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label className="block text-sm font-bold text-gray-700">
            Player 1
          </label>
          <select
            name="p1"
            defaultValue={p1}
            className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium"
          >
            <option value="">Select player</option>
            {(players ?? []).map((player) => (
              <option key={player.id} value={player.id}>
                {player.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700">
            Player 2
          </label>
          <select
            name="p2"
            defaultValue={p2}
            className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium"
          >
            <option value="">Select player</option>
            {(players ?? []).map((player) => (
              <option key={player.id} value={player.id}>
                {player.full_name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-md bg-slate-950 px-5 py-2 text-sm font-bold text-white"
        >
          Compare
        </button>
      </form>

      {analysis && (
        <section className="mt-6 space-y-6">
          <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-gray-950">
              {analysis.p1Name} vs {analysis.p2Name}
            </h2>

            <p className="mt-2 text-sm font-medium text-gray-700">
              Estimated favorite:{" "}
              <span className="font-bold text-gray-950">{analysis.favorite}</span>
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Handicap stroke difference: {analysis.strokesGiven} stroke
              {analysis.strokesGiven === 1 ? "" : "s"}.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ResultCard
              title="Stroke Play Win Chance"
              p1Name={analysis.p1Name}
              p2Name={analysis.p2Name}
              p1Pct={analysis.strokeP1}
              p2Pct={analysis.strokeP2}
              note="Based on net differential performance over recent rounds."
            />

            <ResultCard
              title="Match Play Win Chance"
              p1Name={analysis.p1Name}
              p2Name={analysis.p2Name}
              p1Pct={analysis.matchP1}
              p2Pct={analysis.matchP2}
              note="Uses the same handicap comparison with slightly reduced volatility."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PlayerCard
              name={analysis.p1Name}
              index={analysis.p1Index}
              avgDiff={analysis.p1Avg}
              volatility={analysis.p1Sd}
            />

            <PlayerCard
              name={analysis.p2Name}
              index={analysis.p2Index}
              avgDiff={analysis.p2Avg}
              volatility={analysis.p2Sd}
            />
          </div>

          <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-950">
              How this is calculated
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-700">
              This compares each player&apos;s recent handicap differentials
              against their current Handicap Index. A player whose recent
              differentials are lower than their index is playing better than
              their handicap. Stroke play is modeled as a net-score comparison.
              Match play is estimated similarly, but with slightly less
              volatility because one bad hole does not ruin an entire match.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

function ResultCard({
  title,
  p1Name,
  p2Name,
  p1Pct,
  p2Pct,
  note,
}: {
  title: string;
  p1Name: string;
  p2Name: string;
  p1Pct: number;
  p2Pct: number;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-950">{title}</h3>

      <div className="mt-4 space-y-3">
        <Bar label={p1Name} value={p1Pct} />
        <Bar label={p2Name} value={p2Pct} />
      </div>

      <p className="mt-4 text-sm text-gray-600">{note}</p>
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm font-bold">
        <span>{label}</span>
        <span>{formatPercent(value)}</span>
      </div>
      <div className="mt-1 h-3 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-700"
          style={{ width: `${Math.max(4, Math.round(value * 100))}%` }}
        />
      </div>
    </div>
  );
}

function PlayerCard({
  name,
  index,
  avgDiff,
  volatility,
}: {
  name: string;
  index: number;
  avgDiff: number | null;
  volatility: number;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-950">{name}</h3>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <MiniStat label="HI" value={formatNumber(index)} />
        <MiniStat label="Avg Diff" value={formatNumber(avgDiff)} />
        <MiniStat label="Volatility" value={formatNumber(volatility)} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-gray-950">{value}</div>
    </div>
  );
}