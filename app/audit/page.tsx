import Link from "next/link";
import { auditService } from "@/services/auditService";
import { ExportAuditPdfButton } from "@/components/audit/ExportAuditPdfButton";
import { ExportCompetitionChokersPdfButton } from "@/components/audit/ExportCompetitionChokersPdfButton";
import { PrepareEmailButton } from "@/components/audit/PrepareEmailButton";
import { shouldShowPrepareEmail } from "@/lib/auditEmailEligibility";
import { compareAuditRowsByStrokeDiscrepancy } from "@/lib/auditSort";
import { HANDICAP_COMMITTEE_CC_LABEL } from "@/lib/handicapCommittee";

type Period = "last20" | "30" | "60" | "90" | "season";

type PageProps = {
  searchParams?: Promise<{ period?: Period }>;
};

type AuditRow = Awaited<
  ReturnType<typeof auditService.getAuditRows>
>[number];

const ACTION_BUTTON =
  "inline-flex min-h-10 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700";

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "N/A";
  const number = Number(value);
  if (!Number.isFinite(number)) return "N/A";
  return number.toFixed(decimals);
}

function formatInteger(value: unknown) {
  if (value === null || value === undefined) return "N/A";
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number).toString() : "N/A";
}

function formatWeight(value: number | null) {
  return value == null ? "N/A" : `${Math.round(value * 100)}%`;
}

function formatBoolean(value: boolean | null) {
  if (value == null) return "N/A";
  return value ? "Yes" : "No";
}

function flagClass(flag: string) {
  if (flag === "Investigate") return "bg-red-200 text-red-900";
  if (flag === "Review") return "bg-orange-100 text-orange-900";
  if (flag === "Watch") return "bg-yellow-100 text-yellow-900";
  return "bg-green-100 text-green-800";
}

function confidenceClass(confidence: string) {
  if (confidence === "High") return "bg-green-100 text-green-800";
  if (confidence === "Medium") return "bg-blue-100 text-blue-800";
  return "bg-yellow-100 text-yellow-900";
}

function decisionClass(code: string) {
  if (code === "adjustment_supported") return "bg-red-100 text-red-900";
  if (code === "provisional_adjustment") return "bg-orange-100 text-orange-900";
  if (code === "manual_review") return "bg-purple-100 text-purple-900";
  if (code === "monitor") return "bg-yellow-100 text-yellow-900";
  if (code === "no_adjustment") return "bg-blue-100 text-blue-900";
  return "bg-green-100 text-green-900";
}

