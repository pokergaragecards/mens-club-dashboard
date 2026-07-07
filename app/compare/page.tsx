import { createSupabaseServerClient } from "@/lib/supabaseServer";

type SearchParams = {
  p1?: string;
  p2?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

type PlayerRow = {
  id: string;
  full_name: string;
  current_index: number | null;
};

type RoundRow = {
  player_id: string;
  played_at: string;
  differential: number | null;
  score_type: string | null;
};

type HoleScoreRow = {
  player_id: string;
  hole_number: number;
  gross_score: number | null;
  par: number | null;
  stroke_index: number | null;
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

function normalCdf(x: number) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}

function isCompetition(scoreType: string | null | undefined) {
  return ["C", "CH", "CA", "ECH"].includes(scoreType ?? "");
}

function formatNumber(value: number | null | undefined, decimals = 1) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toFixed(decimals);
}

function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

function winProbabilityFromNetExpectation(params: {
  p1ExpectedDiff: number;
  p1Volatility: number;
  p1ActualHandicap: number;
  p2ExpectedDiff: number;
  p2Volatility: number;
  p2ActualHandicap: number;
}) {
  const p1ExpectedNet = params.p1ExpectedDiff - params.p1ActualHandicap;
  const p2ExpectedNet = params.p2ExpectedDiff - params.p2ActualHandicap;

  const meanDifference = p2ExpectedNet - p1ExpectedNet;
  const combinedSd = Math.sqrt(
    params.p1Volatility * params.p1Volatility +
      params.p2Volatility * params.p2Volatility
  );

  return normalCdf(meanDifference / combinedSd);
}

function getCourseHandicap(index: number) {
  return Math.round(index);
}

function getsStrokeOnHole(strokeDiff: number, strokeIndex: number | null) {
  if (!strokeIndex || strokeDiff <= 0) return 0;

  if (strokeDiff <= 18) {
    return strokeIndex <= strokeDiff ? 1 : 0;
  }

  const base = Math.floor(strokeDiff / 18);
  const extra = strokeDiff % 18;

  return base + (strokeIndex <= extra ? 1 : 0);
}

function buildHoleDistributions(rows: HoleScoreRow[]) {
  const map = new Map<number, number[]>();

  for (const row of rows) {
    if (row.gross_score == null) continue;

    const hole = Number(row.hole_number);
    const score = Number(row.gross_score);

    if (!Number.isFinite(hole) || !Number.isFinite(score)) continue;

    const existing = map.get(hole) ?? [];
    existing.push(score);
    map.set(hole, existing);
  }

  return map;
}

function holeWinProbability(params: {
  p1Scores: number[];
  p2Scores: number[];
  p1Stroke: number;
  p2Stroke: number;
}) {
  let p1Wins = 0;
  let p2Wins = 0;
  let ties = 0;
  let total = 0;

  for (const p1Score of params.p1Scores) {
    for (const p2Score of params.p2Scores) {
      const p1Net = p1Score - params.p1Stroke;
      const p2Net = p2Score - params.p2Stroke;

      if (p1Net < p2Net) p1Wins++;
      else if (p2Net < p1Net) p2Wins++;
      else ties++;

      total++;
    }
  }

  if (!total) {
    return {
      p1Win: 0.33,
      p2Win: 0.33,
      tie: 0.34,
    };
  }

  return {
    p1Win: p1Wins / total,
    p2Win: p2Wins / total,
    tie: ties / total,
  };
}

