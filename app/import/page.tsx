export default function ImportPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Import Center</h1>
      <p className="mt-1 text-gray-600">
        Upload GHIN exports, event results, and hole-by-hole scores.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">GHIN Score Export</h2>
          <p className="mt-2 text-sm text-gray-600">
            Import player score history from GHIN/Admin Portal exports.
          </p>
          <button className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">
            Coming Next
          </button>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Event Results</h2>
          <p className="mt-2 text-sm text-gray-600">
            Import weekly league results, net winners, skins, and payouts.
          </p>
          <button className="mt-4 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
            Later
          </button>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Hole Scores</h2>
          <p className="mt-2 text-sm text-gray-600">
            Import hole-by-hole scoring for detailed player and course analysis.
          </p>
          <button className="mt-4 rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700">
            Later
          </button>
        </div>
      </div>
    </div>
  );
}