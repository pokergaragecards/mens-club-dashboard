import { GhinImportForm } from "@/components/import/GhinImportForm";
import { HoleByHoleImportForm } from "@/components/import/HoleByHoleImportForm";
import { ScoresPostedImportForm } from "@/components/import/ScoresPostedImportForm";

export default function ImportPage() {
  return (
    <div className="space-y-6 p-4 text-gray-900 md:p-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-950">Import Center</h1>
        <p className="mt-1 text-base font-medium text-gray-700">
          Upload weekly GHIN reports, legacy GHIN exports, and Goodrich
          hole-by-hole reports.
        </p>
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Weekly Scores Posted Report
        </h2>

        <p className="mt-2 text-sm text-gray-700">
          Main weekly update for players, handicaps, posted rounds,
          differentials, course ratings, slope ratings, PCC, and course names.
        </p>

        <div className="mt-4">
          <ScoresPostedImportForm />
        </div>
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          Goodrich Hole-by-Hole PDF
        </h2>

        <p className="mt-2 text-sm text-gray-700">
          Imports Goodrich hole-by-hole scoring for hole stats, birdie/par/bogey
          rates, and player hole profiles.
        </p>

        <div className="mt-4">
          <HoleByHoleImportForm />
        </div>
      </div>

      <div className="rounded-xl border border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-950">
          GHIN Score Export Legacy
        </h2>

        <p className="mt-2 text-sm text-gray-700">
          Legacy player score-history import. Use the Weekly Scores Posted
          Report as the primary update going forward.
        </p>

        <div className="mt-4">
          <GhinImportForm />
        </div>
      </div>
    </div>
  );
}