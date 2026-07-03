import Link from "next/link";
import { auditService } from "@/services/auditService";

type SearchParams = {
  period?: "30" | "60" | "90" | "season";
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
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
  const period = params.period ?? "season";
  const rows = await auditService.getAuditRows(period);

  const tabs = [
    { href: "/audit?period=30", label: "30 Days", value: "30" },
    { href: "/audit?period=60", label: "60 Days", value: "60" },
    { href: "/audit?period=90", label: "90 Days", value: "90" },
    { href: "/audit?period=season", label: "Season", value: "season" },
  ];

  return (
    <main className="p-4 text-gray-900 md:p-8">
      <h1 className="text-2xl font-bold text-gray-950 md:text-3xl">
        Handicap Audit
      </h1>

      <p className="mt-1 text-sm font-medium text-gray-700 md:text-base">
        Sandbag Index based on competition/casual and Goodrich/other course scoring gaps.
      </p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 md:mt-6 md:flex-wrap">
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

      <div className="mt-5 space-y-4 md:hidden">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link
                  href={`/players/${row.id}`}
                  className="text-lg font-bold text-blue-800 hover:underline"
                >
                  {row.full_name}
                </Link>
                <div className="mt-1 text-sm text-gray-600">
                  {row.totalRounds} rounds · {row.confidence} confidence
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-bold text-gray-600">
                  Sandbag
                </div>
                <div className="text-3xl font-bold text-gray-950">
                  {row.sandbagIndex}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${flagClass(row.flag)}`}>
                {row.flag}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClass(row.confidence)}`}>
                {row.confidence}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <MobileStat label="Comp Avg" value={formatNumber(row.compAvg)} />
              <MobileStat label="Casual Avg" value={formatNumber(row.casualAvg)} />
              <MobileStat label="Comp Pts" value={row.compPoints} />
              <MobileStat label="Goodrich Avg" value={formatNumber(row.goodrichAvg)} />
              <MobileStat label="Other Avg" value={formatNumber(row.otherAvg)} />
              <MobileStat label="Goodrich Pts" value={row.goodrichPoints} />
            </div>

            <p className="mt-4 text-sm font-medium text-gray-700">
              {row.reasons.join(" ")}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 hidden overflow-x-auto rounded-xl border border-gray-300 bg-white shadow-sm md:block">
        <table className="w-full min-w-[1100px] text-left text-sm text-gray-900">
          <thead className="border-b border-gray-300 bg-gray-200 text-gray-950">
            <tr>
              <th className="p-3 font-bold">Player</th>
              <th className="p-3 text-right font-bold">Sandbag Index</th>
              <th className="p-3 text-right font-bold">Rounds</th>
              <th className="p-3 font-bold">Confidence</th>
              <th className="p-3 font-bold">Flag</th>
              <th className="p-3 text-right font-bold">Comp Avg</th>
              <th className="p-3 text-right font-bold">Casual Avg</th>
              <th className="p-3 text-right font-bold">Comp Pts</th>
              <th className="p-3 text-right font-bold">Goodrich Avg</th>
              <th className="p-3 text-right font-bold">Other Avg</th>
              <th className="p-3 text-right font-bold">Goodrich Pts</th>
              <th className="p-3 font-bold">Reason</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-200 hover:bg-blue-50">
                <td className="p-3 font-bold">
                  <Link href={`/players/${row.id}`} className="text-blue-800 hover:underline">
                    {row.full_name}
                  </Link>
                </td>
                <td className="p-3 text-right font-bold">{row.sandbagIndex}</td>
                <td className="p-3 text-right font-medium">{row.totalRounds}</td>
                <td className="p-3 font-bold">
                  <span className={`rounded-full px-3 py-1 ${confidenceClass(row.confidence)}`}>
                    {row.confidence}
                  </span>
                </td>
                <td className="p-3 font-bold">
                  <span className={`rounded-full px-3 py-1 ${flagClass(row.flag)}`}>
                    {row.flag}
                  </span>
                </td>
                <td className="p-3 text-right">{formatNumber(row.compAvg)}</td>
                <td className="p-3 text-right">{formatNumber(row.casualAvg)}</td>
                <td className="p-3 text-right font-bold">{row.compPoints}</td>
                <td className="p-3 text-right">{formatNumber(row.goodrichAvg)}</td>
                <td className="p-3 text-right">{formatNumber(row.otherAvg)}</td>
                <td className="p-3 text-right font-bold">{row.goodrichPoints}</td>
                <td className="p-3 text-gray-800">{row.reasons.join(" ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
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
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="text-xs font-bold text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-950">{value}</div>
    </div>
  );
}