import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import {
  holeRankingPercentile,
  holeRankingRank,
  playersForHoleRankingView,
  type HoleRankingView,
  type HoleRanking,
  type HoleRankingReport,
  type PlayerHoleRanking,
  type TeeHoleRankings,
} from "@/services/holeRankingService";
import { goodrichTeeDisplayName } from "@/lib/goodrichTeeDisplay";

const COLORS = {
  navy: "#172554",
  blue: "#1d4ed8",
  blue50: "#eff6ff",
  red: "#b91c1c",
  red50: "#fef2f2",
  amber: "#b45309",
  amber50: "#fffbeb",
  green: "#166534",
  gray900: "#111827",
  gray700: "#374151",
  gray600: "#4b5563",
  gray400: "#9ca3af",
  gray300: "#d1d5db",
  gray200: "#e5e7eb",
  gray100: "#f3f4f6",
  white: "#ffffff",
};

const MATRIX_PLAYER_WIDTH = 96;
const MATRIX_OVERALL_WIDTH = 46;
const MATRIX_HANDICAP_WIDTH = 34;
const MATRIX_ROUNDS_WIDTH = 32;
const MATRIX_HOLE_WIDTH = 30;
const PLAYERS_PER_MATRIX_PAGE = 16;

const s = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 18,
    paddingHorizontal: 24,
    fontFamily: "Helvetica",
    fontSize: 7,
    color: COLORS.gray900,
    backgroundColor: COLORS.white,
  },
  matrixPage: {
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 20,
    fontFamily: "Helvetica",
    fontSize: 6,
    color: COLORS.gray900,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 9,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
  },
  matrixTitle: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 8,
    color: COLORS.gray600,
  },
  teeBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
  },
  method: {
    marginBottom: 7,
    padding: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: COLORS.blue50,
  },
  methodTitle: {
    marginBottom: 3,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
  },
  methodText: {
    fontSize: 6.2,
    lineHeight: 1.25,
    color: COLORS.gray700,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  summaryRow: {
    minHeight: 19,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.gray300,
  },
  headerRow: {
    minHeight: 24,
    backgroundColor: COLORS.navy,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
  },
  rowAlt: {
    backgroundColor: "#fafafa",
  },
  cell: {
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  summaryHole: { width: 32, textAlign: "center", fontFamily: "Helvetica-Bold" },
  summaryPar: { width: 30, textAlign: "center" },
  summaryStroke: { width: 45, textAlign: "center" },
  summaryYardage: { width: 45, textAlign: "right" },
  summaryPlayer: { width: 140, fontSize: 8, fontFamily: "Helvetica-Bold" },
  summaryHandicap: { width: 46, textAlign: "right" },
  summaryAverage: { width: 46, textAlign: "right" },
  summaryRaw: {
    width: 56,
    textAlign: "right",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  summaryValue: {
    width: 60,
    textAlign: "right",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  summaryWorstValue: {
    color: COLORS.red,
  },
  summaryBestValue: {
    color: COLORS.green,
  },
  summaryConfidence: { width: 56, textAlign: "right" },
  summaryScores: { width: 42, textAlign: "right" },
  summaryField: { width: 52, textAlign: "right" },
  summaryClub: { width: 74, textAlign: "right" },
  note: {
    marginTop: 6,
    padding: 5,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.amber,
    backgroundColor: COLORS.amber50,
    fontSize: 6.1,
    lineHeight: 1.2,
    color: COLORS.gray700,
  },
  legend: {
    marginBottom: 7,
    padding: 6,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.gray100,
    fontSize: 6.2,
    lineHeight: 1.3,
    color: COLORS.gray700,
  },
  matrixTable: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: COLORS.gray300,
  },
  matrixRow: {
    minHeight: 27,
    flexDirection: "row",
  },
  matrixHeaderRow: {
    minHeight: 34,
    flexDirection: "row",
    backgroundColor: COLORS.navy,
    color: COLORS.white,
  },
  matrixPlayer: {
    width: MATRIX_PLAYER_WIDTH,
    flexShrink: 0,
    justifyContent: "center",
    paddingHorizontal: 4,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.gray300,
    fontSize: 6.6,
    fontFamily: "Helvetica-Bold",
  },
  matrixOverall: {
    width: MATRIX_OVERALL_WIDTH,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.gray300,
    fontSize: 5.8,
  },
  matrixHandicap: {
    width: MATRIX_HANDICAP_WIDTH,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.gray300,
    fontSize: 5.8,
  },
  matrixRounds: {
    width: MATRIX_ROUNDS_WIDTH,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.gray300,
    fontSize: 5.8,
  },
  matrixHole: {
    width: MATRIX_HOLE_WIDTH,
    flexShrink: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 1,
    borderRightWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.gray300,
  },
  matrixHeaderText: {
    fontSize: 5.2,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    lineHeight: 1.25,
  },
  matrixRank: {
    fontSize: 6.3,
    fontFamily: "Helvetica-Bold",
  },
  matrixAverage: {
    marginTop: 1,
    fontSize: 5.3,
    fontFamily: "Helvetica-Bold",
  },
  playerWorstHole: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  playerBestHole: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },
  playerNextBestHole: {
    backgroundColor: "#fef9c3",
    color: "#854d0e",
  },
  missing: {
    color: COLORS.gray400,
  },
  empty: {
    padding: 30,
    textAlign: "center",
    fontSize: 12,
    color: COLORS.gray600,
  },
  footer: {
    position: "absolute",
    bottom: 8,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    color: COLORS.gray600,
    fontSize: 5.8,
  },
  matrixFooter: {
    position: "absolute",
    bottom: 7,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    color: COLORS.gray600,
    fontSize: 5.5,
  },
});

