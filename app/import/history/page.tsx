import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function ImportHistoryPage() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("import_history")
    .select("*")
    .limit(100);

  if (error) {
    return <div className="p-8 font-bold text-red-700">{error.message}</div>;
  }

  return (
    <div className="p-8 text-gray-900">
      <h1 className="text-3xl font-bold text-gray-950">Import History</h1>
      <p className="mt-1 text-sm font-medium text-gray-700">
        Recent GHIN and hole-by-hole imports.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-200 text-gray-950">
            <tr>
              <th className="p-3 font-bold">Date</th>
              <th className="p-3 font-bold">Source</th>
              <th className="p-3 font-bold">File</th>
              <th className="p-3 text-right font-bold">Imported</th>
              <th className="p-3 text-right font-bold">Skipped</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((row) => (
              <tr key={row.id} className="border-t border-gray-200 hover:bg-blue-50">
                <td className="p-3 font-medium">
                  {new Date(row.imported_at).toLocaleString()}
                </td>
                <td className="p-3 font-bold">{row.source}</td>
                <td className="p-3 font-medium">{row.file_name}</td>
                <td className="p-3 text-right font-medium">{row.rows_imported}</td>
                <td className="p-3 text-right font-medium">{row.rows_skipped}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}