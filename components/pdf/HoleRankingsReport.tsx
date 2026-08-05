import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type {
  HoleRanking,
  HoleRankingReport,
  PlayerHoleRanking,
  TeeHoleRankings,
} from "@/services/holeRankingService";

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

const MATRIX_PLAYER_WIDTH = 112;
const MATRIX_OVERALL_WIDTH = 54;
const MATRIX_HOLE_WIDTH = 32.45;
const PLAYERS_PER_MATRIX_PAGE = 24;

const s = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 22,
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
    marginBottom: 9,
    padding: 8,
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
    fontSize: 6.7,
    lineHeight: 1.35,
    color: COLORS.gray700,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  summaryRow: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.gray300,
  },
  headerRow: {
    backgroundColor: COLORS.navy,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
  },
  rowAlt: {
    backgroundColor: "#fafafa",
  },
  cell: {
    paddingHorizontal: 4,
  },
  summaryHole: { width: 44, textAlign: "center", fontFamily: "Helvetica-Bold" },
  summaryPar: { width: 42, textAlign: "center" },
  summaryStroke: { width: 54, textAlign: "center" },
  summaryYardage: { width: 54, textAlign: "right" },
  summaryPlayer: { width: 176, fontSize: 8, fontFamily: "Helvetica-Bold" },
  summaryValue: {
    width: 82,
    textAlign: "right",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.red,
  },
  summaryScores: { width: 64, textAlign: "right" },
  summaryField: { width: 72, textAlign: "right" },
  summaryClub: { width: 92, textAlign: "right" },
  note: {
    marginTop: 8,
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.amber,
    backgroundColor: COLORS.amber50,
    fontSize: 6.4,
    lineHeight: 1.3,
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
    minHeight: 18,
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
  matrixValue: {
    marginTop: 1,
    fontSize: 5.3,
  },
  rankWorst: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },
  rankTopThree: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
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

type MatrixPlayer = {
  playerId: string;
  playerName: string;
  averageWorstPercentile: number;
  cells: Map<number, PlayerHoleRanking>;
};

