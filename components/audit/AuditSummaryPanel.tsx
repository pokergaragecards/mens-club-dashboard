"use client";

import { useMemo } from "react";

export type AuditSummaryRound = {
  id: string;
  date: string;
  course?: string | null;
  score?: number | null;
  differential: number;
  category: "Competition" | "General Play";
  usedInCalculation?: boolean;
};

export type AuditRecommendation = {
  interviewPlayer: boolean;
  reviewExceptionalScores: boolean;
  adjustHandicap: boolean;
  noAction: boolean;
};

type AuditSummaryPanelProps = {
  currentHandicap: number | null;
  competitionHandicap: number | null;
  generalPlayHandicap: number | null;

  rounds: AuditSummaryRound[];

  competitionRoundCount?: number;
  generalPlayRoundCount?: number;

  recommendation?: Partial<AuditRecommendation>;
  keyInsight?: string | null;
};

type ConfidenceLevel = {
  label: "Low" | "Moderate" | "High" | "Very High";
  stars: number;
  description: string;
};

const DEFAULT_RECOMMENDATION: AuditRecommendation = {
  interviewPlayer: false,
  reviewExceptionalScores: false,
  adjustHandicap: false,
  noAction: false,
};

function formatNumber(value: number | null, decimals = 1) {
  return value === null || !Number.isFinite(value)
    ? "-"
    : value.toFixed(decimals);
}

function parseDate(value: string) {
  const normalized = value.includes("T") ? value : `${value}T00:00:00`;
  return new Date(normalized);
}

function formatMonth(value: string) {
  const date = parseDate(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
  });
}