export default async function AuditPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const period: Period = params.period ?? "last20";
  const rows = [...(await auditService.getAuditRows(period))].sort(
    compareAuditRowsByStrokeDiscrepancy
  );
  const changeRows = rows.filter((row) =>
    shouldShowPrepareEmail(row.decision)
  );

  const tabs: { href: string; label: string; value: Period }[] = [
    { href: "/audit?period=last20", label: "Last 20", value: "last20" },
    { href: "/audit?period=30", label: "30 Days", value: "30" },
    { href: "/audit?period=60", label: "60 Days", value: "60" },
    { href: "/audit?period=90", label: "90 Days", value: "90" },
    { href: "/audit?period=season", label: "Season", value: "season" },
  ];

  return (
    <main className="p-4 text-base text-gray-900 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">
            Handicap Audit
          </h1>

          <p className="mt-2 text-base text-gray-600 lg:text-lg">
            Audit view using official GHIN handicap-counting rounds only,
            comparing the current Handicap Index with a two-year committee
            evidence model built from Goodrich competition, all competition,
            and Goodrich general-play rounds when the competition sample is
            thin. With fewer than 10 recent Goodrich competition rounds, the
            gap uses the higher of Last 20 Competition HI or Two-Year Committee
            Evidence HI. Once that Conservative Review HI is selected, the
            final test for every golfer is Current HI minus Conservative Review
            HI: a difference of 2.0 strokes or more produces a committee change.
            Every input and intermediate calculation is shown; N/A means that
            value was unavailable or that stage of the equation was not reached.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportAuditPdfButton />
          <ExportCompetitionChokersPdfButton />

          <Link
            href="/audit/committee"
            className="inline-flex w-fit items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-base font-semibold text-gray-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            Committee Audit
          </Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.href}
            className={
              period === tab.value
                ? "rounded-lg border border-slate-900 bg-slate-900 px-4 py-2.5 text-base font-semibold text-white"
                : "rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-base font-semibold text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border-2 border-red-300 bg-red-50 p-4 lg:p-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-red-900">
              Current Handicap Change Emails
            </h2>
            <p className="mt-1 max-w-4xl text-base font-medium text-red-900">
              These players meet the same adjustment criteria shown on their
              detailed audit pages. Each email uses that player&apos;s current
              decision, evidence, reason, and committee handicap rounded upward
              to the nearest 0.5. The Conservative Review HI comparison is the
              final adjustment test for every golfer.
            </p>
          </div>

          <div className="text-sm font-semibold text-red-800 lg:max-w-xl lg:text-right">
            CC: {HANDICAP_COMMITTEE_CC_LABEL}
          </div>
        </div>

        {changeRows.length ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {changeRows.map((row) => (
              <article
                key={row.id}
                className="rounded-xl border border-red-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link
                      href={`/audit/${row.id}`}
                      className="text-xl font-black text-gray-950 underline decoration-red-300 underline-offset-4"
                    >
                      {row.full_name}
                    </Link>
                    <div className="mt-2 text-lg font-black text-red-800">
                      Current {formatNumber(row.overallHi)} → Committee{" "}
                      {formatNumber(row.decision.suggestedIndex)}
                    </div>
                    <div className="mt-1 font-bold text-gray-800">
                      Stroke Discrepancy: {formatNumber(
                        row.competitionVsOverallGap
                      )}
                    </div>
                  </div>

                  <div className="w-full sm:w-52">
                    <AuditChangeEmailButton row={row} />
                  </div>
                </div>

                <p className="mt-3 text-sm font-semibold text-gray-800">
                  Why: {row.decision.summary}
                </p>
                <p className="mt-2 text-sm text-gray-600">
                  Review source: {row.reviewComparisonBasisLabel}; evidence
                  basis: {row.committeeEvidenceBasisLabel}.
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 font-semibold text-gray-700">
            No current audit decisions produce a committee handicap change.
          </p>
        )}
      </section>

      <div className="mt-6 hidden max-h-[75vh] overflow-auto rounded-xl border border-gray-300 bg-white shadow-sm lg:block">
        <table className="w-full min-w-[9800px] text-left text-base text-gray-900">
          <thead className="sticky top-0 z-20 border-b border-gray-300 bg-gray-200 text-gray-950 shadow-sm">
            <tr>
              <th className="sticky left-0 z-30 min-w-[540px] bg-gray-200 p-4 text-base font-bold leading-snug">
                Player
              </th>
              <th className="min-w-[190px] p-4 text-right text-base font-bold leading-snug">
                Sandbag Score
              </th>
              <th className="min-w-[230px] p-4 text-right text-base font-bold leading-snug">
                Current Handicap Index
              </th>
              <th className="min-w-[250px] p-4 text-right text-base font-bold leading-snug">
                Last 20 Competition HI
              </th>
              <th className="min-w-[220px] p-4 text-center text-base font-bold leading-snug">
                Evidence Window Starts
              </th>
              <th className="min-w-[250px] p-4 text-right text-base font-bold leading-snug">
                Last 12 Months Competition HI
              </th>
              <th className="min-w-[250px] p-4 text-right text-base font-bold leading-snug">
                Last 12 Months Competition Rounds
              </th>
              <th className="min-w-[270px] p-4 text-right text-base font-bold leading-snug">
                24-Month Goodrich Competition HI
              </th>
              <th className="min-w-[290px] p-4 text-right text-base font-bold leading-snug">
                24-Month Goodrich Competition Rounds
              </th>
              <th className="min-w-[270px] p-4 text-right text-base font-bold leading-snug">
                24-Month All Competition HI
              </th>
              <th className="min-w-[270px] p-4 text-right text-base font-bold leading-snug">
                24-Month All Competition Rounds
              </th>
              <th className="min-w-[270px] p-4 text-right text-base font-bold leading-snug">
                Last-10 Goodrich General HI
              </th>
              <th className="min-w-[270px] p-4 text-right text-base font-bold leading-snug">
                Goodrich General Rounds Used
              </th>
              <th className="min-w-[250px] p-4 text-right text-base font-bold leading-snug">
                Competition HI Input
              </th>
              <th className="min-w-[210px] p-4 text-right text-base font-bold leading-snug">
                Competition Weight
              </th>
              <th className="min-w-[210px] p-4 text-right text-base font-bold leading-snug">
                General-Play Weight
              </th>
              <th className="min-w-[270px] p-4 text-right text-base font-bold leading-snug">
                Two-Year Committee Evidence HI
              </th>
              <th className="min-w-[300px] p-4 text-base font-bold leading-snug">
                Evidence Basis
              </th>
              <th className="min-w-[280px] p-4 text-base font-bold leading-snug">
                Evidence Basis Code
              </th>
              <th className="min-w-[520px] p-4 text-base font-bold leading-snug">
                Evidence Formula
              </th>
              <th className="min-w-[260px] p-4 text-center text-base font-bold leading-snug">
                Benefit-of-Doubt Rule Applied
              </th>
              <th className="min-w-[360px] p-4 text-base font-bold leading-snug">
                Conservative Review Source
              </th>
              <th className="min-w-[280px] p-4 text-right text-base font-bold leading-snug">
                Conservative Review HI
              </th>
              <th className="min-w-[250px] p-4 text-right text-base font-bold leading-snug">
                Last 20 General Play HI
              </th>
              <th className="min-w-[280px] border-x-2 border-red-300 bg-red-100 p-4 text-right text-base font-bold leading-snug text-red-800">
                Stroke Discrepancy
              </th>
              <th className="min-w-[220px] p-4 text-center text-base font-bold leading-snug">
                2.0-Stroke Threshold Met
              </th>
              <th className="min-w-[300px] p-4 text-right text-base font-bold leading-snug">
                Goodrich General vs Competition Gap
              </th>
              <th className="min-w-[260px] p-4 text-right text-base font-bold leading-snug">
                Single-Low-Score Sensitivity
              </th>
              <th className="min-w-[240px] p-4 text-right text-base font-bold leading-snug">
                Suggested Committee HI
              </th>
              <th className="min-w-[250px] p-4 text-right text-base font-bold leading-snug">
                Stroke Discrepancy Points
              </th>
              <th className="min-w-[270px] p-4 text-right text-base font-bold leading-snug">
                Goodrich Comparison Points
              </th>
              <th className="min-w-[260px] p-4 text-base font-bold leading-snug">
                Committee Decision
              </th>
              <th className="min-w-[220px] p-4 text-right text-base font-bold leading-snug">
                Competition Rounds
              </th>
              <th className="min-w-[220px] p-4 text-right text-base font-bold leading-snug">
                General Play Rounds
              </th>
              <th className="min-w-[230px] p-4 text-right text-base font-bold leading-snug">
                Total Handicap Rounds
              </th>
              <th className="min-w-[270px] p-4 text-right text-base font-bold leading-snug">
                Competition Avg Differential
              </th>
              <th className="min-w-[270px] p-4 text-right text-base font-bold leading-snug">
                General Play Avg Differential
              </th>
              <th className="min-w-[240px] p-4 text-right text-base font-bold leading-snug">
                Competition Avg Score
              </th>
              <th className="min-w-[240px] p-4 text-right text-base font-bold leading-snug">
                General Play Avg Score
              </th>
              <th className="p-3 font-bold">Confidence</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold">Reason</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="group border-b border-gray-200 hover:bg-blue-50">
                <td className="sticky left-0 z-10 min-w-[540px] bg-white p-3 font-bold group-hover:bg-blue-50">
                  <div className="grid grid-cols-[minmax(190px,1fr)_80px_80px_140px] items-center gap-3">
                    <span className="text-2xl">{row.full_name}</span>

                    <Link href={`/players/${row.id}`} className={ACTION_BUTTON}>
                      Player
                    </Link>

                    <Link href={`/audit/${row.id}`} className={ACTION_BUTTON}>
                      Audit
                    </Link>

                    <AuditChangeEmailButton row={row} />
                  </div>
                </td>

                <td className="p-3 text-right text-2xl font-black">{row.sandbagIndex}</td>
                <td className="p-3 text-right text-2xl font-bold">{formatNumber(row.overallHi)}</td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.last20CompetitionHi)}
                </td>
                <td className="p-3 text-center text-xl font-bold">
                  {row.evidenceCutoffDate || "N/A"}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.last12MonthsCompetitionHi)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatInteger(row.last12MonthsCompetitionRounds)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.goodrichCompetition24MonthsHi)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatInteger(row.goodrichCompetition24MonthsRounds)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.allCompetition24MonthsHi)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatInteger(row.allCompetition24MonthsRounds)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.goodrichGeneralLast10Hi)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatInteger(row.goodrichGeneralLast10Rounds)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.competitionHiForComparison)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatWeight(row.evidenceCompetitionWeight)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatWeight(row.evidenceGeneralWeight)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.committeeEvidenceHi)}
                </td>
                <td className="p-3 text-base font-bold">
                  {row.committeeEvidenceBasisLabel || "N/A"}
                </td>
                <td className="p-3 text-base font-bold">
                  {row.committeeEvidenceBasis || "N/A"}
                </td>
                <td className="p-3 text-base font-medium text-gray-800">
                  {row.committeeEvidenceFormula || "N/A"}
                </td>
                <td className="p-3 text-center text-2xl font-bold">
                  {formatBoolean(row.reviewUsedBenefitOfDoubt)}
                </td>
                <td className="p-3 text-base font-bold">
                  {row.reviewComparisonBasisLabel || "N/A"}
                </td>
                <td className="p-3 text-right font-bold">
                  <div className="text-2xl">
                    {formatNumber(row.reviewComparisonHi)}
                  </div>
                  <div className="mt-1 text-sm font-medium text-gray-500">
                    {row.reviewComparisonBasisLabel}
                  </div>
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.last20GeneralPlayHi)}
                </td>
                <td className="border-x-2 border-red-200 bg-red-50 p-3 text-right text-3xl font-black text-red-700">
                  {formatNumber(row.competitionVsOverallGap)}
                </td>
                <td className="p-3 text-center text-2xl font-bold">
                  {formatBoolean(row.strokeDiscrepancyThresholdMet)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.competitionVsGoodrichGeneralGap)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.evidenceSensitivity)}
                </td>
                <td className="p-3 text-right text-2xl font-black">
                  {formatNumber(row.decision.suggestedIndex)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatInteger(row.strokeDiscrepancyPoints)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatInteger(row.goodrichComparisonPoints)}
                </td>
                <td className="p-3 text-lg font-bold">
                  <Link
                    href={`/audit/${row.id}`}
                    className={`inline-flex rounded-lg px-3 py-2 ${decisionClass(
                      row.decision.code
                    )}`}
                  >
                    {row.decision.label}
                  </Link>
                </td>
                <td className="p-3 text-right text-2xl font-bold">{row.competitionRounds}</td>
                <td className="p-3 text-right text-2xl font-bold">{row.casualRounds}</td>
                <td className="p-3 text-right text-2xl font-bold">{row.totalRounds}</td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.competitionAvgDiff)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.casualAvgDiff)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.competitionScoringAverage)}
                </td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.casualScoringAverage)}
                </td>

                <td className="p-3 text-xl font-bold">
                  <span
                    className={`rounded-full px-3 py-1 ${confidenceClass(
                      row.confidence
                    )}`}
                  >
                    {row.confidence}
                  </span>
                </td>

                <td className="p-3 text-xl font-bold">
                  <span className={`rounded-full px-3 py-1 ${flagClass(row.flag)}`}>
                    {row.flag}
                  </span>
                </td>

                <td className="p-3 text-xl font-medium text-gray-800">{row.reasons.join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 space-y-5 lg:hidden">
        {rows.map((row, index) => (
          <article
            key={row.id}
            className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-gray-500">#{index + 1}</div>

                <div className="text-2xl font-bold text-gray-950">
                  {row.full_name}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Link href={`/players/${row.id}`} className={ACTION_BUTTON}>
                    Player
                  </Link>

                  <Link href={`/audit/${row.id}`} className={ACTION_BUTTON}>
                    Audit
                  </Link>

                  <AuditChangeEmailButton row={row} />
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${flagClass(
                      row.flag
                    )}`}
                  >
                    {row.flag}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClass(
                      row.confidence
                    )}`}
                  >
                    {row.confidence} Confidence
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-gray-500">
                  Sandbag Score
                </div>
                <div className="text-4xl font-bold text-gray-950">
                  {row.sandbagIndex}
                </div>
              </div>
            </div>

            <Section title="Evidence Inputs">
              <MobileStat label="Current HI" value={formatNumber(row.overallHi)} />
              <MobileStat
                label="Last 20 Competition HI"
                value={formatNumber(row.last20CompetitionHi)}
              />
              <MobileStat
                label="Evidence Window Starts"
                value={row.evidenceCutoffDate || "N/A"}
              />
              <MobileStat
                label="Last 12 Months Competition HI"
                value={formatNumber(row.last12MonthsCompetitionHi)}
              />
              <MobileStat
                label="Last 12 Months Competition Rounds"
                value={formatInteger(row.last12MonthsCompetitionRounds)}
              />
              <MobileStat
                label="24-Month Goodrich Competition HI"
                value={formatNumber(row.goodrichCompetition24MonthsHi)}
              />
              <MobileStat
                label="24-Month Goodrich Competition Rounds"
                value={formatInteger(row.goodrichCompetition24MonthsRounds)}
              />
              <MobileStat
                label="24-Month All Competition HI"
                value={formatNumber(row.allCompetition24MonthsHi)}
              />
              <MobileStat
                label="24-Month All Competition Rounds"
                value={formatInteger(row.allCompetition24MonthsRounds)}
              />
              <MobileStat
                label="Last-10 Goodrich General HI"
                value={formatNumber(row.goodrichGeneralLast10Hi)}
              />
              <MobileStat
                label="Goodrich General Rounds Used"
                value={formatInteger(row.goodrichGeneralLast10Rounds)}
              />
              <MobileStat
                label="Last 20 General Play HI"
                value={formatNumber(row.last20GeneralPlayHi)}
              />
            </Section>

            <Section title="Evidence Equation and Selection">
              <MobileStat
                label="Competition HI Input"
                value={formatNumber(row.competitionHiForComparison)}
              />
              <MobileStat
                label="Competition Weight"
                value={formatWeight(row.evidenceCompetitionWeight)}
              />
              <MobileStat
                label="General-Play Weight"
                value={formatWeight(row.evidenceGeneralWeight)}
              />
              <MobileStat
                label="Two-Year Committee Evidence HI"
                value={formatNumber(row.committeeEvidenceHi)}
              />
              <MobileStat
                label="Evidence Basis"
                value={row.committeeEvidenceBasisLabel || "N/A"}
                wide
              />
              <MobileStat
                label="Evidence Basis Code"
                value={row.committeeEvidenceBasis || "N/A"}
                wide
              />
              <MobileStat
                label="Evidence Formula"
                value={row.committeeEvidenceFormula || "N/A"}
                wide
              />
              <MobileStat
                label="Benefit-of-Doubt Rule Applied"
                value={formatBoolean(row.reviewUsedBenefitOfDoubt)}
              />
              <MobileStat
                label="Conservative Review Source"
                value={row.reviewComparisonBasisLabel || "N/A"}
                wide
              />
              <MobileStat
                label="Conservative Review HI"
                value={formatNumber(row.reviewComparisonHi)}
              />
              <MobileStat
                label="Single-Low-Score Sensitivity"
                value={formatNumber(row.evidenceSensitivity)}
              />
            </Section>

            <Section title="Calculated Results">
              <MobileStat
                label="Stroke Discrepancy"
                value={formatNumber(row.competitionVsOverallGap)}
              />
              <MobileStat
                label="2.0-Stroke Threshold Met"
                value={formatBoolean(row.strokeDiscrepancyThresholdMet)}
              />
              <MobileStat
                label="Goodrich General vs Competition Gap"
                value={formatNumber(row.competitionVsGoodrichGeneralGap)}
              />
              <MobileStat
                label="Suggested Committee HI"
                value={formatNumber(row.decision.suggestedIndex)}
              />
              <MobileStat
                label="Stroke Discrepancy Points"
                value={formatInteger(row.strokeDiscrepancyPoints)}
              />
              <MobileStat
                label="Goodrich Comparison Points"
                value={formatInteger(row.goodrichComparisonPoints)}
              />
              <MobileStat
                label="Sandbag Score"
                value={formatInteger(row.sandbagIndex)}
              />
            </Section>

            <div
              className={`mt-4 rounded-xl p-4 ${decisionClass(
                row.decision.code
              )}`}
            >
              <div className="text-sm font-black uppercase tracking-wide">
                Committee Decision
              </div>
              <div className="mt-1 text-xl font-black">
                {row.decision.label}
              </div>
              <p className="mt-2 text-base font-medium">
                {row.decision.summary}
              </p>
              <Link
                href={`/audit/${row.id}`}
                className="mt-3 inline-flex font-bold underline"
              >
                Review decision details
              </Link>
            </div>

            <Section title="Official Handicap Round Counts">
              <MobileStat label="Competition Rounds" value={formatInteger(row.competitionRounds)} />
              <MobileStat label="General Play Rounds" value={formatInteger(row.casualRounds)} />
              <MobileStat label="Total Rounds" value={formatInteger(row.totalRounds)} />
              <MobileStat
                label="Competition Avg Differential"
                value={formatNumber(row.competitionAvgDiff)}
              />
              <MobileStat
                label="General Play Avg Differential"
                value={formatNumber(row.casualAvgDiff)}
              />
              <MobileStat
                label="Competition Avg Score"
                value={formatNumber(row.competitionScoringAverage)}
              />
              <MobileStat
                label="General Play Avg Score"
                value={formatNumber(row.casualScoringAverage)}
              />
            </Section>

            <div className="mt-4 rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-bold uppercase text-gray-500">
                Reason
              </div>
              <p className="mt-1 text-sm font-medium text-gray-800">
                {row.reasons.join(" ")}
              </p>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

function AuditChangeEmailButton({ row }: { row: AuditRow }) {
  if (!shouldShowPrepareEmail(row.decision)) {
    return <span aria-hidden="true" />;
  }

  return (
    <PrepareEmailButton
      playerId={row.id}
      playerName={row.full_name}
      currentIndex={row.overallHi}
      evidenceIndex={row.reviewComparisonHi}
      evidenceGap={row.competitionVsOverallGap}
      suggestedIndex={row.decision.suggestedIndex}
    />
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      <div className="mt-3 grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function MobileStat({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string | number;
  wide?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-3 ${
        wide ? "col-span-2" : ""
      }`}
    >
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-950">{value}</div>
    </div>
  );
}
