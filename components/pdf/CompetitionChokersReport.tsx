import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

export type CompetitionChokerRow = {
  id: string;
  name: string;
  currentIndex: number | null;
  competitionIndex: number;
  last12MonthsCompetitionIndex: number | null;
  generalPlayIndex: number;
  competitionPenalty: number;
  competitionRounds: number;
  generalPlayRounds: number;
  competitionAverageDifferential: number | null;
  generalPlayAverageDifferential: number | null;
};

export type CompetitionChokersReportData = {
  generatedAt: string;
  players: CompetitionChokerRow[];
};

const COLORS = {
  navy: "#172554",
  blue: "#1d4ed8",
  blue50: "#eff6ff",
  amber: "#b45309",
  amber100: "#fef3c7",
  red: "#b91c1c",
  red50: "#fef2f2",
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

const s = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    fontSize: 7,
    color: COLORS.gray900,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    fontSize: 23,
    fontFamily: "Helvetica-Bold",
    color: COLORS.navy,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 9,
    color: COLORS.gray600,
  },
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.amber,
    backgroundColor: COLORS.amber100,
    color: COLORS.amber,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  method: {
    marginBottom: 10,
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
    fontSize: 7,
    lineHeight: 1.35,
    color: COLORS.gray700,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  row: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.gray300,
  },
  rowAlt: {
    backgroundColor: "#fafafa",
  },
  rowTop: {
    backgroundColor: COLORS.red50,
  },
  headerRow: {
    minHeight: 24,
    backgroundColor: COLORS.navy,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
  },
  cell: {
    paddingHorizontal: 4,
  },
  rank: {
    width: 30,
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  player: {
    width: 130,
    fontSize: 8.4,
    fontFamily: "Helvetica-Bold",
  },
  number: {
    width: 50,
    textAlign: "right",
    fontSize: 8.2,
  },
  recent: {
    width: 55,
    textAlign: "right",
    fontSize: 8.2,
  },
  penalty: {
    width: 65,
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.red,
  },
  rounds: {
    width: 50,
    textAlign: "right",
    fontSize: 8.2,
  },
  reason: {
    width: 206,
    fontSize: 6.4,
    lineHeight: 1.3,
    color: COLORS.gray700,
  },
  headerText: {
    fontSize: 6.2,
    lineHeight: 1.2,
  },
  headerRank: { width: 30, textAlign: "center" },
  headerPlayer: { width: 130 },
  headerNumber: { width: 50, textAlign: "right" },
  headerRecent: { width: 55, textAlign: "right" },
  headerPenalty: { width: 65, textAlign: "right" },
  headerRounds: { width: 50, textAlign: "right" },
  headerReason: { width: 206 },
  empty: {
    padding: 30,
    textAlign: "center",
    fontSize: 12,
    color: COLORS.gray600,
  },
  note: {
    marginTop: 8,
    padding: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.amber,
    backgroundColor: "#fffbeb",
    fontSize: 6.5,
    lineHeight: 1.3,
    color: COLORS.gray700,
  },
  footer: {
    position: "absolute",
    bottom: 9,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    color: COLORS.gray600,
    fontSize: 6,
  },
});

function n(value: number | null) {
  return value == null || !Number.isFinite(value) ? "-" : value.toFixed(1);
}

function reasonFor(player: CompetitionChokerRow) {
  const averageComparison =
    player.competitionAverageDifferential != null &&
    player.generalPlayAverageDifferential != null
      ? ` Average differential: ${player.competitionAverageDifferential.toFixed(1)} competition vs ${player.generalPlayAverageDifferential.toFixed(1)} general play.`
      : "";

  return `Competition HI is ${player.competitionPenalty.toFixed(1)} strokes higher than General Play HI.${averageComparison}`;
}

