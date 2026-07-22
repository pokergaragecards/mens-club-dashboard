"use client";

import { useMemo } from "react";

export type AuditHandicapTrendPoint = {
  id: string;
  date: string;
  course: string | null;
  score: number | null;
  differential: number;
  handicapIndex: number;
  category: "Competition" | "General Play";
};

type ConfidenceLevel = {
  label: "Low" | "Moderate" | "High" | "Very High";
  stars: number;
  description: string;
};

type Recommendation = {
  interviewPlayer: boolean;
  reviewExceptionalScores: boolean;
  adjustHandicap: boolean;
  noAction: boolean;
};

function formatNumber(value: number | null, decimals = 1) {
  return value == null || !Number.isFinite(value)
    ? "-"
    : value.toFixed(decimals);
}

function dateToTime(value: string) {
  const normalized = value.includes("T")
    ? value
    : `${value}T00:00:00`;

  return new Date(normalized).getTime();
}

function formatDate(value: string) {
  const normalized = value.includes("T")
    ? value
    : `${value}T00:00:00`;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

function formatMonth(value: string) {
  const normalized = value.includes("T")
    ? value
    : `${value}T00:00:00`;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
  });
}

function getConfidence(
  competitionRounds: number,
  generalRounds: number
): ConfidenceLevel {
  const totalRounds = competitionRounds + generalRounds;

  if (
    competitionRounds >= 10 &&
    generalRounds >= 20 &&
    totalRounds >= 30
  ) {
    return {
      label: "Very High",
      stars: 5,
      description: "Strong samples exist in both round categories.",
    };
  }

  if (
    competitionRounds >= 5 &&
    generalRounds >= 15 &&
    totalRounds >= 20
  ) {
    return {
      label: "High",
      stars: 4,
      description: "The sample is sufficient for committee review.",
    };
  }

  if (competitionRounds >= 5 && totalRounds >= 15) {
    return {
      label: "Moderate",
      stars: 3,
      description:
        "The evidence is useful, although additional rounds would help.",
    };
  }

  return {
    label: "Low",
    stars: 2,
    description:
      "The sample is limited and should be interpreted cautiously.",
  };
}

function getRecommendation(
  competitionAdvantage: number | null,
  confidence: ConfidenceLevel
): Recommendation {
  if (competitionAdvantage == null) {
    return {
      interviewPlayer: false,
      reviewExceptionalScores: false,
      adjustHandicap: false,
      noAction: true,
    };
  }

  if (competitionAdvantage >= 4 && confidence.stars >= 3) {
    return {
      interviewPlayer: true,
      reviewExceptionalScores: true,
      adjustHandicap: false,
      noAction: false,
    };
  }

  if (competitionAdvantage >= 1.5) {
    return {
      interviewPlayer: false,
      reviewExceptionalScores: true,
      adjustHandicap: false,
      noAction: false,
    };
  }

  return {
    interviewPlayer: false,
    reviewExceptionalScores: false,
    adjustHandicap: false,
    noAction: true,
  };
}