function multiplier(value: number | null, decimals = 2) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(decimals)}x`;
}

function teeBadgeStyle(tee: TeeHoleRankings["tee"]) {
  if (tee === "Red") {
    return { borderColor: "#b91c1c", backgroundColor: "#fee2e2", color: "#991b1b" };
  }
  if (tee === "Yellow") {
    return { borderColor: "#d97706", backgroundColor: "#fef3c7", color: "#92400e" };
  }
  if (tee === "Blue") {
    return { borderColor: "#1d4ed8", backgroundColor: "#dbeafe", color: "#1e40af" };
  }
  return { borderColor: "#4b5563", backgroundColor: "#ffffff", color: "#111827" };
}

function matrixPlayers(tee: TeeHoleRankings): MatrixPlayer[] {
  const players = new Map<string, MatrixPlayer>();

  for (const hole of tee.holes) {
    for (const ranking of hole.players) {
      const current = players.get(ranking.playerId) ?? {
        playerId: ranking.playerId,
        playerName: ranking.playerName,
        averageWorstPercentile: 0,
        cells: new Map<number, PlayerHoleRanking>(),
      };
      current.cells.set(hole.holeNumber, ranking);
      players.set(ranking.playerId, current);
    }
  }

  return Array.from(players.values())
    .map((player) => ({
      ...player,
      averageWorstPercentile:
        Array.from(player.cells.values()).reduce(
          (sum, cell) => sum + cell.worstPercentile,
          0
        ) / player.cells.size,
    }))
    .sort((a, b) => {
      if (a.averageWorstPercentile !== b.averageWorstPercentile) {
        return b.averageWorstPercentile - a.averageWorstPercentile;
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

function SummaryHeader() {
  return (
    <View style={[s.summaryRow, s.headerRow]}>
      <Text style={[s.cell, s.summaryHole]}>Hole</Text>
      <Text style={[s.cell, s.summaryPar]}>Par</Text>
      <Text style={[s.cell, s.summaryStroke]}>Stroke Idx</Text>
      <Text style={[s.cell, s.summaryYardage]}>Yards</Text>
      <Text style={[s.cell, s.summaryPlayer]}>Worst by Multiplier</Text>
      <Text style={[s.cell, s.summaryValue]}>Multiplier</Text>
      <Text style={[s.cell, s.summaryScores]}>Scores</Text>
      <Text style={[s.cell, s.summaryField]}>Players</Text>
      <Text style={[s.cell, s.summaryClub]}>Club Mult.</Text>
    </View>
  );
}

function SummaryRow({ hole, index }: { hole: HoleRanking; index: number }) {
  const worst = hole.players[0];

  return (
    <View style={[s.summaryRow, index % 2 ? s.rowAlt : {}]} wrap={false}>
      <Text style={[s.cell, s.summaryHole]}>{hole.holeNumber}</Text>
      <Text style={[s.cell, s.summaryPar]}>{hole.par ?? "-"}</Text>
      <Text style={[s.cell, s.summaryStroke]}>{hole.strokeIndex ?? "-"}</Text>
      <Text style={[s.cell, s.summaryYardage]}>{hole.yardage ?? "-"}</Text>
      <Text style={[s.cell, s.summaryPlayer]}>
        {worst?.playerName ?? "No qualifying player"}
      </Text>
      <Text style={[s.cell, s.summaryValue]}>
        {multiplier(worst?.performanceMultiplier ?? null)}
      </Text>
      <Text style={[s.cell, s.summaryScores]}>{worst?.scoreCount ?? "-"}</Text>
      <Text style={[s.cell, s.summaryField]}>{hole.players.length}</Text>
      <Text style={[s.cell, s.summaryClub]}>
        {multiplier(hole.clubAverageMultiplier)}
      </Text>
    </View>
  );
}

function MatrixCell({ ranking }: { ranking: PlayerHoleRanking | undefined }) {
  if (!ranking) {
    return (
      <View style={s.matrixHole}>
        <Text style={s.missing}>-</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        s.matrixHole,
        ranking.rank === 1 ? s.rankWorst : {},
        ranking.rank > 1 && ranking.rank <= 3 ? s.rankTopThree : {},
      ]}
    >
      <Text style={s.matrixRank}>#{ranking.rank}</Text>
      <Text style={s.matrixValue}>
        {multiplier(ranking.performanceMultiplier, 2)}
      </Text>
    </View>
  );
}

function Footer({ generatedAt, matrix = false }: { generatedAt: string; matrix?: boolean }) {
  const generatedDate = new Date(generatedAt).toLocaleDateString("en-US");

  return (
    <View style={matrix ? s.matrixFooter : s.footer} fixed>
      <Text>Goodrich Men&apos;s Club - handicap-adjusted hole rankings</Text>
      <Text
        render={({ pageNumber }) =>
          `Generated ${generatedDate} | Page ${pageNumber}`
        }
      />
    </View>
  );
}

export function HoleRankingsReport({ report }: { report: HoleRankingReport }) {
  return (
    <Document title="Goodrich Handicap-Adjusted Hole Rankings">
      {report.tees.map((tee) => {
        const players = matrixPlayers(tee);
        const playerPages = chunks(players, PLAYERS_PER_MATRIX_PAGE);

        return (
          <React.Fragment key={tee.tee}>
            <Page size="LETTER" orientation="landscape" style={s.page}>
              <View style={s.header}>
                <View>
                  <Text style={s.title}>Worst Player by Goodrich Hole</Text>
                  <Text style={s.subtitle}>
                    Handicap-adjusted club comparison - {tee.tee} tees only
                  </Text>
                </View>
                <Text style={[s.teeBadge, teeBadgeStyle(tee.tee)]}>
                  {tee.tee.toUpperCase()} TEES
                </Text>
              </View>

              <View style={s.method}>
                <Text style={s.methodTitle}>METHOD AND ELIGIBILITY</Text>
                <Text style={s.methodText}>
                  Expected score = hole par + Course Handicap strokes allocated
                  by stroke index. Performance Multiplier = Average Gross Score
                  divided by Average Expected Score. 1.00x matches expectation;
                  higher is worse and lower is better. Rank #1 is the highest
                  multiplier. Each player needs at least
                  {` ${report.minimumScores} `}scores on this exact tee and hole.
                  Club averages weight each qualifying player equally. Combo tees
                  are excluded from these four single-tee groups.
                </Text>
              </View>

              <View style={s.table}>
                <SummaryHeader />
                {tee.holes.map((hole, index) => (
                  <SummaryRow key={hole.holeNumber} hole={hole} index={index} />
                ))}
              </View>

              <Text style={s.note}>
                This report is a relative performance screen, not an automatic
                handicap adjustment. It does not change any player&apos;s official
                GHIN Handicap Index. The following pages show every qualifying
                player&apos;s rank on all 18 holes.
              </Text>
              <Footer generatedAt={report.generatedAt} />
            </Page>

            {playerPages.map((pagePlayers, pageIndex) => (
              <Page
                key={`${tee.tee}-${pageIndex}`}
                size="LETTER"
                orientation="landscape"
                style={s.matrixPage}
              >
                <View style={s.header}>
                  <View>
                    <Text style={s.matrixTitle}>
                      {tee.tee} Tees - Every Player on Every Hole
                    </Text>
                    <Text style={s.subtitle}>
                      Players {pageIndex * PLAYERS_PER_MATRIX_PAGE + 1}-
                      {pageIndex * PLAYERS_PER_MATRIX_PAGE + pagePlayers.length} of{" "}
                      {players.length}, ordered by average worst percentile
                    </Text>
                  </View>
                  <Text style={[s.teeBadge, teeBadgeStyle(tee.tee)]}>
                    {tee.tee.toUpperCase()} TEES
                  </Text>
                </View>

                <Text style={s.legend}>
                  Each cell shows #worst rank and the Performance Multiplier.
                  Red = worst on that hole; amber = ranks 2-3; dash = fewer than
                  {` ${report.minimumScores} `}qualifying scores. 1.00x matches
                  expectation and higher values are worse. Avg Worst % summarizes
                  the holes on which the player qualifies; 100 is worst and 0 is
                  best.
                </Text>

                <View style={s.matrixTable}>
                  <View style={s.matrixHeaderRow}>
                    <View style={s.matrixPlayer}>
                      <Text style={s.matrixHeaderText}>Player</Text>
                    </View>
                    <View style={s.matrixOverall}>
                      <Text style={s.matrixHeaderText}>Avg Worst %</Text>
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
                            {player.averageWorstPercentile.toFixed(0)}
                          </Text>
                        </View>
                        {tee.holes.map((hole) => (
                          <MatrixCell
                            key={hole.holeNumber}
                            ranking={player.cells.get(hole.holeNumber)}
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

                <Footer generatedAt={report.generatedAt} matrix />
              </Page>
            ))}
          </React.Fragment>
        );
      })}
    </Document>
  );
}
