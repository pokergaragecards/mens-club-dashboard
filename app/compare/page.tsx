import {
  compareService,
  type HoleMode,
  type TeeMode,
} from "@/services/compareService";

type PageProps = {
  searchParams?: Promise<{
    p1?: string;
    p2?: string;
    holes?: HoleMode;
    tee?: TeeMode;
  }>;
};

function formatNumber(value: number | null | undefined, decimals = 1) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toFixed(decimals);
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const p1 = params.p1 ?? "";
  const p2 = params.p2 ?? "";
  const holeMode: HoleMode = params.holes === "all" ? "all" : "competition";
  const teeMode: TeeMode = params.tee === "all" ? "all" : "common";

  const players = await compareService.getPlayers();

  const analysis = await compareService.getAnalysis({
    p1,
    p2,
    holeMode,
    teeMode,
  });

  return (
    <main className="p-4 text-gray-900 md:p-8">
      <h1 className="text-3xl font-bold text-gray-950">Player Matchup</h1>

      <p className="mt-1 text-base font-medium text-gray-700">
        Stroke play uses competition differentials. Match play uses Goodrich
        hole-by-hole scoring odds with actual Handicap Index strokes.
      </p>

      <form className="mt-6 grid gap-4 rounded-xl border border-gray-300 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_220px_220px_auto] md:items-end">
        <SelectPlayer label="Player 1" name="p1" value={p1} players={players} />
        <SelectPlayer label="Player 2" name="p2" value={p2} players={players} />

        <div>
          <label className="block text-sm font-bold text-gray-700">
            Match Holes
          </label>
          <select
            name="holes"
            defaultValue={holeMode}
            className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium"
          >
            <option value="competition">Competition Holes</option>
            <option value="all">All Holes</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700">
            Tee Mode
          </label>
          <select
            name="tee"
            defaultValue={teeMode}
            className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium"
          >
            <option value="common">Most Common Tee</option>
            <option value="all">All Tees</option>
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
              Stroke play favorite:{" "}
              <span className="font-bold text-gray-950">
                {analysis.favorite}
              </span>
            </p>

            <p className="mt-1 text-sm text-gray-600">
              <span className="font-bold">{analysis.strokesReceiver}</span>{" "}
              receives {analysis.strokesGiven} stroke
              {analysis.strokesGiven === 1 ? "" : "s"}. Match model uses{" "}
              <span className="font-bold">
                {analysis.holeMode === "competition"
                  ? "competition holes"
                  : "all holes"}
              </span>{" "}
              and{" "}
              <span className="font-bold">
                {analysis.teeMode === "common"
                  ? "each player's most common tee"
                  : "all tees"}
              </span>
              .
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Tee basis: {analysis.p1Name} ={" "}
              <span className="font-bold">{analysis.p1CommonTee ?? "-"}</span>,{" "}
              {analysis.p2Name} ={" "}
              <span className="font-bold">{analysis.p2CommonTee ?? "-"}</span>
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ResultCard
              title="Stroke Play Win Chance"
              p1Name={analysis.p1Name}
              p2Name={analysis.p2Name}
              p1Pct={analysis.strokeP1}
              p2Pct={analysis.strokeP2}
              note="Uses each player's competition differential expectation compared against actual Handicap Index strokes."
            />

            <ResultCard
              title="Match Play Win Chance"
              p1Name={analysis.p1Name}
              p2Name={analysis.p2Name}
              p1Pct={analysis.matchP1}
              p2Pct={analysis.matchP2}
              note="Uses Goodrich hole-by-hole score distribution and applies strokes by hole."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PlayerCard
              name={analysis.p1Name}
              actualHandicap={analysis.p1ActualHandicap}
              competitionDiff={analysis.p1CompetitionDiff}
              competitionMedian={analysis.p1CompetitionMedian}
              compVsHandicap={analysis.p1CompVsHandicap}
              recentDiff={analysis.p1RecentDiff}
              compRounds={analysis.p1CompRounds}
              totalRounds={analysis.p1TotalRounds}
              volatility={analysis.p1Volatility}
            />

            <PlayerCard
              name={analysis.p2Name}
              actualHandicap={analysis.p2ActualHandicap}
              competitionDiff={analysis.p2CompetitionDiff}
              competitionMedian={analysis.p2CompetitionMedian}
              compVsHandicap={analysis.p2CompVsHandicap}
              recentDiff={analysis.p2RecentDiff}
              compRounds={analysis.p2CompRounds}
              totalRounds={analysis.p2TotalRounds}
              volatility={analysis.p2Volatility}
            />
          </div>

          <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-950">
              Hole-by-Hole Match Play Estimate
            </h3>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <MiniStat
                label={`${analysis.p1Name} Exp Holes`}
                value={formatNumber(analysis.p1ExpectedHoles)}
              />
              <MiniStat
                label={`${analysis.p2Name} Exp Holes`}
                value={formatNumber(analysis.p2ExpectedHoles)}
              />
              <MiniStat
                label="Expected Ties"
                value={formatNumber(analysis.expectedTies)}
              />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1150px] text-sm">
                <thead className="bg-gray-100 text-gray-900">
                  <tr>
                    <th className="p-2 text-left">Hole</th>
                    <th className="p-2 text-right">HCP</th>
                    <th className="p-2 text-right">{analysis.p1Name} Stroke</th>
                    <th className="p-2 text-right">{analysis.p2Name} Stroke</th>
                    <th className="p-2 text-right">{analysis.p1Name} Gross</th>
                    <th className="p-2 text-right">{analysis.p1Name} Net</th>
                    <th className="p-2 text-right">{analysis.p2Name} Gross</th>
                    <th className="p-2 text-right">{analysis.p2Name} Net</th>
                    <th className="p-2 text-right">{analysis.p1Name} Win</th>
                    <th className="p-2 text-right">{analysis.p2Name} Win</th>
                    <th className="p-2 text-right">Tie</th>
                    <th className="p-2 text-right">Samples</th>
                  </tr>
                </thead>

                <tbody>
                  {analysis.holeDetails.map((hole) => (
                    <tr key={hole.hole} className="border-b border-gray-200">
                      <td className="p-2 font-bold">{hole.hole}</td>
                      <td className="p-2 text-right">
                        {hole.strokeIndex ?? "-"}
                      </td>
                      <td className="p-2 text-right">{hole.p1Stroke}</td>
                      <td className="p-2 text-right">{hole.p2Stroke}</td>
                      <td className="p-2 text-right">
                        {formatNumber(hole.p1AvgGross)}
                      </td>
                      <td className="p-2 text-right font-bold">
                        {formatNumber(hole.p1AvgNet)}
                      </td>
                      <td className="p-2 text-right">
                        {formatNumber(hole.p2AvgGross)}
                      </td>
                      <td className="p-2 text-right font-bold">
                        {formatNumber(hole.p2AvgNet)}
                      </td>
                      <td className="p-2 text-right">
                        {formatPercent(hole.p1Win)}
                      </td>
                      <td className="p-2 text-right">
                        {formatPercent(hole.p2Win)}
                      </td>
                      <td className="p-2 text-right">
                        {formatPercent(hole.tie)}
                      </td>
                      <td className="p-2 text-right">
                        {hole.p1Samples}/{hole.p2Samples}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

function SelectPlayer({
  label,
  name,
  value,
  players,
}: {
  label: string;
  name: string;
  value: string;
  players: { id: string; full_name: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700">{label}</label>
      <select
        name={name}
        defaultValue={value}
        className="mt-1 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm font-medium"
      >
        <option value="">Select player</option>
        {players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.full_name}
          </option>
        ))}
      </select>
    </div>
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
  actualHandicap,
  competitionDiff,
  competitionMedian,
  compVsHandicap,
  recentDiff,
  compRounds,
  totalRounds,
  volatility,
}: {
  name: string;
  actualHandicap: number;
  competitionDiff: number | null;
  competitionMedian: number | null;
  compVsHandicap: number | null;
  recentDiff: number | null;
  compRounds: number;
  totalRounds: number;
  volatility: number;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-gray-950">{name}</h3>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
        <MiniStat label="Actual HI" value={formatNumber(actualHandicap)} />
        <MiniStat label="Comp Avg Diff" value={formatNumber(competitionDiff)} />
        <MiniStat label="Comp Median" value={formatNumber(competitionMedian)} />
        <MiniStat label="Comp vs HI" value={formatNumber(compVsHandicap)} />
        <MiniStat label="Recent Diff" value={formatNumber(recentDiff)} />
        <MiniStat label="Comp Rounds" value={compRounds} />
        <MiniStat label="Total Rounds" value={totalRounds} />
        <MiniStat label="Volatility" value={formatNumber(volatility)} />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-gray-950">{value}</div>
    </div>
  );
}