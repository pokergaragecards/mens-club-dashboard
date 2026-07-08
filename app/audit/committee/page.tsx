import Link from "next/link";
import { auditService } from "@/services/auditService";

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toFixed(decimals);
}

function suggestedChange(overallHi: number | null, compHi: number | null) {
  if (overallHi == null || compHi == null) return null;
  return compHi - overallHi;
}

export default async function CommitteeAuditPage() {
  const rows = await auditService.getAuditRows("last20");

  const flagged = rows.filter(
    (row) => row.flag === "Investigate" || row.flag === "Review"
  );

  return (
    <main className="p-4 text-gray-900 lg:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/audit" className="font-bold text-blue-800 hover:underline">
            ← Back to Audit
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-gray-950">
            Committee Handicap Audit
          </h1>

          <p className="mt-1 text-sm font-medium text-gray-700">
            Starting recommendations for players flagged as Investigate or Review.
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-300 bg-white shadow-sm">
        <table className="w-full min-w-[1200px] text-left text-sm text-gray-900">
          <thead className="border-b border-gray-300 bg-gray-200 text-gray-950">
            <tr>
              <th className="p-3 font-bold">Player</th>
              <th className="p-3 text-right font-bold">Current HI</th>
              <th className="p-3 text-right font-bold">Last 20 Comp HI</th>
              <th className="p-3 text-right font-bold">Last 20 GP HI</th>
              <th className="p-3 text-right font-bold">Suggested HI</th>
              <th className="p-3 text-right font-bold">Change</th>
              <th className="p-3 text-right font-bold">Comp Rds</th>
              <th className="p-3 text-right font-bold">Casual Rds</th>
              <th className="p-3 font-bold">Flag</th>
              <th className="p-3 font-bold">Reason</th>
            </tr>
          </thead>

          <tbody>
            {flagged.map((row) => {
              const change = suggestedChange(row.overallHi, row.last20CompetitionHi);

              return (
                <tr key={row.id} className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="p-3 font-bold">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/audit/${row.id}`}
                        className="text-blue-800 hover:underline"
                      >
                        {row.full_name}
                      </Link>

                      <Link
                        href={`/players/${row.id}`}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-bold text-gray-800 hover:bg-gray-100"
                      >
                        Player
                      </Link>
                    </div>
                  </td>

                  <td className="p-3 text-right">{formatNumber(row.overallHi)}</td>

                  <td className="p-3 text-right font-bold">
                    {formatNumber(row.last20CompetitionHi)}
                  </td>

                  <td className="p-3 text-right">
                    {formatNumber(row.last20GeneralPlayHi)}
                  </td>

                  <td className="p-3 text-right font-black">
                    {formatNumber(row.last20CompetitionHi)}
                  </td>

                  <td className="p-3 text-right font-bold">
                    {change == null ? "-" : formatNumber(change)}
                  </td>

                  <td className="p-3 text-right">{row.competitionRounds}</td>
                  <td className="p-3 text-right">{row.casualRounds}</td>

                  <td className="p-3 font-bold">{row.flag}</td>

                  <td className="p-3 text-gray-800">
                    {row.reasons.join(" ")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}