export function AuditTrendChart({
  competitionPoints,
  generalPoints,
  currentHandicap,
}: {
  competitionPoints: AuditHandicapTrendPoint[];
  generalPoints: AuditHandicapTrendPoint[];
  currentHandicap: number | null;
}) {
  const competition = useMemo(
    () =>
      [...competitionPoints].sort(
        (a, b) => dateToTime(a.date) - dateToTime(b.date)
      ),
    [competitionPoints]
  );

  const general = useMemo(
    () =>
      [...generalPoints].sort(
        (a, b) => dateToTime(a.date) - dateToTime(b.date)
      ),
    [generalPoints]
  );

  const allRounds = useMemo(
    () =>
      [...competition, ...general].sort(
        (a, b) => dateToTime(a.date) - dateToTime(b.date)
      ),
    [competition, general]
  );

  const timelineRounds = useMemo(
    () => allRounds.slice(-20),
    [allRounds]
  );

  const latestCompetitionHi =
    competition.length > 0
      ? competition[competition.length - 1].handicapIndex
      : null;

  const latestGeneralHi =
    general.length > 0
      ? general[general.length - 1].handicapIndex
      : null;

  const competitionAdvantage =
    currentHandicap != null && latestCompetitionHi != null
      ? Number(
          (currentHandicap - latestCompetitionHi).toFixed(1)
        )
      : null;

  const generalDifference =
    currentHandicap != null && latestGeneralHi != null
      ? Number((currentHandicap - latestGeneralHi).toFixed(1))
      : null;

  const confidence = getConfidence(
    competition.length,
    general.length
  );

  const recommendation = getRecommendation(
    competitionAdvantage,
    confidence
  );

  const totalRounds = competition.length + general.length;

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CurrentHandicapCard value={currentHandicap} />

        <ComparisonCard
          label="Competition HI"
          value={latestCompetitionHi}
          difference={competitionAdvantage}
          currentHandicap={currentHandicap}
          positiveMeansAdvantage
        />

        <ComparisonCard
          label="General Play HI"
          value={latestGeneralHi}
          difference={generalDifference}
          currentHandicap={currentHandicap}
          positiveMeansAdvantage
        />

        <AdvantageCard value={competitionAdvantage} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <MiniRoundTimeline rounds={timelineRounds} />

        <ConfidencePanel
          confidence={confidence}
          competitionRounds={competition.length}
          generalRounds={general.length}
          totalRounds={totalRounds}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <KeyInsightPanel
          currentHandicap={currentHandicap}
          competitionHandicap={latestCompetitionHi}
          generalHandicap={latestGeneralHi}
          competitionAdvantage={competitionAdvantage}
        />

        <RecommendedActionPanel
          recommendation={recommendation}
        />
      </div>
    </section>
  );
}

function CurrentHandicapCard({
  value,
}: {
  value: number | null;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-600">
        Current GHIN HI
      </div>

      <div className="mt-1 text-3xl font-black text-gray-950">
        {formatNumber(value)}
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Baseline for category comparisons
      </div>
    </div>
  );
}

function ComparisonCard({
  label,
  value,
  difference,
  currentHandicap,
  positiveMeansAdvantage,
}: {
  label: string;
  value: number | null;
  difference: number | null;
  currentHandicap: number | null;
  positiveMeansAdvantage?: boolean;
}) {
  const comparison = getComparisonDisplay(
    difference,
    positiveMeansAdvantage
  );

  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-600">
        {label}
      </div>

      <div className="mt-1 flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-black text-gray-950">
          {formatNumber(value)}
        </span>

        <span
          className={`text-lg font-black ${comparison.className}`}
        >
          {comparison.symbol} {comparison.value}
        </span>
      </div>

      <div className="mt-2 text-xs font-semibold text-gray-700">
        {comparison.description}
      </div>

      <div className="mt-1 text-xs text-gray-500">
        Compared with Current GHIN HI{" "}
        {formatNumber(currentHandicap)}
      </div>
    </div>
  );
}

function getComparisonDisplay(
  difference: number | null,
  positiveMeansAdvantage = false
) {
  if (difference == null) {
    return {
      symbol: "",
      value: "-",
      description: "Comparison unavailable",
      className: "text-gray-500",
    };
  }

  if (difference > 0) {
    return {
      symbol: "▲",
      value: difference.toFixed(1),
      description: positiveMeansAdvantage
        ? `${difference.toFixed(1)} lower than Current GHIN`
        : `${difference.toFixed(1)} higher than Current GHIN`,
      className: "text-green-700",
    };
  }

  if (difference < 0) {
    return {
      symbol: "▼",
      value: Math.abs(difference).toFixed(1),
      description: positiveMeansAdvantage
        ? `${Math.abs(difference).toFixed(
            1
          )} higher than Current GHIN`
        : `${Math.abs(difference).toFixed(
            1
          )} lower than Current GHIN`,
      className: "text-red-700",
    };
  }

  return {
    symbol: "—",
    value: "0.0",
    description: "Equal to Current GHIN",
    className: "text-gray-600",
  };
}

