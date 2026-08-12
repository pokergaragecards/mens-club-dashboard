import { TeamEstimatorBuilder } from "@/components/team-estimator/TeamEstimatorBuilder";
import { getTeamEventPlayerOptions } from "@/services/teamEventEstimatorService";

export const dynamic = "force-dynamic";

export default async function TeamEstimatorPage() {
  const players = await getTeamEventPlayerOptions();

  return (
    <main className="p-4 text-slate-900 md:p-8">
      <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
        Team Event Modeling
      </p>
      <h1 className="mt-1 text-3xl font-black text-slate-950 md:text-4xl">
        Best 3-of-4 Team Betting Estimator
      </h1>
      <p className="mt-3 max-w-4xl text-base font-medium leading-7 text-slate-700">
        Assemble four-player teams, then simulate a full 18-hole event where
        each team discards its highest ball and keeps its three lowest balls on
        every hole. Those 18 hole totals create the final aggregate team score,
        and the rankings start with the highest modeled chance of winning.
        Every player can play from a different Goodrich tee.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoCard
          label="Format"
          value="Four players; best three balls count on every hole"
        />
        <InfoCard
          label="Primary Inputs"
          value="Each player's tee, Competition HI, tee rating/slope, and 12-month Goodrich hole history"
        />
        <InfoCard
          label="Outputs"
          value="Win chance, top-three chance, estimated score, and likely range"
        />
      </div>

      <TeamEstimatorBuilder players={players} />
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-base font-bold leading-6 text-slate-950">
        {value}
      </div>
    </div>
  );
}