function formatShortDate(value: string) {
  const date = parseDate(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

function differenceFromCurrent(
  categoryHandicap: number | null,
  currentHandicap: number | null
) {
  if (
    categoryHandicap === null ||
    currentHandicap === null ||
    !Number.isFinite(categoryHandicap) ||
    !Number.isFinite(currentHandicap)
  ) {
    return null;
  }

  return Number((categoryHandicap - currentHandicap).toFixed(1));
}

function competitionAdvantage(
  competitionHandicap: number | null,
  currentHandicap: number | null
) {
  if (
    competitionHandicap === null ||
    currentHandicap === null ||
    !Number.isFinite(competitionHandicap) ||
    !Number.isFinite(currentHandicap)
  ) {
    return null;
  }

  return Number((currentHandicap - competitionHandicap).toFixed(1));
}

function determineConfidence(
  competitionRounds: number,
  generalRounds: number
): ConfidenceLevel {
  const totalRounds = competitionRounds + generalRounds;

  if (competitionRounds >= 10 && generalRounds >= 20 && totalRounds >= 30) {
    return {
      label: "Very High",
      stars: 5,
      description: "Strong sample across both categories.",
    };
  }

  if (competitionRounds >= 5 && generalRounds >= 15 && totalRounds >= 20) {
    return {
      label: "High",
      stars: 4,
      description: "Sufficient evidence for committee review.",
    };
  }

  if (competitionRounds >= 5 && totalRounds >= 15) {
    return {
      label: "Moderate",
      stars: 3,
      description: "Useful evidence, but continued monitoring is appropriate.",
    };
  }

  return {
    label: "Low",
    stars: 2,
    description: "Limited sample size. Use caution when drawing conclusions.",
  };
}

function defaultRecommendation(
  advantage: number | null,
  confidence: ConfidenceLevel
): AuditRecommendation {
  if (advantage === null) {
    return {
      interviewPlayer: false,
      reviewExceptionalScores: false,
      adjustHandicap: false,
      noAction: true,
    };
  }

  if (advantage >= 4 && confidence.stars >= 3) {
    return {
      interviewPlayer: true,
      reviewExceptionalScores: true,
      adjustHandicap: false,
      noAction: false,
    };
  }

  if (advantage >= 1.5) {
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

function comparisonPresentation(difference: number | null) {
  if (difference === null) {
    return {
      text: "-",
      description: "Current GHIN unavailable",
      className: "text-gray-500",
    };
  }

  if (difference < 0) {
    return {
      text: `▼ ${Math.abs(difference).toFixed(1)}`,
      description: `${Math.abs(difference).toFixed(1)} lower than Current GHIN`,
      className: "text-green-700",
    };
  }

  if (difference > 0) {
    return {
      text: `▲ ${difference.toFixed(1)}`,
      description: `${difference.toFixed(1)} higher than Current GHIN`,
      className: "text-amber-700",
    };
  }

  return {
    text: "— 0.0",
    description: "Equal to Current GHIN",
    className: "text-gray-600",
  };
}

export function AuditSummaryPanel({
  currentHandicap,
  competitionHandicap,
  generalPlayHandicap,
  rounds,
  competitionRoundCount,
  generalPlayRoundCount,
  recommendation,
  keyInsight,
}: AuditSummaryPanelProps) {
  const sortedRounds = useMemo(
    () =>
      [...rounds].sort(
        (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
      ),
    [rounds]
  );

  const timelineRounds = useMemo(
    () => sortedRounds.slice(-20),
    [sortedRounds]
  );

  const derivedCompetitionRounds = rounds.filter(
    (round) => round.category === "Competition"
  ).length;

  const derivedGeneralRounds = rounds.filter(
    (round) => round.category === "General Play"
  ).length;

  const competitionCount =
    competitionRoundCount ?? derivedCompetitionRounds;

  const generalCount = generalPlayRoundCount ?? derivedGeneralRounds;

  const totalCount = competitionCount + generalCount;

  const competitionDifference = differenceFromCurrent(
    competitionHandicap,
    currentHandicap
  );

  const generalDifference = differenceFromCurrent(
    generalPlayHandicap,
    currentHandicap
  );

  const advantage = competitionAdvantage(
    competitionHandicap,
    currentHandicap
  );

  const confidence = determineConfidence(
    competitionCount,
    generalCount
  );

  const recommendations = {
    ...DEFAULT_RECOMMENDATION,
    ...defaultRecommendation(advantage, confidence),
    ...recommendation,
  };

  const generatedInsight =
    advantage === null
      ? "Insufficient data is available to compare the Competition Handicap Index with the Current GHIN Handicap Index."
      : advantage > 0
        ? `The Competition Handicap Index is ${advantage.toFixed(
            1
          )} strokes lower than the Current GHIN Handicap Index.`
        : advantage < 0
          ? `The Competition Handicap Index is ${Math.abs(advantage).toFixed(
              1
            )} strokes higher than the Current GHIN Handicap Index.`
          : "The Competition Handicap Index and Current GHIN Handicap Index are equal.";

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HandicapMetricCard
          label="Current GHIN HI"
          value={formatNumber(currentHandicap)}
          description="Baseline for comparison"
        />

        <ComparedHandicapCard
          label="Competition HI"
          value={competitionHandicap}
          currentHandicap={currentHandicap}
          difference={competitionDifference}
        />

        <ComparedHandicapCard
          label="General Play HI"
          value={generalPlayHandicap}
          currentHandicap={currentHandicap}
          difference={generalDifference}
        />

        <AdvantageCard advantage={advantage} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <MiniRoundTimeline rounds={timelineRounds} />

        <ConfidencePanel
          confidence={confidence}
          competitionRounds={competitionCount}
          generalRounds={generalCount}
          totalRounds={totalCount}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <KeyInsightPanel text={keyInsight ?? generatedInsight} />

        <RecommendedActionPanel recommendation={recommendations} />
      </div>
    </section>
  );
}

function HandicapMetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-600">
        {label}
      </div>

      <div className="mt-1 text-3xl font-black text-gray-950">{value}</div>

      {description && (
        <div className="mt-2 text-xs text-gray-500">{description}</div>
      )}
    </div>
  );
}

function ComparedHandicapCard({
  label,
  value,
  currentHandicap,
  difference,
}: {
  label: string;
  value: number | null;
  currentHandicap: number | null;
  difference: number | null;
}) {
  const comparison = comparisonPresentation(difference);

  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-600">
        {label}
      </div>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-3xl font-black text-gray-950">
          {formatNumber(value)}
        </span>

        <span className={`text-lg font-black ${comparison.className}`}>
          {comparison.text}
        </span>
      </div>

      <div className="mt-2 text-xs font-medium text-gray-600">
        {comparison.description}
      </div>

      <div className="mt-1 text-xs text-gray-500">
        Current GHIN: {formatNumber(currentHandicap)}
      </div>
    </div>
  );
}

function AdvantageCard({ advantage }: { advantage: number | null }) {
  const displayValue =
    advantage === null
      ? "-"
      : `${Math.max(0, advantage).toFixed(1)} STROKES`;

  const severity =
    advantage !== null && advantage >= 4
      ? "text-red-700"
      : advantage !== null && advantage >= 1.5
        ? "text-orange-700"
        : "text-gray-950";

  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-600">
        Competition Advantage vs GHIN
      </div>

      <div className={`mt-1 text-3xl font-black ${severity}`}>
        {displayValue}
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Higher values indicate a larger competition-to-GHIN gap.
      </div>
    </div>
  );
}