function AdvantageCard({
  value,
}: {
  value: number | null;
}) {
  const severityClass =
    value != null && value >= 4
      ? "text-red-700"
      : value != null && value >= 1.5
        ? "text-orange-700"
        : "text-gray-950";

  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-600">
        Competition Advantage vs GHIN
      </div>

      <div
        className={`mt-1 text-3xl font-black ${severityClass}`}
      >
        {value == null
          ? "-"
          : `${Math.max(0, value).toFixed(1)} STROKES`}
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Higher values indicate a larger review concern.
      </div>
    </div>
  );
}

function MiniRoundTimeline({
  rounds,
}: {
  rounds: AuditHandicapTrendPoint[];
}) {
  if (!rounds.length) {
    return (
      <Panel title="Mini Round Timeline">
        <p className="text-sm text-gray-600">
          No official round history is available.
        </p>
      </Panel>
    );
  }

  const oldest = rounds[0];
  const newest = rounds[rounds.length - 1];

  return (
    <Panel title="Mini Round Timeline">
      <div className="flex flex-wrap items-center gap-5 text-xs font-semibold text-gray-700">
        <LegendDot
          className="bg-green-700"
          label="Competition round"
        />

        <LegendDot
          className="bg-gray-400"
          label="General play round"
        />
      </div>

      <div className="mt-7">
        <div className="relative px-2">
          <div className="absolute left-2 right-2 top-3 h-0.5 bg-gray-300" />

          <div
            className="relative grid"
            style={{
              gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))`,
            }}
          >
            {rounds.map((round, index) => {
              const competitionRound =
                round.category === "Competition";

              return (
                <div
                  key={`${round.category}-${round.id}-${index}`}
                  className="group relative flex min-w-0 flex-col items-center"
                >
                  <div
                    className={[
                      "relative z-10 h-6 w-6 rounded-full border-2 border-white shadow-sm",
                      competitionRound
                        ? "bg-green-700"
                        : "bg-gray-400",
                    ].join(" ")}
                  />

                  <div className="mt-2 hidden max-w-[48px] truncate text-[10px] font-semibold text-gray-600 sm:block">
                    {formatMonth(round.date)}
                  </div>

                  <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-56 -translate-x-1/2 rounded-lg border border-gray-300 bg-white p-3 text-left text-xs shadow-xl group-hover:block">
                    <div className="font-black text-gray-950">
                      {round.category}
                    </div>

                    <div className="mt-1 text-gray-700">
                      {formatDate(round.date)}
                    </div>

                    <div className="mt-1 truncate text-gray-700">
                      {round.course ?? "Unknown course"}
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <span>
                        Score
                        <strong className="block">
                          {round.score ?? "-"}
                        </strong>
                      </span>

                      <span>
                        Diff
                        <strong className="block">
                          {round.differential.toFixed(1)}
                        </strong>
                      </span>

                      <span>
                        HI
                        <strong className="block">
                          {round.handicapIndex.toFixed(1)}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex justify-between text-xs font-semibold text-gray-600">
          <span>Oldest: {formatDate(oldest.date)}</span>
          <span>Most recent: {formatDate(newest.date)}</span>
        </div>
      </div>
    </Panel>
  );
}

function ConfidencePanel({
  confidence,
  competitionRounds,
  generalRounds,
  totalRounds,
}: {
  confidence: ConfidenceLevel;
  competitionRounds: number;
  generalRounds: number;
  totalRounds: number;
}) {
  return (
    <Panel title="Confidence / Evidence">
      <div
        className="flex gap-1"
        aria-label={`${confidence.stars} out of 5 confidence stars`}
      >
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={
              index < confidence.stars
                ? "text-3xl leading-none text-green-800"
                : "text-3xl leading-none text-gray-300"
            }
          >
            ★
          </span>
        ))}
      </div>

      <div className="mt-3 text-xl font-black text-green-900">
        {confidence.label}
      </div>

      <p className="mt-1 text-xs leading-5 text-gray-600">
        {confidence.description}
      </p>

      <div className="mt-5 space-y-3">
        <EvidenceItem
          passed={generalRounds >= 15}
          text={`${generalRounds} General Play rounds`}
        />

        <EvidenceItem
          passed={competitionRounds >= 5}
          text={`${competitionRounds} Competition rounds`}
        />

        <EvidenceItem
          passed={totalRounds >= 20}
          text={`${totalRounds} total category rounds`}
        />

        <EvidenceItem
          passed={competitionRounds >= 5 && generalRounds >= 15}
          text="Category sample meets review threshold"
        />
      </div>
    </Panel>
  );
}

function RecommendedActionPanel({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  return (
    <Panel title="Recommended Action">
      <div className="space-y-4">
        <RecommendationItem
          checked={recommendation.interviewPlayer}
          label="Interview player"
        />

        <RecommendationItem
          checked={recommendation.reviewExceptionalScores}
          label="Review exceptional scores"
        />

        <RecommendationItem
          checked={recommendation.adjustHandicap}
          label="Adjust Handicap Index"
        />

        <RecommendationItem
          checked={recommendation.noAction}
          label="No action"
        />
      </div>

      <p className="mt-5 text-xs leading-5 text-gray-500">
        These recommendations are screening indicators. Final
        action remains a handicap committee decision.
      </p>
    </Panel>
  );
}

function KeyInsightPanel({
  currentHandicap,
  competitionHandicap,
  generalHandicap,
  competitionAdvantage,
}: {
  currentHandicap: number | null;
  competitionHandicap: number | null;
  generalHandicap: number | null;
  competitionAdvantage: number | null;
}) {
  let insight =
    "Insufficient data is available to compare category Handicap Indexes.";

  if (
    currentHandicap != null &&
    competitionHandicap != null &&
    competitionAdvantage != null
  ) {
    if (competitionAdvantage > 0) {
      insight = `The Competition Handicap Index is ${competitionAdvantage.toFixed(
        1
      )} strokes lower than the Current GHIN Handicap Index.`;
    } else if (competitionAdvantage < 0) {
      insight = `The Competition Handicap Index is ${Math.abs(
        competitionAdvantage
      ).toFixed(
        1
      )} strokes higher than the Current GHIN Handicap Index.`;
    } else {
      insight =
        "The Competition Handicap Index equals the Current GHIN Handicap Index.";
    }

    if (generalHandicap != null) {
      const generalGap = generalHandicap - competitionHandicap;

      if (generalGap > 0) {
        insight += ` General Play HI is ${generalGap.toFixed(
          1
        )} strokes higher than Competition HI.`;
      } else if (generalGap < 0) {
        insight += ` General Play HI is ${Math.abs(
          generalGap
        ).toFixed(
          1
        )} strokes lower than Competition HI.`;
      }
    }
  }

  return (
    <Panel title="Key Insight">
      <p className="max-w-3xl text-sm leading-6 text-gray-800">
        {insight}
      </p>
    </Panel>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-base font-black uppercase tracking-wide text-green-900">
        {title}
      </h2>

      {children}
    </div>
  );
}

function LegendDot({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function EvidenceItem({
  passed,
  text,
}: {
  passed: boolean;
  text: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-800">
      <span
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-black",
          passed
            ? "border-green-700 text-green-700"
            : "border-amber-600 text-amber-700",
        ].join(" ")}
      >
        {passed ? "✓" : "!"}
      </span>

      <span>{text}</span>
    </div>
  );
}

function RecommendationItem({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-gray-900">
      <span
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center border text-sm font-black",
          checked
            ? "border-green-800 bg-green-800 text-white"
            : "border-gray-500 bg-white text-transparent",
        ].join(" ")}
      >
        ✓
      </span>

      <span>{label}</span>
    </div>
  );
}