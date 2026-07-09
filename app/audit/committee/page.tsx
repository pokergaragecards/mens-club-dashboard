import Link from "next/link";
import { auditService } from "@/services/auditService";

const ACTION_BUTTON =
  "rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700";

function formatNumber(value: unknown, decimals = 1) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return "-";
  return number.toFixed(decimals);
}

function formatChange(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const formatted = value.toFixed(1);
  return value > 0 ? `+${formatted}` : formatted;
}

function suggestedChange(overallHi: number | null, suggestedHi: number | null) {
  if (overallHi == null || suggestedHi == null) return null;
  return suggestedHi - overallHi;
}

function flagClass(flag: string) {
  if (flag === "Investigate") return "bg-red-200 text-red-900";
  if (flag === "Review") return "bg-orange-100 text-orange-900";
  return "bg-yellow-100 text-yellow-900";
}

export default async function CommitteeAuditPage() {
  const rows = await auditService.getAuditRows("last20");

  const flagged = rows.filter(
    (row) => row.flag === "Investigate" || row.flag === "Review"
  );

  return (
    <main className="p-4 text-gray-900 lg:p-8">
      <div>
        <Link href="/audit" className="font-bold text-blue-800 hover:underline">
          ← Back to Audit
        </Link>

        <h1 className="mt-4 text-3xl font-bold text-gray-950">
          Committee Handicap Audit
        </h1>

        <p className="mt-2 text-sm text-gray-600 lg:text-base">
          Starting recommendations for players flagged as Investigate or Review.
          Suggestions are based on official GHIN handicap-counting rounds only,
          with the Suggested HI starting from the player’s Last 20 Competition
          Handicap Index.
        </p>
      </div>

      <div className="mt-6 max-h-[75vh] overflow-auto rounded-xl border border-gray-300 bg-white shadow-sm">
        <table className="w-full min-w-[1450px] text-left text-sm text-gray-900">
          <thead className="sticky top-0 z-20 border-b border-gray-300 bg-gray-200 text-gray-950 shadow-sm">
            <tr>
              <th className="p-3 font-bold">Player</th>
              <th className="p-3 text-right font-bold">Current Handicap Index</th>
              <th className="p-3 text-right font-bold">Last 20 Competition HI</th>
              <th className="p-3 text-right font-bold">Last 20 General Play HI</th>
              <th className="p-3 text-right font-bold">Suggested Committee HI</th>
              <th className="p-3 text-right font-bold">Suggested Change</th>
              <th className="p-3 text-right font-bold">Sandbag Score</th>
              <th className="p-3 text-right font-bold">Competition Rounds</th>
              <th className="p-3 text-right font-bold">General Play Rounds</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold">Reason</th>
            </tr>
          </thead>

          <tbody>
            {flagged.map((row) => {
              const suggestedHi = row.last20CompetitionHi;
              const change = suggestedChange(row.overallHi, suggestedHi);

              return (
                <tr
                  key={row.id}
                  className="border-b border-gray-200 hover:bg-blue-50"
                >
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

                  <td className="p-3 text-right">
                    {formatNumber(row.overallHi)}
                  </td>

                  <td className="p-3 text-right font-bold">
                    {formatNumber(row.last20CompetitionHi)}
                  </td>

                  <td className="p-3 text-right">
                    {formatNumber(row.last20GeneralPlayHi)}
                  </td>

                  <td className="p-3 text-right font-black">
                    {formatNumber(suggestedHi)}
                  </td>

                  <td className="p-3 text-right font-bold">
                    {formatChange(change)}
                  </td>

                  <td className="p-3 text-right font-bold">
                    {row.sandbagIndex}
                  </td>

                  <td className="p-3 text-right">{row.competitionRounds}</td>
                  <td className="p-3 text-right">{row.casualRounds}</td>

                  <td className="p-3 font-bold">
                    <span
                      className={`rounded-full px-3 py-1 ${flagClass(row.flag)}`}
                    >
                      {row.flag}
                    </span>
                  </td>

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