function HeaderCell({
  style,
  children,
}: {
  style:
    | typeof s.headerRank
    | typeof s.headerPlayer
    | typeof s.headerNumber
    | typeof s.headerRecent
    | typeof s.headerPenalty
    | typeof s.headerRounds
    | typeof s.headerReason;
  children: React.ReactNode;
}) {
  return (
    <Text style={[s.cell, s.headerText, style]}>{children}</Text>
  );
}

export function CompetitionChokersReport({
  report,
}: {
  report: CompetitionChokersReportData;
}) {
  return (
    <Document title="Goodrich Top 10 Competition Chokers">
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Top 10 Competition Chokers</Text>
            <Text style={s.subtitle}>
              Goodrich Men&apos;s Club - competition performance compared with
              general play
            </Text>
          </View>
          <Text style={s.badge}>THE OPPOSITE AUDIT</Text>
        </View>

        <View style={s.method}>
          <Text style={s.methodTitle}>HOW THE RANKING WORKS</Text>
          <Text style={s.methodText}>
            Competition Penalty = Last 20 Competition HI minus Last 20 General
            Play HI. A higher positive value means the player has performed
            worse in competition. Players need at least 5 eligible competition
            rounds and 5 general-play rounds. Only positive gaps qualify; the
            top 10 are shown.
          </Text>
        </View>

        <View style={s.table}>
          <View style={[s.row, s.headerRow]}>
            <HeaderCell style={s.headerRank}>Rank</HeaderCell>
            <HeaderCell style={s.headerPlayer}>Player</HeaderCell>
            <HeaderCell style={s.headerNumber}>Current HI</HeaderCell>
            <HeaderCell style={s.headerNumber}>Comp HI</HeaderCell>
            <HeaderCell style={s.headerRecent}>12 Mo. Comp</HeaderCell>
            <HeaderCell style={s.headerNumber}>General HI</HeaderCell>
            <HeaderCell style={s.headerPenalty}>Penalty</HeaderCell>
            <HeaderCell style={s.headerRounds}>Comp Rds</HeaderCell>
            <HeaderCell style={s.headerRounds}>GP Rds</HeaderCell>
            <HeaderCell style={s.headerReason}>Why ranked here</HeaderCell>
          </View>

          {report.players.length ? (
            report.players.map((player, index) => (
              <View
                key={player.id}
                style={[
                  s.row,
                  index % 2 === 1 ? s.rowAlt : {},
                  index < 3 ? s.rowTop : {},
                ]}
                wrap={false}
              >
                <Text style={[s.cell, s.rank]}>#{index + 1}</Text>
                <Text style={[s.cell, s.player]}>{player.name}</Text>
                <Text style={[s.cell, s.number]}>{n(player.currentIndex)}</Text>
                <Text style={[s.cell, s.number]}>
                  {n(player.competitionIndex)}
                </Text>
                <Text style={[s.cell, s.recent]}>
                  {n(player.last12MonthsCompetitionIndex)}
                </Text>
                <Text style={[s.cell, s.number]}>
                  {n(player.generalPlayIndex)}
                </Text>
                <Text style={[s.cell, s.penalty]}>
                  +{player.competitionPenalty.toFixed(1)}
                </Text>
                <Text style={[s.cell, s.rounds]}>
                  {player.competitionRounds}
                </Text>
                <Text style={[s.cell, s.rounds]}>
                  {player.generalPlayRounds}
                </Text>
                <Text style={[s.cell, s.reason]}>{reasonFor(player)}</Text>
              </View>
            ))
          ) : (
            <Text style={s.empty}>
              No players currently meet the sample and positive-gap criteria.
            </Text>
          )}
        </View>

        <Text style={s.note}>
          The title is intentionally playful. This is a data-screening report,
          not a character judgment or an automatic handicap recommendation.
          Category Handicap Indexes do not replace a player&apos;s official GHIN
          Handicap Index.
        </Text>

        <View style={s.footer} fixed>
          <Text>Goodrich Men&apos;s Club Handicap Audit</Text>
          <Text>
            Generated {new Date(report.generatedAt).toLocaleDateString("en-US")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
