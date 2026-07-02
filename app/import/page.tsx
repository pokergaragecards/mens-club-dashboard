import { GhinImportForm } from "@/components/import/GhinImportForm";
import { HoleByHoleImportForm } from "@/components/import/HoleByHoleImportForm";

export default function ImportPage() {
  return (
    <div className="p-8 text-gray-900 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-950">Import Center</h1>
        <p className="mt-1 text-base font-medium text-gray-700">
          Upload GHIN exports and hole-by-hole reports.
        </p>
      </div>

      {/* GHIN Excel Import */}

      <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          GHIN Score Export
        </h2>

        <p className="mt-2 text-sm text-gray-700">
          Import player score history from GHIN Excel exports.
        </p>

        <div className="mt-4">
          <GhinImportForm />
        </div>
      </div>

      {/* Hole-by-Hole PDF Import */}

      <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Hole-by-Hole PDF Report
        </h2>

        <p className="mt-2 text-sm text-gray-700">
          Import the Goodrich hole-by-hole PDF report.
        </p>

        <div className="mt-4">
          <HoleByHoleImportForm />
        </div>
      </div>
    </div>
  );
}