type MatrixHoleTier = "best" | "nextBest" | "worst";

type MatrixPlayer = {
  playerId: string;
  playerName: string;
  currentHandicapIndex: number | null;
  teeRoundCount: number;
  averagePercentile: number;
  cells: Map<number, PlayerHoleRanking>;
  holeTiers: Map<number, MatrixHoleTier>;
};

function performanceIndex(value: number | null, decimals = 1) {
  if (value === null || !Number.isFinite(value)) return "-";
  return value.toFixed(decimals);
}

function handicapIndex(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return value.toFixed(1);
}

function teeSpecifications(tee: TeeHoleRankings) {
  const teePar = performanceIndex(tee.teePar, 0);
  const courseRating = performanceIndex(tee.courseRating, 1);
  const slopeRating =
    tee.slopeRating === null
      ? "-"
      : performanceIndex(
          tee.slopeRating,
          Number.isInteger(tee.slopeRating) ? 0 : 1
        );
  return `Par ${teePar} | Course Rating ${courseRating} | Slope Rating ${slopeRating}`;
}

function confidence(value: number | null, label?: string) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${label ? `${label} ` : ""}${Math.round(value * 100)}%`;
}

function teeBadgeStyle(tee: TeeHoleRankings["tee"]) {
  if (tee === "Red") {
    return { borderColor: "#b91c1c", backgroundColor: "#fee2e2", color: "#991b1b" };
  }
  if (tee === "Gold") {
    return { borderColor: "#d97706", backgroundColor: "#fef3c7", color: "#92400e" };
  }
  if (tee === "Blue") {
    return { borderColor: "#1d4ed8", backgroundColor: "#dbeafe", color: "#1e40af" };
  }
  return { borderColor: "#4b5563", backgroundColor: "#ffffff", color: "#111827" };
}

function matrixPlayers(
  tee: TeeHoleRankings,
  view: HoleRankingView
): MatrixPlayer[] {
  const players = new Map<string, MatrixPlayer>();

  for (const hole of tee.holes) {
    for (const ranking of hole.players) {
      const current = players.get(ranking.playerId) ?? {
        playerId: ranking.playerId,
        playerName: ranking.playerName,
        currentHandicapIndex: ranking.currentHandicapIndex,
        teeRoundCount: ranking.teeRoundCount,
        averagePercentile: 0,
        cells: new Map<number, PlayerHoleRanking>(),
        holeTiers: new Map<number, MatrixHoleTier>(),
      };
      current.cells.set(hole.holeNumber, ranking);
      players.set(ranking.playerId, current);
    }
  }

  return Array.from(players.values())
    .map((player) => {
      const orderedHoles = Array.from(player.cells.entries()).sort(
        ([holeA, rankingA], [holeB, rankingB]) => {
          if (rankingA.bestPercentile !== rankingB.bestPercentile) {
            return rankingB.bestPercentile - rankingA.bestPercentile;
          }
          if (rankingA.performanceIndex !== rankingB.performanceIndex) {
            return rankingA.performanceIndex - rankingB.performanceIndex;
          }
          return holeA - holeB;
        }
      );
      const tierSize = Math.min(3, Math.floor(orderedHoles.length / 3));
      const holeTiers = new Map<number, MatrixHoleTier>();

      orderedHoles
        .slice(0, tierSize)
        .forEach(([holeNumber]) => holeTiers.set(holeNumber, "best"));
      orderedHoles
        .slice(tierSize, tierSize * 2)
        .forEach(([holeNumber]) => holeTiers.set(holeNumber, "nextBest"));
      if (tierSize) {
        orderedHoles
          .slice(-tierSize)
          .forEach(([holeNumber]) => holeTiers.set(holeNumber, "worst"));
      }

      return {
        ...player,
        holeTiers,
        averagePercentile:
          Array.from(player.cells.values()).reduce(
            (sum, cell) => sum + holeRankingPercentile(cell, view),
            0
          ) / player.cells.size,
      };
    })
    .sort((a, b) => {
      if (a.averagePercentile !== b.averagePercentile) {
        return b.averagePercentile - a.averagePercentile;
      }
      return a.playerName.localeCompare(b.playerName);
    });
}

function chunks<T>(rows: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result.length ? result : [[]];
}

function SummaryHeader({ view }: { view: HoleRankingView }) {
  const isBest = view === "best";

  return (
    <View style={[s.summaryRow, s.headerRow]}>
      <Text style={[s.cell, s.summaryHole]}>Hole</Text>
      <Text style={[s.cell, s.summaryPar]}>Par</Text>
      <Text style={[s.cell, s.summaryStroke]}>Stroke Idx</Text>
      <Text style={[s.cell, s.summaryYardage]}>Yards</Text>
      <Text style={[s.cell, s.summaryPlayer]}>
        {isBest ? "Best" : "Worst"} by Index
      </Text>
      <Text style={[s.cell, s.summaryHandicap]}>Current HI</Text>
      <Text style={[s.cell, s.summaryAverage]}>Avg Score</Text>
      <Text style={[s.cell, s.summaryRaw]}>Raw Index</Text>
      <Text style={[s.cell, s.summaryValue]}>Adj. Index</Text>
      <Text style={[s.cell, s.summaryConfidence]}>Confidence</Text>
      <Text style={[s.cell, s.summaryScores]}>Scores</Text>
      <Text style={[s.cell, s.summaryField]}>Players</Text>
      <Text style={[s.cell, s.summaryClub]}>Club Index</Text>
    </View>
  );
}

function SummaryRow({
  hole,
  index,
  view,
}: {
  hole: HoleRanking;
  index: number;
  view: HoleRankingView;
}) {
  const isBest = view === "best";
  const featured = playersForHoleRankingView(hole.players, view)[0];

  return (
    <View style={[s.summaryRow, index % 2 ? s.rowAlt : {}]} wrap={false}>
      <Text style={[s.cell, s.summaryHole]}>{hole.holeNumber}</Text>
      <Text style={[s.cell, s.summaryPar]}>{hole.par ?? "-"}</Text>
      <Text style={[s.cell, s.summaryStroke]}>{hole.strokeIndex ?? "-"}</Text>
      <Text style={[s.cell, s.summaryYardage]}>{hole.yardage ?? "-"}</Text>
      <Text style={[s.cell, s.summaryPlayer]}>
        {featured?.playerName ?? "No qualifying player"}
      </Text>
      <Text style={[s.cell, s.summaryHandicap]}>
        {handicapIndex(featured?.currentHandicapIndex ?? null)}
      </Text>
      <Text style={[s.cell, s.summaryAverage]}>
        {performanceIndex(featured?.averageGrossScore ?? null, 2)}
      </Text>
      <Text style={[s.cell, s.summaryRaw]}>
        {performanceIndex(featured?.rawPerformanceIndex ?? null)}
      </Text>
      <Text
        style={[
          s.cell,
          s.summaryValue,
          isBest ? s.summaryBestValue : s.summaryWorstValue,
        ]}
      >
        {performanceIndex(featured?.performanceIndex ?? null)}
      </Text>
      <Text style={[s.cell, s.summaryConfidence]}>
        {featured
          ? confidence(
              featured.performanceReliability,
              featured.performanceConfidence
            )
          : "-"}
      </Text>
      <Text style={[s.cell, s.summaryScores]}>
        {featured?.scoreCount ?? "-"}
      </Text>
      <Text style={[s.cell, s.summaryField]}>{hole.players.length}</Text>
      <Text style={[s.cell, s.summaryClub]}>
        {performanceIndex(hole.clubAverageIndex)}
      </Text>
    </View>
  );
}

function MatrixCell({
  ranking,
  tier,
  view,
}: {
  ranking: PlayerHoleRanking | undefined;
  tier: MatrixHoleTier | undefined;
  view: HoleRankingView;
}) {
  if (!ranking) {
    return (
      <View style={s.matrixHole}>
        <Text style={s.missing}>-</Text>
      </View>
    );
  }

  const rank = holeRankingRank(ranking, view);

  return (
    <View
      style={[
        s.matrixHole,
        tier === "best" ? s.playerBestHole : {},
        tier === "nextBest" ? s.playerNextBestHole : {},
        tier === "worst" ? s.playerWorstHole : {},
      ]}
    >
      <Text style={s.matrixRank}>#{rank}</Text>
      <Text style={s.matrixAverage}>
        Avg {performanceIndex(ranking.averageGrossScore, 2)}
      </Text>
    </View>
  );
}

function Footer({
  generatedAt,
  view,
  matrix = false,
}: {
  generatedAt: string;
  view: HoleRankingView;
  matrix?: boolean;
}) {
  const generatedDate = new Date(generatedAt).toLocaleDateString("en-US");

  return (
    <View style={matrix ? s.matrixFooter : s.footer} fixed>
      <Text>
        Goodrich Men&apos;s Club - {view} handicap-adjusted hole rankings
      </Text>
      <Text
        render={({ pageNumber }) =>
          `Generated ${generatedDate} | Page ${pageNumber}`
        }
      />
    </View>
  );
}

export function HoleRankingsReport({
  report,
  view = "worst",
}: {
  report: HoleRankingReport;
  view?: HoleRankingView;
}) {
  const isBest = view === "best";

  return (
    <Document
      title={`Goodrich ${isBest ? "Best" : "Worst"} Handicap-Adjusted Hole Rankings`}
    >
      {report.tees.map((tee) => {
        const players = matrixPlayers(tee, view);
        const playerPages = chunks(players, PLAYERS_PER_MATRIX_PAGE);
        const teeDisplayName = goodrichTeeDisplayName(tee.tee);

        return (
          <React.Fragment key={tee.tee}>
            <Page size="LETTER" orientation="landscape" style={s.page}>
              <View style={s.header}>
                <View>
                  <Text style={s.title}>
                    {isBest ? "Best" : "Worst"} Player by Goodrich Hole
                  </Text>
                  <Text style={s.subtitle}>
                    Handicap-adjusted club comparison - {teeDisplayName} tees only -{" "}
                    {teeSpecifications(tee)} -{" "}
                    {report.periodStart} through {report.periodEnd}
                  </Text>
                </View>
                <Text style={[s.teeBadge, teeBadgeStyle(tee.tee)]}>
                  {teeDisplayName.toUpperCase()} TEES
                </Text>
              </View>

              <View style={s.method}>
                <Text style={s.methodTitle}>METHOD AND ELIGIBILITY</Text>
                <Text style={s.methodText}>
                  Only hole scores from the latest 12 months ({report.periodStart}
                  {" "}through {report.periodEnd}) are included. Each expected
                  score uses the player&apos;s current Handicap Index. Expected round
                  = Course Rating + Current HI x (Slope Rating / 113), without
                  rounding. Expected hole = hole par x (expected round / tee
                  par). Each score uses its imported round rating and slope; the
                  values shown above are the medians from distinct qualifying
                  imported rounds for this tee. A negative index can still expect
                  above par when Course Rating is above par. Stroke index is
                  informational only.
                  Raw Index = 100 + 100 x (aggregate strokes versus expected /
                  aggregate expected strokes from par). It is calculated from
                  the same underlying aggregate averages shown in the report,
                  so 100 matches expectation,
                  120 is 20% worse, and 80 is 20% better. Adjusted Index moves
                  Raw Index toward the club baseline by 40% x (1 - confidence):
                  0% confidence moves 40%, 50% moves 20%, and 100% moves 0%.
                  The adjusted value ranks players. Confidence uses the greater of
                  statistical reliability and this golf sample floor: 3 scores =
                  5%, 4 = 15%, 5 = 25%, then +10 points per additional score,
                  capped at 100%. Player variance is partially pooled with the
                  tee-and-hole variance. A {report.studentTDegreesOfFreedom}
                  -degree-of-freedom Student-t model makes the learned club prior
                  resistant to one unusual player. The learned club prior is {performanceIndex(
                    report.priorPerformanceIndex
                  )}, with a {performanceIndex(
                    report.priorStandardDeviationPoints
                  )}-point standard deviation. Small allowances, volatile holes,
                  and small samples receive more of the limited adjustment toward
                  the prior.
                  Rank #1 is the {isBest ? "lowest" : "highest"} adjusted index.
                  Each player needs at least
                  {` ${report.minimumScores} `}scores on this exact tee and hole.
                  Club averages weight each qualifying player equally. Combo tees
                  are excluded from these four single-tee groups.
                </Text>
              </View>

              <View style={s.table}>
                <SummaryHeader view={view} />
                {tee.holes.map((hole, index) => (
                  <SummaryRow
                    key={hole.holeNumber}
                    hole={hole}
                    index={index}
                    view={view}
                  />
                ))}
              </View>

              <Text style={s.note}>
                This report is a relative performance screen, not an automatic
                handicap adjustment. It does not change any player&apos;s official
                GHIN Handicap Index. The following pages show every qualifying
                player&apos;s rank on all 18 holes.
              </Text>
              <Footer generatedAt={report.generatedAt} view={view} />
            </Page>

            {playerPages.map((pagePlayers, pageIndex) => (
              <Page
                key={`${tee.tee}-${pageIndex}`}
                size="LETTER"
                orientation="landscape"
                style={s.matrixPage}
                wrap={false}
              >
                <View style={s.header}>
                  <View>
                    <Text style={s.matrixTitle}>
                      {teeDisplayName} Tees - Every Player on Every Hole
                    </Text>
                    <Text style={s.subtitle}>
                      Players {pageIndex * PLAYERS_PER_MATRIX_PAGE + 1}-
                      {pageIndex * PLAYERS_PER_MATRIX_PAGE + pagePlayers.length} of{" "}
                      {players.length}, ordered by average {view} percentile -{" "}
                      {teeSpecifications(tee)} -{" "}
                      {report.periodStart} through {report.periodEnd}
                    </Text>
                  </View>
                  <Text style={[s.teeBadge, teeBadgeStyle(tee.tee)]}>
                    {teeDisplayName.toUpperCase()} TEES
                  </Text>
                </View>

                <Text style={s.legend}>
                  Each cell shows #{view}{" "}club rank and actual average hole score.
                  Colors compare holes within each player&apos;s row using club
                  percentile: green = best 3, yellow = next-best 3, red = worst
                  3, and all other holes are neutral. With fewer than 9 qualifying
                  holes, the three groups are reduced evenly so colors never
                  overlap. A dash means fewer than
                  {` ${report.minimumScores} `}qualifying scores. Avg {isBest ? "Best" : "Worst"} %
                  summarizes the holes on which the player qualifies; 100 is{" "}
                  {view}. 12M Rds is the player&apos;s number of distinct imported
                  rounds on this tee in the report period.
                </Text>

                <View style={s.matrixTable}>
                  <View style={s.matrixHeaderRow}>
                    <View style={s.matrixPlayer}>
                      <Text style={s.matrixHeaderText}>Player</Text>
                    </View>
                    <View style={s.matrixOverall}>
                      <Text style={s.matrixHeaderText}>
                        Avg {isBest ? "Best" : "Worst"} %
                      </Text>
                    </View>
                    <View style={s.matrixHandicap}>
                      <Text style={s.matrixHeaderText}>Current HI</Text>
                    </View>
                    <View style={s.matrixRounds}>
                      <Text style={s.matrixHeaderText}>12M Rds</Text>
                    </View>
                    {tee.holes.map((hole) => (
                      <View key={hole.holeNumber} style={s.matrixHole}>
                        <Text style={s.matrixHeaderText}>H{hole.holeNumber}</Text>
                        <Text style={s.matrixHeaderText}>
                          P{hole.par ?? "-"}/SI{hole.strokeIndex ?? "-"}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {pagePlayers.length ? (
                    pagePlayers.map((player, rowIndex) => (
                      <View
                        key={player.playerId}
                        style={[s.matrixRow, rowIndex % 2 ? s.rowAlt : {}]}
                        wrap={false}
                      >
                        <View style={s.matrixPlayer}>
                          <Text>{player.playerName}</Text>
                        </View>
                        <View style={s.matrixOverall}>
                          <Text style={s.matrixRank}>
                            {player.averagePercentile.toFixed(0)}
                          </Text>
                        </View>
                        <View style={s.matrixHandicap}>
                          <Text style={s.matrixRank}>
                            {handicapIndex(player.currentHandicapIndex)}
                          </Text>
                        </View>
                        <View style={s.matrixRounds}>
                          <Text style={s.matrixRank}>{player.teeRoundCount}</Text>
                        </View>
                        {tee.holes.map((hole) => (
                          <MatrixCell
                            key={hole.holeNumber}
                            ranking={player.cells.get(hole.holeNumber)}
                            tier={player.holeTiers.get(hole.holeNumber)}
                            view={view}
                          />
                        ))}
                      </View>
                    ))
                  ) : (
                    <Text style={s.empty}>
                      No players currently meet the three-score minimum on this tee.
                    </Text>
                  )}
                </View>

                <Footer generatedAt={report.generatedAt} view={view} matrix />
              </Page>
            ))}
          </React.Fragment>
        );
      })}
    </Document>
  );
}
