import Link from "next/link";
import { auditService } from "@/services/auditService";
import { ExportAuditPdfButton } from "@/components/audit/ExportAuditPdfButton";

type Period = "last20" | "30" | "60" | "90" | "season";

type PageProps = {
  searchParams?: Promise<{ period?: Period }>;
};

const ACTION_BUTTON =
  "rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700";

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

export default async function AuditPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const period: Period = params.period ?? "last20";
  const rows = await auditService.getAuditRows(period);

  const tabs: { href: string; label: string; value: Period }[] = [
    { href: "/audit?period=last20", label: "Last 20", value: "last20" },
    { href: "/audit?period=30", label: "30 Days", value: "30" },
    { href: "/audit?period=60", label: "60 Days", value: "60" },
    { href: "/audit?period=90", label: "90 Days", value: "90" },
    { href: "/audit?period=season", label: "Season", value: "season" },
  ];

  return (
    <main className="p-4 text-gray-900 lg:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">
            Handicap Audit
          </h1>

          <p className="mt-2 text-sm text-gray-600 lg:text-base">
            Audit view using official GHIN handicap-counting rounds only,
            comparing Overall Handicap Index, Last 20 Competition Handicap
            Index, Last 20 General Play Handicap Index, and scoring gaps.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ExportAuditPdfButton />

          <Link
            href="/audit/committee"
            className="inline-flex w-fit items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
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
                ? "rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 hidden max-h-[75vh] overflow-auto rounded-xl border border-gray-300 bg-white shadow-sm lg:block">
        <table className="w-full min-w-[1700px] text-left text-sm text-gray-900">
          <thead className="sticky top-0 z-20 border-b border-gray-300 bg-gray-200 text-gray-950 shadow-sm">
            <tr>
              <th className="p-3 font-bold">Player</th>
              <th className="p-3 text-right font-bold">Sandbag Score</th>
              <th className="p-3 text-right font-bold">Current Handicap Index</th>
              <th className="p-3 text-right font-bold">Last 20 Competition HI</th>
              <th className="p-3 text-right font-bold">Last 20 General Play HI</th>
              <th className="p-3 text-right font-bold">Competition vs Overall Gap</th>
              <th className="p-3 text-right font-bold">Competition Rounds</th>
              <th className="p-3 text-right font-bold">General Play Rounds</th>
              <th className="p-3 text-right font-bold">Total Handicap Rounds</th>
              <th className="p-3 text-right font-bold">Competition Avg Differential</th>
              <th className="p-3 text-right font-bold">General Play Avg Differential</th>
              <th className="p-3 text-right font-bold">Competition Avg Score</th>
              <th className="p-3 text-right font-bold">General Play Avg Score</th>
              <th className="p-3 font-bold">Confidence</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold">Reason</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-200 hover:bg-blue-50">
                <td className="p-3 font-bold">
                  <div className="flex items-center gap-2">
                    <span>{row.full_name}</span>

                    <Link href={`/players/${row.id}`} className={ACTION_BUTTON}>
                      Player
                    </Link>

                    <Link href={`/audit/${row.id}`} className={ACTION_BUTTON}>
                      Audit
                    </Link>
                  </div>
                </td>

                <td className="p-3 text-right font-bold">{row.sandbagIndex}</td>
                <td className="p-3 text-right">{formatNumber(row.overallHi)}</td>
                <td className="p-3 text-right font-bold">
                  {formatNumber(row.last20CompetitionHi)}
                </td>
                <td className="p-3 text-right">
                  {formatNumber(row.last20GeneralPlayHi)}
                </td>
                <td className="p-3 text-right font-bold">
                  {formatNumber(row.competitionVsOverallGap)}
                </td>
                <td className="p-3 text-right">{row.competitionRounds}</td>
                <td className="p-3 text-right">{row.casualRounds}</td>
                <td className="p-3 text-right">{row.totalRounds}</td>
                <td className="p-3 text-right">
                  {formatNumber(row.competitionAvgDiff)}
                </td>
                <td className="p-3 text-right">
                  {formatNumber(row.casualAvgDiff)}
                </td>
                <td className="p-3 text-right">
                  {formatNumber(row.competitionScoringAverage)}
                </td>
                <td className="p-3 text-right">
                  {formatNumber(row.casualScoringAverage)}
                </td>

                <td className="p-3 font-bold">
                  <span
                    className={`rounded-full px-3 py-1 ${confidenceClass(
                      row.confidence
                    )}`}
                  >
                    {row.confidence}
                  </span>
                </td>

                <td className="p-3 font-bold">
                  <span className={`rounded-full px-3 py-1 ${flagClass(row.flag)}`}>
                    {row.flag}
                  </span>
                </td>

                <td className="p-3 text-gray-800">{row.reasons.join(" ")}</td>
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

                <div className="text-xl font-bold text-gray-950">
                  {row.full_name}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Link href={`/players/${row.id}`} className={ACTION_BUTTON}>
                    Player
                  </Link>

                  <Link href={`/audit/${row.id}`} className={ACTION_BUTTON}>
                    Audit
                  </Link>
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
                label="Last 20 General Play HI"
                value={formatNumber(row.last20GeneralPlayHi)}
              />
              <MobileStat
                label="Comp vs Overall Gap"
                value={formatNumber(row.competitionVsOverallGap)}
              />
            </Section>

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