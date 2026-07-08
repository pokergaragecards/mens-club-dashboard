import Link from "next/link";
import { auditService } from "@/services/auditService";

type Period = "last20" | "30" | "60" | "90" | "season";

type PageProps = {
  searchParams?: Promise<{ period?: Period }>;
};

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
      <h1 className="text-2xl font-bold text-gray-950 lg:text-3xl">
        Handicap Audit
      </h1>

      <p className="mt-1 text-sm font-medium text-gray-700 lg:text-base">
        Audit view comparing Overall HI, Last 20 Competition HI, Last 20 General
        Play HI, and scoring gaps.
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2 lg:flex-wrap">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.href}
            className={
              period === tab.value
                ? "whitespace-nowrap rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white"
                : "whitespace-nowrap rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-100"
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="mt-5 space-y-5 lg:hidden">
        {rows.map((row, index) => (
          <article
            key={row.id}
            className="rounded-2xl border border-gray-300 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-gray-500">
                  #{index + 1}
                </div>

                <Link
                  href={`/players/${row.id}`}
                  className="text-xl font-bold text-blue-800 hover:underline"
                >
                  {row.full_name}
                </Link>

                <div className="mt-2">
                  <Link
                    href={`/audit/${row.id}`}
                    className="inline-block rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-800 hover:bg-gray-100"
                  >
                    Audit Player
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
                  Sandbag Index
                </div>
                <div className="text-4xl font-bold text-gray-950">
                  {row.sandbagIndex}
                </div>
              </div>
            </div>

            <Section title="Handicap Index Comparison">
              <MobileStat label="Overall HI" value={formatNumber(row.overallHi)} />
              <MobileStat
                label="Last 20 Comp HI"
                value={formatNumber(row.last20CompetitionHi)}
              />
              <MobileStat
                label="Last 20 GP HI"
                value={formatNumber(row.last20GeneralPlayHi)}
              />
              <MobileStat
                label="Comp vs Overall"
                value={formatNumber(row.competitionVsOverallGap)}
              />
            </Section>

            <Section title="Round Counts">
              <MobileStat label="Comp Rounds" value={row.competitionRounds} />
              <MobileStat label="Casual Rounds" value={row.casualRounds} />
              <MobileStat label="Total Rounds" value={row.totalRounds} />
              <MobileStat
                label="Comp Avg Diff"
                value={formatNumber(row.competitionAvgDiff)}
              />
            </Section>

            <Section title="Scoring Average">
              <MobileStat
                label="Comp Avg Score"
                value={formatNumber(row.competitionScoringAverage)}
              />
              <MobileStat
                label="Casual Avg Score"
                value={formatNumber(row.casualScoringAverage)}
              />
              <MobileStat
                label="Casual Avg Diff"
                value={formatNumber(row.casualAvgDiff)}
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

      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-gray-300 bg-white shadow-sm lg:block">
        <table className="w-full min-w-[1550px] text-left text-sm text-gray-900">
          <thead className="border-b border-gray-300 bg-gray-200 text-gray-950">
            <tr>
              <th className="p-3 font-bold">Player</th>
              <th className="p-3 text-right font-bold">Sandbag</th>
              <th className="p-3 text-right font-bold">Overall HI</th>
              <th className="p-3 text-right font-bold">Last 20 Comp HI</th>
              <th className="p-3 text-right font-bold">Last 20 GP HI</th>
              <th className="p-3 text-right font-bold">Gap</th>
              <th className="p-3 text-right font-bold">Comp Rds</th>
              <th className="p-3 text-right font-bold">Casual Rds</th>
              <th className="p-3 text-right font-bold">Total Rds</th>
              <th className="p-3 text-right font-bold">Comp Avg Diff</th>
              <th className="p-3 text-right font-bold">Casual Avg Diff</th>
              <th className="p-3 text-right font-bold">Comp Score</th>
              <th className="p-3 text-right font-bold">Casual Score</th>
              <th className="p-3 font-bold">Confidence</th>
              <th className="p-3 font-bold">Flag</th>
              <th className="p-3 font-bold">Reason</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gray-200 hover:bg-blue-50"
              >
                <td className="p-3 font-bold">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/players/${row.id}`}
                      className="text-blue-800 hover:underline"
                    >
                      {row.full_name}
                    </Link>

                    <Link
                      href={`/audit/${row.id}`}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-800 hover:bg-gray-100"
                    >
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
                  <span
                    className={`rounded-full px-3 py-1 ${flagClass(row.flag)}`}
                  >
                    {row.flag}
                  </span>
                </td>

                <td className="p-3 text-gray-800">{row.reasons.join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
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