function MiniRoundTimeline({ rounds }: { rounds: AuditSummaryRound[] }) {
  if (!rounds.length) {
    return (
      <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
        <h2 className="text-base font-black uppercase tracking-wide text-green-900">
          Mini Round Timeline
        </h2>

        <p className="mt-3 text-sm text-gray-600">
          No official round data is available.
        </p>
      </div>
    );
  }

  const oldest = rounds[0];
  const newest = rounds[rounds.length - 1];

  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black uppercase tracking-wide text-green-900">
            Mini Round Timeline
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Most recent {rounds.length} official handicap rounds
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          <TimelineLegendDot
            className="bg-green-700"
            label="Competition"
          />

          <TimelineLegendDot
            className="bg-gray-400"
            label="General Play"
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="relative px-2">
          <div className="absolute left-2 right-2 top-3 h-0.5 bg-gray-300" />

          <div
            className="relative grid items-start"
            style={{
              gridTemplateColumns: `repeat(${rounds.length}, minmax(0, 1fr))`,
            }}
          >
            {rounds.map((round, index) => {
              const isCompetition = round.category === "Competition";

              return (
                <div
                  key={`${round.id}-${index}`}
                  className="group relative flex min-w-0 flex-col items-center"
                  title={[
                    formatShortDate(round.date),
                    round.course ?? "Unknown course",
                    round.category,
                    `Differential ${round.differential.toFixed(1)}`,
                  ].join(" · ")}
                >
                  <div
                    className={[
                      "relative z-10 h-6 w-6 rounded-full border-2 border-white shadow",
                      isCompetition ? "bg-green-700" : "bg-gray-400",
                      round.usedInCalculation
                        ? "ring-2 ring-amber-400 ring-offset-1"
                        : "",
                    ].join(" ")}
                  />

                  <div className="mt-2 hidden max-w-[70px] truncate text-center text-[10px] font-semibold text-gray-600 sm:block">
                    {formatMonth(round.date)}
                  </div>

                  <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-52 -translate-x-1/2 rounded-lg border border-gray-300 bg-white p-3 text-left text-xs shadow-xl group-hover:block">
                    <div className="font-black text-gray-950">
                      {round.category}
                    </div>

                    <div className="mt-1 text-gray-700">
                      {formatShortDate(round.date)}
                    </div>

                    <div className="mt-1 truncate text-gray-700">
                      {round.course ?? "Unknown course"}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <span>
                        Score: <strong>{round.score ?? "-"}</strong>
                      </span>

                      <span>
                        Diff:{" "}
                        <strong>{round.differential.toFixed(1)}</strong>
                      </span>
                    </div>

                    {round.usedInCalculation && (
                      <div className="mt-2 font-bold text-amber-700">
                        Used in HI calculation
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex justify-between text-xs font-semibold text-gray-600">
          <span>
            Oldest: {formatShortDate(oldest.date)}
          </span>

          <span>
            Most recent: {formatShortDate(newest.date)}
          </span>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Gold rings identify rounds used in the applicable handicap
          calculation.
        </p>
      </div>
    </div>
  );
}

function TimelineLegendDot({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2 text-gray-700">
      <span className={`h-3 w-3 rounded-full ${className}`} />
      {label}
    </span>
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
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <h2 className="text-base font-black uppercase tracking-wide text-green-900">
        Confidence / Evidence
      </h2>

      <div
        className="mt-4 flex gap-1"
        aria-label={`${confidence.stars} of 5 confidence stars`}
      >
        {Array.from({ length: 5 }, (_, index) => {
          const filled = index < confidence.stars;

          return (
            <span
              key={index}
              className={
                filled
                  ? "text-3xl leading-none text-green-800"
                  : "text-3xl leading-none text-gray-300"
              }
            >
              ★
            </span>
          );
        })}
      </div>

      <div className="mt-3 text-xl font-black text-green-900">
        {confidence.label}
      </div>

      <p className="mt-1 text-xs text-gray-600">
        {confidence.description}
      </p>

      <div className="mt-5 space-y-3">
        <EvidenceItem text={`${generalRounds} General Play rounds`} />
        <EvidenceItem text={`${competitionRounds} Competition rounds`} />
        <EvidenceItem text={`${totalRounds} total official rounds`} />
        <EvidenceItem
          text={
            totalRounds >= 20
              ? "Data volume meets review threshold"
              : "Additional rounds would strengthen confidence"
          }
          passed={totalRounds >= 20}
        />
      </div>
    </div>
  );
}

function EvidenceItem({
  text,
  passed = true,
}: {
  text: string;
  passed?: boolean;
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

function RecommendedActionPanel({
  recommendation,
}: {
  recommendation: AuditRecommendation;
}) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <h2 className="text-base font-black uppercase tracking-wide text-green-900">
        Recommended Action
      </h2>

      <div className="mt-5 space-y-4">
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

      <p className="mt-5 text-xs text-gray-500">
        Recommendations are screening indicators only. Final action remains a
        committee decision.
      </p>
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

function KeyInsightPanel({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
      <h2 className="text-base font-black uppercase tracking-wide text-green-900">
        Key Insight
      </h2>

      <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-800">
        {text}
      </p>
    </div>
  );
}