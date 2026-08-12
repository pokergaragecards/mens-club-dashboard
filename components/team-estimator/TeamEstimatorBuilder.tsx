"use client";

import { useMemo, useRef, useState } from "react";

import type {
  TeamEventEstimateRequest,
  TeamEventEstimateResponse,
  TeamEventPlayerOption,
  TeamEventScoring,
} from "@/lib/teamEventEstimator";

type BuilderTeam = {
  id: string;
  name: string;
  playerIds: [string, string, string, string];
};

const EMPTY_PLAYERS: BuilderTeam["playerIds"] = ["", "", "", ""];

function initialTeams(): BuilderTeam[] {
  return [
    { id: "team-1", name: "Team 1", playerIds: [...EMPTY_PLAYERS] },
    { id: "team-2", name: "Team 2", playerIds: [...EMPTY_PLAYERS] },
  ];
}

function percent(value: number) {
  return `${(value * 100).toFixed(value < 0.1 ? 1 : 0)}%`;
}

function signed(value: number) {
  if (value === 0) return "E";
  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

export function TeamEstimatorBuilder({
  players,
}: {
  players: TeamEventPlayerOption[];
}) {
  const [teams, setTeams] = useState<BuilderTeam[]>(initialTeams);
  const [tee, setTee] = useState<TeamEventEstimateRequest["tee"]>("White");
  const [scoring, setScoring] = useState<TeamEventScoring>("net");
  const [allowance, setAllowance] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<TeamEventEstimateResponse | null>(null);
  const nextTeamNumber = useRef(3);
  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players]
  );

  function changed(mutator: (current: BuilderTeam[]) => BuilderTeam[]) {
    setTeams(mutator);
    setResult(null);
    setError("");
  }

  function addTeam() {
    if (teams.length >= 16) return;
    const teamNumber = nextTeamNumber.current;
    nextTeamNumber.current += 1;
    changed((current) => [
      ...current,
      {
        id: `team-${teamNumber}`,
        name: `Team ${teamNumber}`,
        playerIds: [...EMPTY_PLAYERS],
      },
    ]);
  }

  function removeTeam(teamId: string) {
    if (teams.length <= 2) return;
    changed((current) => current.filter((team) => team.id !== teamId));
  }

  function updateTeamName(teamId: string, name: string) {
    changed((current) =>
      current.map((team) => (team.id === teamId ? { ...team, name } : team))
    );
  }

  function updatePlayer(teamId: string, slot: number, playerId: string) {
    changed((current) =>
      current.map((team) => {
        if (team.id !== teamId) return team;
        const playerIds = [...team.playerIds] as BuilderTeam["playerIds"];
        playerIds[slot] = playerId;
        return { ...team, playerIds };
      })
    );
  }

  function usedByAnotherSlot(playerId: string, teamId: string, slot: number) {
    if (!playerId) return false;
    return teams.some((team) =>
      team.playerIds.some(
        (selected, selectedSlot) =>
          selected === playerId &&
          (team.id !== teamId || selectedSlot !== slot)
      )
    );
  }

  async function calculate() {
    setError("");
    setResult(null);
    const missingTeam = teams.find((team) => team.playerIds.some((id) => !id));
    if (missingTeam) {
      setError(`${missingTeam.name || "A team"} needs four players.`);
      return;
    }
    const allIds = teams.flatMap((team) => team.playerIds);
    if (new Set(allIds).size !== allIds.length) {
      setError("Each player can appear on only one team.");
      return;
    }

    setLoading(true);
    try {
      const request: TeamEventEstimateRequest = {
        tee,
        scoring,
        handicapAllowance: allowance,
        teams: teams.map((team, index) => ({
          id: team.id,
          name: team.name.trim() || `Team ${index + 1}`,
          playerIds: team.playerIds,
        })),
      };
      const response = await fetch("/api/team-estimator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload = (await response.json()) as
        | TeamEventEstimateResponse
        | { error?: string };
      if (!response.ok || !("teams" in payload)) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Unable to calculate the event."
        );
      }
      setResult(payload);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to calculate the event."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="mt-6 rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Goodrich Tee">
            <select
              value={tee}
              onChange={(event) => {
                setTee(event.target.value as TeamEventEstimateRequest["tee"]);
                setResult(null);
              }}
              className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-base font-semibold"
            >
              {(["Red", "Gold", "White", "Blue"] as const).map((value) => (
                <option key={value} value={value}>
                  {value} Tees
                </option>
              ))}
            </select>
          </Field>

          <Field label="Team Scoring">
            <select
              value={scoring}
              onChange={(event) => {
                setScoring(event.target.value as TeamEventScoring);
                setResult(null);
              }}
              className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-base font-semibold"
            >
              <option value="net">Net - Best 3 of 4</option>
              <option value="gross">Gross - Best 3 of 4</option>
            </select>
          </Field>

          <Field label="Handicap Allowance">
            <select
              value={allowance}
              onChange={(event) => {
                setAllowance(Number(event.target.value));
                setResult(null);
              }}
              disabled={scoring === "gross"}
              className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-base font-semibold disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value={1}>100%</option>
              <option value={0.95}>95%</option>
              <option value={0.9}>90%</option>
              <option value={0.85}>85%</option>
            </select>
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Build the Teams</h2>
            <p className="mt-1 text-sm text-slate-600">
              Select exactly four unique players for every team.
            </p>
          </div>
          <button
            type="button"
            onClick={addTeam}
            disabled={teams.length >= 16}
            className="rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
          >
            Add Team
          </button>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {teams.map((team, teamIndex) => (
            <div
              key={team.id}
              className="rounded-xl border border-slate-300 bg-slate-50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                  {teamIndex + 1}
                </div>
                <input
                  aria-label={`Team ${teamIndex + 1} name`}
                  value={team.name}
                  onChange={(event) => updateTeamName(team.id, event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-400 bg-white px-3 py-2 text-lg font-bold"
                />
                {teams.length > 2 ? (
                  <button
                    type="button"
                    onClick={() => removeTeam(team.id)}
                    className="rounded-lg px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {team.playerIds.map((selectedPlayerId, slot) => (
                  <Field key={slot} label={`Player ${slot + 1}`}>
                    <select
                      value={selectedPlayerId}
                      onChange={(event) =>
                        updatePlayer(team.id, slot, event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-400 bg-white px-3 py-2.5 text-sm font-semibold"
                    >
                      <option value="">Select player</option>
                      {players.map((player) => (
                        <option
                          key={player.id}
                          value={player.id}
                          disabled={usedByAnotherSlot(player.id, team.id, slot)}
                        >
                          {player.fullName} (HI {player.currentHandicapIndex.toFixed(1)})
                        </option>
                      ))}
                    </select>
                    {selectedPlayerId ? (
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Current HI {playerById.get(selectedPlayerId)?.currentHandicapIndex.toFixed(1)}
                      </p>
                    ) : null}
                  </Field>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <div className="mt-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={calculate}
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-blue-700 px-6 py-3.5 text-lg font-bold text-white shadow-sm hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
        >
          {loading
            ? "Running 20,000 event simulations..."
            : "Calculate Team Rankings"}
        </button>
      </section>

      {result ? <EstimatorResults result={result} /> : null}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      {children}
    </label>
  );
}

function EstimatorResults({ result }: { result: TeamEventEstimateResponse }) {
  return (
    <section className="mt-8 space-y-5">
      <div className="rounded-2xl bg-slate-950 p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-blue-300">
              Simulation Results
            </p>
            <h2 className="mt-1 text-3xl font-bold">Projected Team Rankings</h2>
            <p className="mt-2 text-sm text-slate-300">
              {result.tee} tees - Par {result.teePar} - Rating {result.courseRating.toFixed(1)} - Slope {result.slopeRating.toFixed(0)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-right">
            <div className="text-xs font-bold uppercase text-slate-400">Format</div>
            <div className="mt-1 text-lg font-bold">
              Best 3 of 4 {result.scoring === "net" ? "Net" : "Gross"}
            </div>
            <div className="text-sm text-slate-300">
              {result.simulations.toLocaleString()} simulations
              {result.scoring === "net"
                ? ` - ${Math.round(result.handicapAllowance * 100)}% allowance`
                : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-300 bg-white shadow-sm">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-slate-100 text-slate-900">
            <tr>
              <th className="px-4 py-3 text-left">Rank</th>
              <th className="px-4 py-3 text-left">Team</th>
              <th className="px-4 py-3 text-right">Win Chance</th>
              <th className="px-4 py-3 text-right">Top 3 Chance</th>
              <th className="px-4 py-3 text-right">Est. Score</th>
              <th className="px-4 py-3 text-right">To 3-Ball Par</th>
              <th className="px-4 py-3 text-right">Likely Range</th>
              <th className="px-4 py-3 text-left">Players</th>
            </tr>
          </thead>
          <tbody>
            {result.teams.map((team) => (
              <tr
                key={team.teamId}
                className={`border-t border-slate-200 ${
                  team.rank === 1 ? "bg-emerald-50" : ""
                }`}
              >
                <td className="px-4 py-4 text-2xl font-black text-slate-950">
                  #{team.rank}
                </td>
                <td className="px-4 py-4">
                  <div className="text-lg font-bold text-slate-950">
                    {team.teamName}
                  </div>
                  {team.rank === 1 ? (
                    <div className="mt-1 text-xs font-bold uppercase text-emerald-700">
                      Model favorite
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-4 text-right text-xl font-black text-blue-800">
                  {percent(team.winProbability)}
                </td>
                <td className="px-4 py-4 text-right font-bold">
                  {percent(team.topThreeProbability)}
                </td>
                <td className="px-4 py-4 text-right text-xl font-black">
                  {team.estimatedScore.toFixed(1)}
                </td>
                <td className="px-4 py-4 text-right font-bold">
                  {signed(team.estimatedToPar)}
                </td>
                <td className="px-4 py-4 text-right font-semibold">
                  {team.likelyLowScore}-{team.likelyHighScore}
                </td>
                <td className="px-4 py-4">
                  {team.players.map((player) => (
                    <div key={player.id} className="whitespace-nowrap">
                      <span className="font-semibold">{player.name}</span>
                      <span className="text-slate-500">
                        {` - HI ${player.currentHandicapIndex.toFixed(1)}`}
                        {result.scoring === "net"
                          ? ` / PH ${player.playingHandicap}`
                          : ""}
                      </span>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {result.teams.map((team) => (
          <article
            key={team.teamId}
            className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-950">
                #{team.rank} {team.teamName}
              </h3>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-800">
                {percent(team.winProbability)} win
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {team.players.map((player) => (
                <div key={player.id} className="rounded-lg bg-slate-50 p-3">
                  <div className="font-bold text-slate-950">{player.name}</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Current HI {player.currentHandicapIndex.toFixed(1)}
                    {result.scoring === "net"
                      ? ` - Playing Handicap ${player.playingHandicap}`
                      : ""}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    Historical coverage: {player.historicalHoles}/18 holes
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-slate-700">
        <h3 className="text-base font-bold text-slate-950">How the Estimate Works</h3>
        <p className="mt-2 leading-6">{result.methodology}</p>
        <p className="mt-2 leading-6">
          Historical window: {result.periodStart} through {result.periodEnd}. The
          likely range is the model&apos;s 10th-to-90th-percentile team score. The
          estimate is a planning and entertainment tool, not a guarantee of
          performance or betting outcome.
        </p>
      </div>
    </section>
  );
}
