import Link from "next/link";
import { auditService } from "@/services/auditService";
import { ExportAuditPdfButton } from "@/components/audit/ExportAuditPdfButton";
import { ExportCompetitionChokersPdfButton } from "@/components/audit/ExportCompetitionChokersPdfButton";
import { PrepareEmailButton } from "@/components/audit/PrepareEmailButton";
import { shouldShowPrepareEmail } from "@/lib/auditEmailEligibility";

type Period = "last20" | "30" | "60" | "90" | "season";

type PageProps = {
  searchParams?: Promise<{ period?: Period }>;
};

const ACTION_BUTTON =
  "inline-flex min-h-10 w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700";
const MANUAL_EMAIL_PLAYER_IDS = new Set([
  "d32518c3-09fc-412c-9555-9f4fa6513b98",
]);

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toFixed(decimals);
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

function decisionPriority(code: string) {
  if (
    code === "adjustment_supported" ||
    code === "provisional_adjustment" ||
    code === "manual_review"
  ) {
    return 0;
  }

  if (code === "monitor") return 1;
  return 2;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const period: Period = params.period ?? "last20";
  const rows = [...(await auditService.getAuditRows(period))].sort((a, b) => {
    const priorityDifference =
      decisionPriority(a.decision.code) - decisionPriority(b.decision.code);

    if (priorityDifference !== 0) return priorityDifference;

    const aGap = a.competitionVsOverallGap ?? Number.NEGATIVE_INFINITY;
    const bGap = b.competitionVsOverallGap ?? Number.NEGATIVE_INFINITY;

    if (aGap !== bGap) return bGap - aGap;
    return a.full_name.localeCompare(b.full_name);
  });

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
            Evidence HI.
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

      <div className="mt-6 hidden max-h-[75vh] overflow-auto rounded-xl border border-gray-300 bg-white shadow-sm lg:block">
        <table className="w-full min-w-[4450px] text-left text-base text-gray-900">
          <thead className="sticky top-0 z-20 border-b border-gray-300 bg-gray-200 text-gray-950 shadow-sm">
            <tr>
              <th className="min-w-[540px] p-4 text-base font-bold leading-snug">
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
              <th className="min-w-[280px] p-4 text-right text-base font-bold leading-snug">
                Conservative Committee Review HI
              </th>
              <th className="min-w-[250px] p-4 text-right text-base font-bold leading-snug">
                Last 20 General Play HI
              </th>
              <th className="min-w-[280px] border-x-2 border-red-300 bg-red-100 p-4 text-right text-base font-bold leading-snug text-red-800">
                Evidence HI vs Overall Gap
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
              <tr key={row.id} className="border-b border-gray-200 hover:bg-blue-50">
                <td className="min-w-[540px] p-3 font-bold">
                  <div className="grid grid-cols-[minmax(190px,1fr)_80px_80px_140px] items-center gap-3">
                    <span className="text-2xl">{row.full_name}</span>

                    <Link href={`/players/${row.id}`} className={ACTION_BUTTON}>
                      Player
                    </Link>

                    <Link href={`/audit/${row.id}`} className={ACTION_BUTTON}>
                      Audit
                    </Link>

                    {MANUAL_EMAIL_PLAYER_IDS.has(row.id) &&
                    row.decision.code === "manual_review" ? (
                      <span className="inline-flex min-h-10 items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-center text-sm font-semibold text-amber-800">
                        Manual Exception
                      </span>
                    ) : shouldShowPrepareEmail(row.decision) ? (
                      <PrepareEmailButton
                        playerId={row.id}
                        playerName={row.full_name}
                        currentIndex={row.overallHi}
                        evidenceIndex={row.reviewComparisonHi}
                        evidenceGap={row.competitionVsOverallGap}
                      />
                    ) : (
                      <span aria-hidden="true" />
                    )}
                  </div>
                </td>

                <td className="p-3 text-right text-2xl font-black">{row.sandbagIndex}</td>
                <td className="p-3 text-right text-2xl font-bold">{formatNumber(row.overallHi)}</td>
                <td className="p-3 text-right text-2xl font-bold">
                  {formatNumber(row.last20CompetitionHi)}
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

                  {MANUAL_EMAIL_PLAYER_IDS.has(row.id) &&
                  row.decision.code === "manual_review" ? (
                    <span className="inline-flex min-h-10 items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-center text-sm font-semibold text-amber-800">
                      Manual Exception
                    </span>
                  ) : shouldShowPrepareEmail(row.decision) ? (
                    <PrepareEmailButton
                      playerId={row.id}
                      playerName={row.full_name}
                      currentIndex={row.overallHi}
                      evidenceIndex={row.reviewComparisonHi}
                      evidenceGap={row.competitionVsOverallGap}
                    />
                  ) : (
                    <span aria-hidden="true" />
                  )}
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

            <Section title="Handicap Index Comparison">
              <MobileStat label="Current HI" value={formatNumber(row.overallHi)} />
              <MobileStat
                label="Last 20 Competition HI"
                value={formatNumber(row.last20CompetitionHi)}
              />
              <MobileStat
                label="Conservative Committee Review HI"
                value={formatNumber(row.reviewComparisonHi)}
              />
              <MobileStat
                label="Last 20 General Play HI"
                value={formatNumber(row.last20GeneralPlayHi)}
              />
              <MobileStat
                label="Evidence vs Overall Gap"
                value={formatNumber(row.competitionVsOverallGap)}
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
              <MobileStat label="Competition Rounds" value={row.competitionRounds} />
              <MobileStat label="General Play Rounds" value={row.casualRounds} />
              <MobileStat label="Total Rounds" value={row.totalRounds} />
              <MobileStat
                label="Comp Avg Diff"
                value={formatNumber(row.competitionAvgDiff)}
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
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-950">{value}</div>
    </div>
  );
}
