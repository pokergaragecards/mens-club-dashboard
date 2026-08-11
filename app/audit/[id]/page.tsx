import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  AuditTrendChart,
  type AuditHandicapTrendPoint,
} from "@/components/audit/AuditTrendChart";
import { auditService } from "@/services/auditService";
import { isCompetitionScoreType } from "@/lib/auditEvidence";

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
  counts_for_hi: boolean | null;
};

type RoundWithDiff = RoundRow & {
  diff: number;
  score: number | null;
};

type AuditGroup = {
  label: string;
  rounds: RoundWithDiff[];
  hi: number | null;
  avgDiff: number | null;
  usedCount: number;
};

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";

  const number = Number(value);
  return Number.isNaN(number) ? "-" : number.toFixed(decimals);
}

function isCompetition(scoreType: string | null | undefined) {
  return isCompetitionScoreType(scoreType);
}

function scoreTypeLabel(scoreType: string | null | undefined) {
  switch (scoreType) {
    case "H":
      return "Home";
    case "A":
      return "Away";
    case "C":
      return "Competition";
    case "CH":
      return "Competition Home";
    case "CA":
      return "Competition Away";
    case "ECH":
      return "Exceptional Competition Home";
    case "EA":
      return "Exceptional Away";
    case "EH":
      return "Exceptional Home";
    case "NA":
      return "Nine-Hole Away";
    case "NH":
      return "Nine-Hole Home";
    case "NCA":
      return "Nine-Hole Competition Away";
    case "NCH":
      return "Nine-Hole Competition Home";
    default:
      return scoreType ?? "-";
  }
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function whsUsedCount(roundCount: number) {
  if (roundCount < 3) return 0;
  if (roundCount <= 5) return 1;
  if (roundCount <= 8) return 2;
  if (roundCount <= 11) return 3;
  if (roundCount <= 14) return 4;
  if (roundCount <= 16) return 5;
  if (roundCount <= 18) return 6;
  if (roundCount === 19) return 7;
  return 8;
}

function whsAdjustment(roundCount: number) {
  if (roundCount === 3) return -2;
  if (roundCount === 4 || roundCount === 6) return -1;
  return 0;
}

function calculateCategoryHi(rounds: RoundRow[]) {
  const differentials = [...rounds]
    .sort(
      (a, b) =>
        new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    )
    .slice(0, 20)
    .map((round) => Number(round.differential))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  const usedCount = whsUsedCount(differentials.length);

  if (!usedCount) return null;

  const used = differentials.slice(0, usedCount);
  const adjustment = whsAdjustment(differentials.length);
  const result = average(used);

  return result == null
    ? null
    : Math.round((result + adjustment) * 10) / 10;
}

function whsHi(rounds: RoundWithDiff[]) {
  const usedCount = whsUsedCount(rounds.length);

  if (!usedCount) return null;

  const usedDiffs = rounds
    .slice(0, usedCount)
    .map((round) => round.diff);

  const adjustment = whsAdjustment(rounds.length);
  const hi = average(usedDiffs);

  return hi == null ? null : Math.round((hi + adjustment) * 10) / 10;
}

function decisionClass(code: string) {
  if (code === "adjustment_supported")
    return "border-red-300 bg-red-50 text-red-950";
  if (code === "provisional_adjustment")
    return "border-orange-300 bg-orange-50 text-orange-950";
  if (code === "manual_review")
    return "border-purple-300 bg-purple-50 text-purple-950";
  if (code === "monitor")
    return "border-yellow-300 bg-yellow-50 text-yellow-950";
  if (code === "no_adjustment")
    return "border-blue-300 bg-blue-50 text-blue-950";
  return "border-green-300 bg-green-50 text-green-950";
}

function buildGroup(label: string, rounds: RoundWithDiff[]): AuditGroup {
  const sorted = [...rounds].sort((a, b) => a.diff - b.diff);

  return {
    label,
    rounds: sorted,
    hi: whsHi(sorted),
    avgDiff: average(sorted.map((round) => round.diff)),
    usedCount: whsUsedCount(sorted.length),
  };
}

function buildAuditGroups(rounds: RoundRow[]): AuditGroup[] {
  const eligible = rounds
    .filter(
      (round) =>
        round.counts_for_hi === true &&
        round.differential != null
    )
    .sort(
      (a, b) =>
        new Date(b.played_at).getTime() -
        new Date(a.played_at).getTime()
    )
    .map((round) => ({
      ...round,
      diff: Number(round.differential),
      score:
        round.adjusted_gross_score != null
          ? Number(round.adjusted_gross_score)
          : round.gross_score != null
            ? Number(round.gross_score)
            : null,
    }));

  const overall = eligible.slice(0, 20);

  const competition = eligible
    .filter((round) => isCompetition(round.score_type))
    .slice(0, 20);

  const general = eligible
    .filter((round) => !isCompetition(round.score_type))
    .slice(0, 20);

  return [
    buildGroup("Overall Handicap Rounds", overall),
    buildGroup("Competition Handicap Rounds", competition),
    buildGroup("General Play Handicap Rounds", general),
  ];
}

function buildRollingHandicapTrend(
  rounds: RoundRow[],
  category: "Competition" | "General Play"
): AuditHandicapTrendPoint[] {
  const chronological = [...rounds].sort(
    (a, b) =>
      new Date(a.played_at).getTime() -
      new Date(b.played_at).getTime()
  );

  const points: AuditHandicapTrendPoint[] = [];

  chronological.forEach((round, index) => {
    const history = chronological
      .slice(Math.max(0, index - 19), index + 1)
      .filter((item) => item.differential != null);

    const handicapIndex = calculateCategoryHi(history);

    if (handicapIndex == null || round.differential == null) return;

    points.push({
      id: round.id,
      date: round.played_at,
      course: round.course_name,
      score:
        round.adjusted_gross_score != null
          ? Number(round.adjusted_gross_score)
          : round.gross_score != null
            ? Number(round.gross_score)
            : null,
      differential: Number(round.differential),
      handicapIndex,
      category,
    });
  });

  return points.slice(-10);
}

function NumberList({
  group,
  field,
}: {
  group: AuditGroup;
  field: "score" | "diff";
}) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-1">
      {group.rounds.map((round, index) => {
        const isUsed = index < group.usedCount;

        const value =
          field === "score"
            ? round.score ?? "-"
            : formatNumber(round.diff);

        const className =
          field === "score"
            ? isCompetition(round.score_type)
              ? "font-bold text-green-700"
              : "font-medium text-gray-900"
            : isUsed
              ? "font-black text-gray-950"
              : "text-gray-700";

        return (
          <span
            key={`${field}-${round.id}`}
            className={className}
          >
            {value}
          </span>
        );
      })}
    </div>
  );
}

function DecisionMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-current/20 bg-white/80 p-4">
      <div className="text-sm font-bold text-gray-600">{label}</div>
      <div className="mt-1 text-3xl font-black text-gray-950">{value}</div>
      {note && <div className="mt-1 text-sm text-gray-600">{note}</div>}
    </div>
  );
}

export default async function PlayerAuditPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const [
    { data: player, error: playerError },
    { data: rounds, error: roundsError },
    auditRows,
  ] = await Promise.all([
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
          tee_name,
          counts_for_hi
        `
      )
      .eq("player_id", id)
      .eq("counts_for_hi", true)
      .not("played_at", "is", null)
      .not("differential", "is", null)
      .order("played_at", { ascending: false }),
    auditService.getAuditRows("last20"),
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
      <main className="p-4 text-gray-900 md:p-8">
        <Link
          href="/audit"
          className="font-bold text-blue-800 hover:underline"
        >
          ← Back to Audit
        </Link>

        <p className="mt-4 font-bold text-red-700">
          Player not found.
        </p>
      </main>
    );
  }

  const hiRoundRows = (rounds ?? []) as RoundRow[];
  const auditRow = auditRows.find((row) => row.id === id);
  const groups = buildAuditGroups(hiRoundRows);

  const competitionRounds = hiRoundRows.filter((round) =>
    isCompetition(round.score_type)
  );

  const generalRounds = hiRoundRows.filter(
    (round) => !isCompetition(round.score_type)
  );

  const competitionTrendPoints = buildRollingHandicapTrend(
    competitionRounds,
    "Competition"
  );

  const generalTrendPoints = buildRollingHandicapTrend(
    generalRounds,
    "General Play"
  );

  return (
    <main className="space-y-6 p-4 text-gray-900 md:p-8">
      <header>
        <Link
          href="/audit"
          className="font-bold text-blue-800 hover:underline"
        >
          ← Back to Audit
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-950">
          {playerRow.full_name} Audit
        </h1>

        <p className="mt-1 text-sm text-gray-700">
          GHIN #{playerRow.ghin_number ?? "-"} • Current Handicap
          Index{" "}
          <span className="font-bold">
            {formatNumber(playerRow.current_index)}
          </span>
        </p>
      </header>

      {auditRow && (
        <section
          className={`rounded-2xl border-2 p-5 shadow-sm ${decisionClass(
            auditRow.decision.code
          )}`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-black uppercase tracking-wide">
                Committee Decision Analysis
              </div>
              <h2 className="mt-1 text-3xl font-black">
                {auditRow.decision.label}
              </h2>
              <p className="mt-3 max-w-4xl text-lg font-medium leading-7">
                {auditRow.decision.summary}
              </p>
            </div>

            {auditRow.decision.suggestedIndex != null && (
              <div className="min-w-48 rounded-xl border border-current bg-white/70 p-4 text-center">
                <div className="text-sm font-black uppercase">
                  Suggested Committee HI
                </div>
                <div className="mt-1 text-5xl font-black">
                  {formatNumber(auditRow.decision.suggestedIndex)}
                </div>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-current/20 bg-white/80 p-4">
            <div className="text-sm font-black uppercase tracking-wide">
              Two-Year Committee Evidence Model
            </div>
            <p className="mt-2 text-base font-medium leading-6">
              Period: {auditRow.evidenceCutoffDate} through today. The model
              first looks for 10 Goodrich competition rounds, then 10 total
              competition rounds. With only 3-9 total competition rounds, it
              blends the competition HI with the last 10 available Goodrich
              general-play rounds. Fewer than three competition rounds can
              support monitoring only. When fewer than 10 Goodrich competition
              rounds are available, the gap uses the higher of the Last 20
              Competition HI and Two-Year Committee Evidence HI.
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <DecisionMetric
              label="Current / Overall HI"
              value={formatNumber(auditRow.overallHi)}
            />
            <DecisionMetric
              label="Goodrich Competition HI"
              value={formatNumber(auditRow.goodrichCompetition24MonthsHi)}
              note={`${auditRow.goodrichCompetition24MonthsRounds} rounds in 24 months`}
            />
            <DecisionMetric
              label="All Competition HI"
              value={formatNumber(auditRow.allCompetition24MonthsHi)}
              note={`${auditRow.allCompetition24MonthsRounds} rounds in 24 months`}
            />
            <DecisionMetric
              label="Goodrich General HI"
              value={formatNumber(auditRow.goodrichGeneralLast10Hi)}
              note={`Last ${auditRow.goodrichGeneralLast10Rounds} available rounds in 24 months`}
            />
            <DecisionMetric
              label="Committee Evidence HI"
              value={formatNumber(auditRow.committeeEvidenceHi)}
              note={auditRow.committeeEvidenceBasisLabel}
            />
            <DecisionMetric
              label="Conservative Review HI"
              value={formatNumber(auditRow.reviewComparisonHi)}
              note={auditRow.reviewComparisonBasisLabel}
            />
            <DecisionMetric
              label="Review HI vs Overall Gap"
              value={formatNumber(auditRow.competitionVsOverallGap)}
            />
          </div>

          <div className="mt-4 rounded-xl border border-current/20 bg-white/80 p-4">
            <h3 className="text-lg font-black">Calculation selected</h3>
            <p className="mt-2 text-base font-bold">
              {auditRow.committeeEvidenceFormula}
            </p>
            <p className="mt-3 text-base font-bold">
              Gap comparison: {auditRow.reviewComparisonBasisLabel} at{" "}
              {formatNumber(auditRow.reviewComparisonHi)}.
            </p>
            <p className="mt-3 text-sm font-medium text-gray-700">
              Sandbag Score {auditRow.sandbagIndex} = 10 points per positive
              Evidence-vs-Overall stroke ({formatNumber(
                auditRow.competitionVsOverallGap
              )}) plus 10 points per positive Goodrich-General-vs-Competition
              stroke ({formatNumber(
                auditRow.competitionVsGoodrichGeneralGap
              )}). Negative components count as zero.
            </p>
            <p className="mt-3 text-sm font-medium text-gray-700">
              Legacy context: All-time Last-20 Competition HI {formatNumber(
                auditRow.last20CompetitionHi
              )}; Last-12-Month Competition HI {formatNumber(
                auditRow.last12MonthsCompetitionHi
              )} from {auditRow.last12MonthsCompetitionRounds} rounds;
              All-time Last-20 General Play HI {formatNumber(
                auditRow.last20GeneralPlayHi
              )}.
            </p>
          </div>

          <div className="mt-5 rounded-xl bg-white/70 p-4">
            <h3 className="text-lg font-black">Evidence considered</h3>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-base font-medium">
              {auditRow.decision.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <AuditTrendChart
        competitionPoints={competitionTrendPoints}
        generalPoints={generalTrendPoints}
        currentHandicap={
          playerRow.current_index == null
            ? null
            : Number(playerRow.current_index)
        }
      />

      <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Last 20 Official Handicap Round Breakdown
        </h2>

        <p className="mt-1 text-sm text-gray-600">
          Scores and differentials are sorted from lowest
          differential to highest. Bold differentials are used in
          the Handicap Index calculation. Competition scores are
          shown in green.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b bg-gray-200 text-gray-950">
              <tr>
                <th className="p-3">Group</th>
                <th className="p-3 text-right">Rounds</th>
                <th className="p-3 text-right">Used</th>
                <th className="p-3 text-right">Calculated HI</th>
                <th className="p-3 text-right">
                  Average Differential
                </th>
                <th className="p-3">Scores</th>
                <th className="p-3">Differentials</th>
              </tr>
            </thead>

            <tbody>
              {groups.map((group) => (
                <tr
                  key={group.label}
                  className="border-b align-top hover:bg-blue-50"
                >
                  <td className="p-3 font-bold">{group.label}</td>
                  <td className="p-3 text-right">
                    {group.rounds.length}
                  </td>
                  <td className="p-3 text-right">
                    {group.usedCount || "-"}
                  </td>
                  <td className="p-3 text-right font-bold">
                    {formatNumber(group.hi)}
                  </td>
                  <td className="p-3 text-right">
                    {formatNumber(group.avgDiff)}
                  </td>
                  <td className="p-3">
                    <NumberList group={group} field="score" />
                  </td>
                  <td className="p-3">
                    <NumberList group={group} field="diff" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Official Handicap Differentials Over Time
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="border-b bg-gray-200 text-gray-950">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Score Type</th>
                <th className="p-3">Course</th>
                <th className="p-3">Tee</th>
                <th className="p-3 text-right">Score</th>
                <th className="p-3 text-right">
                  Differential
                </th>
                <th className="p-3">Category</th>
              </tr>
            </thead>

            <tbody>
              {hiRoundRows.map((round) => {
                const competition = isCompetition(
                  round.score_type
                );

                return (
                  <tr
                    key={round.id}
                    className="border-b hover:bg-blue-50"
                  >
                    <td className="p-3">{round.played_at}</td>
                    <td className="p-3">
                      {scoreTypeLabel(round.score_type)}
                    </td>
                    <td className="p-3">
                      {round.course_name ?? "-"}
                    </td>
                    <td className="p-3">
                      {round.tee_name ?? "-"}
                    </td>
                    <td
                      className={`p-3 text-right ${
                        competition
                          ? "font-bold text-green-700"
                          : "font-medium text-gray-900"
                      }`}
                    >
                      {round.adjusted_gross_score ??
                        round.gross_score ??
                        "-"}
                    </td>
                    <td className="p-3 text-right font-bold">
                      {formatNumber(round.differential)}
                    </td>
                    <td
                      className={
                        competition
                          ? "p-3 font-bold text-green-700"
                          : "p-3 text-gray-900"
                      }
                    >
                      {competition
                        ? "Competition"
                        : "General Play"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