function estimateHoleByHoleMatchPlay(params: {
  p1HoleRows: HoleScoreRow[];
  p2HoleRows: HoleScoreRow[];
  p1ActualHandicap: number;
  p2ActualHandicap: number;
}) {
  const p1Dist = buildHoleDistributions(params.p1HoleRows);
  const p2Dist = buildHoleDistributions(params.p2HoleRows);

  const p1CourseHcp = getCourseHandicap(params.p1ActualHandicap);
  const p2CourseHcp = getCourseHandicap(params.p2ActualHandicap);

  const strokeDiff = Math.abs(p1CourseHcp - p2CourseHcp);

  const p1GetsStrokes = p1CourseHcp > p2CourseHcp;
  const p2GetsStrokes = p2CourseHcp > p1CourseHcp;

  let p1ExpectedHoles = 0;
  let p2ExpectedHoles = 0;
  let expectedTies = 0;

  const holeDetails = [];

  for (let hole = 1; hole <= 18; hole++) {
    const p1Scores = p1Dist.get(hole) ?? [];
    const p2Scores = p2Dist.get(hole) ?? [];

    const strokeIndex =
      params.p1HoleRows.find((row) => row.hole_number === hole)?.stroke_index ??
      params.p2HoleRows.find((row) => row.hole_number === hole)?.stroke_index ??
      hole;

    const p1Stroke = p1GetsStrokes
      ? getsStrokeOnHole(strokeDiff, strokeIndex)
      : 0;

    const p2Stroke = p2GetsStrokes
      ? getsStrokeOnHole(strokeDiff, strokeIndex)
      : 0;

    const result = holeWinProbability({
      p1Scores,
      p2Scores,
      p1Stroke,
      p2Stroke,
    });

    p1ExpectedHoles += result.p1Win;
    p2ExpectedHoles += result.p2Win;
    expectedTies += result.tie;

    holeDetails.push({
      hole,
      strokeIndex,
      p1Stroke,
      p2Stroke,
      p1Win: result.p1Win,
      p2Win: result.p2Win,
      tie: result.tie,
      p1Samples: p1Scores.length,
      p2Samples: p2Scores.length,
    });
  }

  const decisiveTotal = p1ExpectedHoles + p2ExpectedHoles;

  return {
    p1MatchWinChance: decisiveTotal ? p1ExpectedHoles / decisiveTotal : 0.5,
    p2MatchWinChance: decisiveTotal ? p2ExpectedHoles / decisiveTotal : 0.5,
    p1ExpectedHoles,
    p2ExpectedHoles,
    expectedTies,
    holeDetails,
  };
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
    return (
      <div className="p-8 font-bold text-red-700">
        {playersError.message}
      </div>
    );
  }

  const selectedPlayers = ((players ?? []) as PlayerRow[]).filter(
    (player) => player.id === p1 || player.id === p2
  );

  let analysis: null | {
    p1Name: string;
    p2Name: string;

    p1ActualHandicap: number;
    p2ActualHandicap: number;

    p1CompetitionDiff: number | null;
    p2CompetitionDiff: number | null;

    p1RecentDiff: number | null;
    p2RecentDiff: number | null;

    p1CompRounds: number;
    p2CompRounds: number;
    p1TotalRounds: number;
    p2TotalRounds: number;

    p1Volatility: number;
    p2Volatility: number;

    strokeP1: number;
    strokeP2: number;
    matchP1: number;
    matchP2: number;

    strokesGiven: number;
    strokesReceiver: string;
    favorite: string;

    p1ExpectedHoles: number;
    p2ExpectedHoles: number;
    expectedTies: number;

    holeDetails: {
      hole: number;
      strokeIndex: number | null;
      p1Stroke: number;
      p2Stroke: number;
      p1Win: number;
      p2Win: number;
      tie: number;
      p1Samples: number;
      p2Samples: number;
    }[];
  } = null;

  if (p1 && p2 && p1 !== p2 && selectedPlayers.length === 2) {
    const [{ data: rounds, error: roundsError }, { data: holeRows, error: holeError }] =
      await Promise.all([
        supabase
          .from("rounds")
          .select("player_id, played_at, differential, score_type")
          .in("player_id", [p1, p2])
          .not("differential", "is", null)
          .order("played_at", { ascending: false }),

        supabase
          .from("hole_scores")
          .select("player_id, hole_number, gross_score, par, stroke_index")
          .in("player_id", [p1, p2])
          .not("gross_score", "is", null),
      ]);

    if (roundsError) {
      return <div className="p-8 font-bold text-red-700">{roundsError.message}</div>;
    }

    if (holeError) {
      return <div className="p-8 font-bold text-red-700">{holeError.message}</div>;
    }

    const playerOne = selectedPlayers.find((player) => player.id === p1)!;
    const playerTwo = selectedPlayers.find((player) => player.id === p2)!;

    const allRounds = (rounds ?? []) as RoundRow[];

    const p1Rounds = allRounds
      .filter((round) => round.player_id === p1)
      .slice(0, 20);

    const p2Rounds = allRounds
      .filter((round) => round.player_id === p2)
      .slice(0, 20);

    const p1Diffs = p1Rounds
      .map((round) => Number(round.differential))
      .filter(Number.isFinite);

    const p2Diffs = p2Rounds
      .map((round) => Number(round.differential))
      .filter(Number.isFinite);

    const p1CompetitionDiffs = p1Rounds
      .filter((round) => isCompetition(round.score_type))
      .map((round) => Number(round.differential))
      .filter(Number.isFinite);

    const p2CompetitionDiffs = p2Rounds
      .filter((round) => isCompetition(round.score_type))
      .map((round) => Number(round.differential))
      .filter(Number.isFinite);

    const p1ActualHandicap = Number(playerOne.current_index ?? 0);
    const p2ActualHandicap = Number(playerTwo.current_index ?? 0);

    const p1CompetitionDiff = avg(p1CompetitionDiffs);
    const p2CompetitionDiff = avg(p2CompetitionDiffs);

    const p1ExpectedDiff = p1CompetitionDiff ?? avg(p1Diffs);
    const p2ExpectedDiff = p2CompetitionDiff ?? avg(p2Diffs);

    const p1RecentDiff = avg(p1Diffs);
    const p2RecentDiff = avg(p2Diffs);

    const p1Volatility = stdDev(
      p1CompetitionDiffs.length ? p1CompetitionDiffs : p1Diffs
    );

    const p2Volatility = stdDev(
      p2CompetitionDiffs.length ? p2CompetitionDiffs : p2Diffs
    );

    const strokeP1 =
      p1ExpectedDiff == null || p2ExpectedDiff == null
        ? 0.5
        : winProbabilityFromNetExpectation({
            p1ExpectedDiff,
            p1Volatility,
            p1ActualHandicap,
            p2ExpectedDiff,
            p2Volatility,
            p2ActualHandicap,
          });

    const matchEstimate = estimateHoleByHoleMatchPlay({
      p1HoleRows: ((holeRows ?? []) as HoleScoreRow[]).filter(
        (row) => row.player_id === p1
      ),
      p2HoleRows: ((holeRows ?? []) as HoleScoreRow[]).filter(
        (row) => row.player_id === p2
      ),
      p1ActualHandicap,
      p2ActualHandicap,
    });

    const matchP1 = matchEstimate.p1MatchWinChance;

    const handicapDifference = Math.round(
      Math.abs(p1ActualHandicap - p2ActualHandicap)
    );

    analysis = {
      p1Name: playerOne.full_name,
      p2Name: playerTwo.full_name,

      p1ActualHandicap,
      p2ActualHandicap,

      p1CompetitionDiff,
      p2CompetitionDiff,

      p1RecentDiff,
      p2RecentDiff,

      p1CompRounds: p1CompetitionDiffs.length,
      p2CompRounds: p2CompetitionDiffs.length,
      p1TotalRounds: p1Diffs.length,
      p2TotalRounds: p2Diffs.length,

      p1Volatility,
      p2Volatility,

      strokeP1,
      strokeP2: 1 - strokeP1,

      matchP1,
      matchP2: 1 - matchP1,

      strokesGiven: handicapDifference,
      strokesReceiver:
        p1ActualHandicap > p2ActualHandicap
          ? playerOne.full_name
          : playerTwo.full_name,

      favorite: strokeP1 >= 0.5 ? playerOne.full_name : playerTwo.full_name,

      p1ExpectedHoles: matchEstimate.p1ExpectedHoles,
      p2ExpectedHoles: matchEstimate.p2ExpectedHoles,
      expectedTies: matchEstimate.expectedTies,

      holeDetails: matchEstimate.holeDetails,
    };
  }

  return (
    <main className="p-4 text-gray-900 md:p-8">
      <h1 className="text-3xl font-bold text-gray-950">Player Matchup</h1>

      <p className="mt-1 text-base font-medium text-gray-700">
        Stroke play uses competition differentials. Match play uses Goodrich
        hole-by-hole scoring odds with actual Handicap Index strokes.
      </p>

      <form className="mt-6 grid gap-4 rounded-xl border border-gray-300 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label className="block text-sm font-bold text-gray-700">Player 1</label>
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
          <label className="block text-sm font-bold text-gray-700">Player 2</label>
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
              Stroke play favorite:{" "}
              <span className="font-bold text-gray-950">
                {analysis.favorite}
              </span>
            </p>

            <p className="mt-1 text-sm text-gray-600">
              Match strokes use actual Handicap Index.{" "}
              <span className="font-bold">{analysis.strokesReceiver}</span>{" "}
              receives {analysis.strokesGiven} stroke
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
              note="Uses each player's competition differential expectation compared against actual Handicap Index strokes."
            />

            <ResultCard
              title="Match Play Win Chance"
              p1Name={analysis.p1Name}
              p2Name={analysis.p2Name}
              p1Pct={analysis.matchP1}
              p2Pct={analysis.matchP2}
              note="Uses actual Goodrich hole-by-hole score distributions and applies actual Handicap Index strokes by hole."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PlayerCard
              name={analysis.p1Name}
              actualHandicap={analysis.p1ActualHandicap}
              competitionDiff={analysis.p1CompetitionDiff}
              recentDiff={analysis.p1RecentDiff}
              compRounds={analysis.p1CompRounds}
              totalRounds={analysis.p1TotalRounds}
              volatility={analysis.p1Volatility}
            />

            <PlayerCard
              name={analysis.p2Name}
              actualHandicap={analysis.p2ActualHandicap}
              competitionDiff={analysis.p2CompetitionDiff}
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

            <p className="mt-2 text-sm text-gray-600">
              This accounts for players who have occasional blow-up holes that
              inflate their Handicap Index but hurt less in match play.
            </p>

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
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-gray-100 text-gray-900">
                  <tr>
                    <th className="p-2 text-left">Hole</th>
                    <th className="p-2 text-right">HCP</th>
                    <th className="p-2 text-right">{analysis.p1Name} Stroke</th>
                    <th className="p-2 text-right">{analysis.p2Name} Stroke</th>
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
                      <td className="p-2 text-right">{hole.strokeIndex ?? "-"}</td>
                      <td className="p-2 text-right">{hole.p1Stroke}</td>
                      <td className="p-2 text-right">{hole.p2Stroke}</td>
                      <td className="p-2 text-right">{formatPercent(hole.p1Win)}</td>
                      <td className="p-2 text-right">{formatPercent(hole.p2Win)}</td>
                      <td className="p-2 text-right">{formatPercent(hole.tie)}</td>
                      <td className="p-2 text-right">
                        {hole.p1Samples}/{hole.p2Samples}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-300 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-gray-950">
              How this is calculated
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-700">
              Stroke play estimates use each golfer&apos;s recent competition
              differential as their expected performance, then compare that
              against their official current Handicap Index. Match play uses
              actual Goodrich hole-by-hole scoring distributions, applies the
              official handicap strokes to the appropriate stroke-index holes,
              and estimates each player&apos;s chance of winning each hole.
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
  actualHandicap,
  competitionDiff,
  recentDiff,
  compRounds,
  totalRounds,
  volatility,
}: {
  name: string;
  actualHandicap: number;
  competitionDiff: number | null;
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
        <MiniStat label="Competition Diff" value={formatNumber(competitionDiff)} />
        <MiniStat label="Recent Diff" value={formatNumber(recentDiff)} />
        <MiniStat label="Comp Rounds" value={compRounds.toString()} />
        <MiniStat label="Total Rounds" value={totalRounds.toString()} />
        <MiniStat label="Volatility" value={formatNumber(volatility)} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-gray-950">{value}</div>
    </div>
  );
}