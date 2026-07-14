import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  AuditTrendChart,
  type AuditTrendPoint,
} from "@/components/audit/AuditTrendChart";

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
  return ["C", "CH", "CA", "ECH"].includes(scoreType ?? "");
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
    default:
      return scoreType ?? "-";
  }
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function whsUsedCount(roundCount: number) {
  if (roundCount < 5) return 0;
  if (roundCount === 5) return 1;
  if (roundCount <= 8) return 2;
  if (roundCount <= 11) return 3;
  if (roundCount <= 14) return 4;
  if (roundCount <= 16) return 5;
  if (roundCount <= 18) return 6;
  if (roundCount === 19) return 7;
  return 8;
}

function whsHi(rounds: RoundWithDiff[]) {
  const usedCount = whsUsedCount(rounds.length);

  if (!usedCount) return null;

  const usedDiffs = rounds
    .slice(0, usedCount)
    .map((round) => round.diff);

  const adjustment = rounds.length === 6 ? -1 : 0;
  const hi = average(usedDiffs);

  return hi == null ? null : hi + adjustment;
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

function toTrendPoint(round: RoundRow): AuditTrendPoint {
  return {
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
    category: isCompetition(round.score_type)
      ? "Competition"
      : "General Play",
  };
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

export default async function PlayerAuditPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const [
    { data: player, error: playerError },
    { data: rounds, error: roundsError },
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
  const groups = buildAuditGroups(hiRoundRows);

  const competitionTrendPoints = hiRoundRows
    .filter((round) => isCompetition(round.score_type))
    .slice(0, 10)
    .map(toTrendPoint);

  const generalTrendPoints = hiRoundRows
    .filter((round) => !isCompetition(round.score_type))
    .slice(0, 10)
    .map(toTrendPoint);

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
                <th className="p-3 text-right">
                  Calculated HI
                </th>
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
                  <td className="p-3 font-bold">
                    {group.label}
                  </td>
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
                    <td className="p-3">
                      {round.played_at}
                    </td>
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