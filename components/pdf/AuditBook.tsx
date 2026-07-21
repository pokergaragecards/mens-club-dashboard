import React from "react";
import {
  Document,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  AuditBreakdownRow,
  AuditPlayerReport,
  AuditReport,
  AuditTrendPoint,
} from "@/lib/auditReportService";

const s = StyleSheet.create({
  page: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 24,
    fontFamily: "Helvetica",
    fontSize: 7,
    color: "#17211b",
  },
  cover: {
    padding: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f3f8f4",
  },
  title: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#14532d",
  },
  subtitle: { marginTop: 10, fontSize: 18, color: "#374151" },
  meta: {
    marginTop: 28,
    width: 330,
    padding: 16,
    borderWidth: 1,
    borderColor: "#86a88f",
    backgroundColor: "#fff",
  },
  metaText: { marginBottom: 7, fontSize: 11, textAlign: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#166534",
    paddingBottom: 5,
    marginBottom: 6,
  },
  name: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#14532d",
  },
  muted: { marginTop: 2, color: "#4b5563" },
  flag: {
    padding: 5,
    borderWidth: 1,
    borderColor: "#92400e",
    backgroundColor: "#fef3c7",
    fontFamily: "Helvetica-Bold",
  },
  cards: { flexDirection: "row", gap: 5, marginBottom: 6 },
  card: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 6,
    borderWidth: 1,
    borderColor: "#cbd5d1",
    backgroundColor: "#f8faf9",
  },
  cardLabel: { fontSize: 6, color: "#52605a", marginBottom: 2 },
  cardValue: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  advantageRed: {
    color: "#b91c1c",
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
  },
  advantageOrange: {
    color: "#c2410c",
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
  },
  advantageNormal: {
    color: "#111827",
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
  },
  rankBadge: {
    marginRight: 8,
    minWidth: 30,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#166534",
    backgroundColor: "#e8f1eb",
    color: "#14532d",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "center",
  },
  investigateFlag: {
    color: "#991b1b",
    borderColor: "#b91c1c",
    backgroundColor: "#fee2e2",
  },
  reviewFlag: {
    color: "#9a3412",
    borderColor: "#c2410c",
    backgroundColor: "#ffedd5",
  },
  noActionFlag: {
    color: "#166534",
    borderColor: "#15803d",
    backgroundColor: "#dcfce7",
  },
  chart: {
    height: 100,
    borderWidth: 1,
    borderColor: "#cbd5d1",
    padding: 5,
    marginBottom: 6,
  },
  section: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#14532d",
    marginBottom: 3,
  },
  breakdown: {
    borderWidth: 1,
    borderColor: "#cbd5d1",
    marginBottom: 6,
  },
  breakdownHead: {
    flexDirection: "row",
    minHeight: 16,
    alignItems: "center",
    backgroundColor: "#e5e7eb",
    borderBottomWidth: 0.6,
    borderBottomColor: "#6b7280",
    fontFamily: "Helvetica-Bold",
  },
  breakdownRow: {
    flexDirection: "row",
    minHeight: 22,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
  },
  bGroup: { width: "19%", padding: 3 },
  bRounds: { width: "6%", padding: 3, textAlign: "right" },
  bUsed: { width: "5%", padding: 3, textAlign: "right" },
  bHi: { width: "8%", padding: 3, textAlign: "right" },
  bAvg: { width: "10%", padding: 3, textAlign: "right" },
  bScores: { width: "20%", padding: 3, fontSize: 5.7 },
  bDiffs: { width: "32%", padding: 3, fontSize: 5.7 },
  row: {
    flexDirection: "row",
    minHeight: 12,
    alignItems: "center",
    borderBottomWidth: 0.4,
    borderBottomColor: "#d9e0dc",
  },
  th: { backgroundColor: "#e8f1eb", fontFamily: "Helvetica-Bold" },
  date: { width: "12%", padding: 2 },
  course: { width: "38%", padding: 2 },
  tee: { width: "12%", padding: 2 },
  score: { width: "10%", padding: 2, textAlign: "right" },
  diff: { width: "10%", padding: 2, textAlign: "right" },
  type: { width: "18%", padding: 2 },
  comp: { color: "#15803d", fontFamily: "Helvetica-Bold" },
  used: { fontFamily: "Helvetica-Bold" },
  notes: {
    marginTop: 5,
    height: 44,
    borderWidth: 1,
    borderColor: "#9ca3af",
    padding: 5,
  },
  footer: {
    position: "absolute",
    bottom: 7,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#6b7280",
    fontSize: 6,
  },
  summaryPlayer: { width: "35%", padding: 5 },
  summaryNum: { width: "13%", padding: 5, textAlign: "right" },
  summaryFlag: { width: "13%", padding: 5 },
});

const n = (value: number | null) =>
  value == null ? "-" : value.toFixed(1);

const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });

function Footer({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>Goodrich Men's Club Handicap Committee Audit</Text>
      <Text>
        Generated {new Date(generatedAt).toLocaleDateString("en-US")} · Page{" "}
        <Text render={({ pageNumber }) => `${pageNumber}`} />
      </Text>
    </View>
  );
}

function linePath(
  points: AuditTrendPoint[],
  minTime: number,
  maxTime: number,
  minValue: number,
  maxValue: number
) {
  const width = 535;
  const height = 62;
  const xPad = 16;
  const yPad = 7;

  return points
    .map((point, index) => {
      const time = new Date(`${point.date}T00:00:00`).getTime();
      const x =
        xPad +
        ((time - minTime) / Math.max(1, maxTime - minTime)) *
          (width - xPad * 2);
      const y =
        yPad +
        ((maxValue - point.handicapIndex) /
          Math.max(1, maxValue - minValue)) *
          (height - yPad * 2);

      return `${index ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function Chart({ player }: { player: AuditPlayerReport }) {
  const all = [...player.competitionTrend, ...player.generalTrend];

  if (!all.length) {
    return <Text>No trend data available.</Text>;
  }

  const times = all.map((point) =>
    new Date(`${point.date}T00:00:00`).getTime()
  );
  const values = all.map((point) => point.handicapIndex);

  if (player.currentIndex !== null) values.push(player.currentIndex);

  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minValue = Math.floor(Math.min(...values) - 1);
  const maxValue = Math.ceil(Math.max(...values) + 1);

  const currentY =
    player.currentIndex === null
      ? null
      : 7 +
        ((maxValue - player.currentIndex) /
          Math.max(1, maxValue - minValue)) *
          48;

  return (
    <View>
      <View style={{ flexDirection: "row", marginBottom: 2 }}>
        <Text style={{ color: "#15803d", marginRight: 12 }}>
          Competition HI
        </Text>
        <Text style={{ color: "#6b7280", marginRight: 12 }}>
          General Play HI
        </Text>
        <Text style={{ color: "#2563eb" }}>Current GHIN HI</Text>
      </View>

      <Svg width={535} height={62}>
        {[0, 1, 2, 3].map((index) => (
          <Path
            key={index}
            d={`M 16 ${7 + index * 16} L 519 ${7 + index * 16}`}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}

        {currentY !== null && (
          <Path
            d={`M 16 ${currentY} L 519 ${currentY}`}
            stroke="#2563eb"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
        )}

        {!!player.generalTrend.length && (
          <Path
            d={linePath(
              player.generalTrend,
              minTime,
              maxTime,
              minValue,
              maxValue
            )}
            stroke="#6b7280"
            strokeWidth={1.6}
            fill="none"
          />
        )}

        {!!player.competitionTrend.length && (
          <Path
            d={linePath(
              player.competitionTrend,
              minTime,
              maxTime,
              minValue,
              maxValue
            )}
            stroke="#15803d"
            strokeWidth={1.8}
            fill="none"
          />
        )}
      </Svg>
    </View>
  );
}

function Card({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={s.card}>
      <Text style={s.cardLabel}>{label}</Text>
      <Text style={[s.cardValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function advantageStyle(difference: number | null) {
  if (difference !== null && difference >= 1.5) return s.advantageRed;
  if (difference !== null && difference >= 1.0) return s.advantageOrange;
  return s.advantageNormal;
}

function flagStyle(flag: AuditPlayerReport["flag"]) {
  if (flag === "INVESTIGATE") return s.investigateFlag;
  if (flag === "REVIEW") return s.reviewFlag;
  return s.noActionFlag;
}

function NumberList({
  values,
  usedValues,
}: {
  values: number[];
  usedValues?: number[];
}) {
  return (
    <Text>
      {values.map((value, index) => {
        const isUsed = usedValues?.includes(value) ?? false;

        return (
          <Text key={`${value}-${index}`} style={isUsed ? s.used : {}}>
            {value.toFixed(1)}
            {index < values.length - 1 ? "  " : ""}
          </Text>
        );
      })}
    </Text>
  );
}

function ScoreList({ values }: { values: number[] }) {
  return (
    <Text>
      {values.map((value, index) => (
        <Text key={`${value}-${index}`}>
          {value}
          {index < values.length - 1 ? "  " : ""}
        </Text>
      ))}
    </Text>
  );
}

function BreakdownTable({
  rows,
}: {
  rows: AuditBreakdownRow[];
}) {
  return (
    <View>
      <Text style={s.section}>Last 20 Official Handicap Round Breakdown</Text>

      <View style={s.breakdown}>
        <View style={s.breakdownHead}>
          <Text style={s.bGroup}>Group</Text>
          <Text style={s.bRounds}>Rounds</Text>
          <Text style={s.bUsed}>Used</Text>
          <Text style={s.bHi}>Calc HI</Text>
          <Text style={s.bAvg}>Avg Diff</Text>
          <Text style={s.bScores}>Scores</Text>
          <Text style={s.bDiffs}>Differentials</Text>
        </View>

        {rows.map((row) => (
          <View style={s.breakdownRow} key={row.label}>
            <Text style={[s.bGroup, { fontFamily: "Helvetica-Bold" }]}>
              {row.label}
            </Text>
            <Text style={s.bRounds}>{row.rounds}</Text>
            <Text style={s.bUsed}>{row.used}</Text>
            <Text style={s.bHi}>{n(row.calculatedHi)}</Text>
            <Text style={s.bAvg}>{n(row.averageDifferential)}</Text>
            <View style={s.bScores}>
              <ScoreList values={row.scores} />
            </View>
            <View style={s.bDiffs}>
              <NumberList
                values={row.differentials}
                usedValues={row.usedDifferentials}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function PlayerPage({
  player,
  generatedAt,
  rank,
}: {
  player: AuditPlayerReport;
  generatedAt: string;
  rank: number;
}) {
  return (
    <Page size="LETTER" style={s.page} wrap={false}>
      <View style={s.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={s.rankBadge}>#{rank}</Text>
          <View>
            <Text style={s.name}>{player.name}</Text>
            <Text style={s.muted}>
              GHIN #{player.ghinNumber ?? "-"} · {player.competitionRounds}{" "}
              competition · {player.generalRounds} general play
            </Text>
          </View>
        </View>

        <Text style={[s.flag, flagStyle(player.flag)]}>{player.flag}</Text>
      </View>

      <View style={s.cards}>
        <Card label="CURRENT GHIN HI" value={n(player.currentIndex)} />
        <Card label="COMPETITION HI" value={n(player.competitionIndex)} />
        <Card label="GENERAL PLAY HI" value={n(player.generalIndex)} />
        <Card
          label="COMPETITION ADVANTAGE VS GHIN"
          value={
            player.difference === null
              ? "-"
              : `${Math.max(0, player.difference).toFixed(1)} STROKES`
          }
          valueStyle={advantageStyle(player.difference)}
        />
      </View>

      <View style={s.chart}>
        <Text style={s.section}>Rolling Category Handicap Index</Text>
        <Chart player={player} />
      </View>

      <BreakdownTable rows={player.breakdown} />

      <Text style={s.section}>Last 20 Official Handicap Rounds</Text>

      <View style={[s.row, s.th]}>
        <Text style={s.date}>Date</Text>
        <Text style={s.course}>Course</Text>
        <Text style={s.tee}>Tee</Text>
        <Text style={s.score}>Score</Text>
        <Text style={s.diff}>Diff</Text>
        <Text style={s.type}>Category</Text>
      </View>

      {player.rounds.map((round) => (
        <View style={s.row} key={round.id}>
          <Text style={s.date}>{shortDate(round.playedAt)}</Text>
          <Text style={s.course}>{round.courseName}</Text>
          <Text style={s.tee}>{round.teeName}</Text>
          <Text
            style={[
              s.score,
              round.category === "Competition" ? s.comp : {},
            ]}
          >
            {round.score ?? "-"}
          </Text>
          <Text style={[s.diff, round.usedInCalculation ? s.used : {}]}>
            {round.differential.toFixed(1)}
          </Text>
          <Text
            style={[
              s.type,
              round.category === "Competition" ? s.comp : {},
            ]}
          >
            {round.category}
          </Text>
        </View>
      ))}

      <View style={s.notes}>
        <Text style={s.section}>Committee Action</Text>
        <Text>
          □ No change   □ Monitor   □ Adjust Handicap Index to: ________
        </Text>
        <Text style={{ marginTop: 6 }}>
          Reason / notes: _________________________________________________
        </Text>
      </View>

      <Footer generatedAt={generatedAt} />
    </Page>
  );
}

function Summary({
  report,
  title,
}: {
  report: AuditReport;
  title: string;
}) {
  return (
    <Page size="LETTER" style={s.page}>
      <Text style={[s.title, { fontSize: 20, marginBottom: 12 }]}>
        {title}
      </Text>

      <View style={[s.row, s.th]}>
        <Text style={s.summaryPlayer}>Player</Text>
        <Text style={s.summaryNum}>Current</Text>
        <Text style={s.summaryNum}>Comp</Text>
        <Text style={s.summaryNum}>General</Text>
        <Text style={s.summaryNum}>Comp Advantage</Text>
        <Text style={s.summaryFlag}>Flag</Text>
      </View>

      {report.players.map((player) => (
        <View style={s.row} key={player.id}>
          <Text style={s.summaryPlayer}>{player.name}</Text>
          <Text style={s.summaryNum}>{n(player.currentIndex)}</Text>
          <Text style={s.summaryNum}>{n(player.competitionIndex)}</Text>
          <Text style={s.summaryNum}>{n(player.generalIndex)}</Text>
          <Text style={[s.summaryNum, advantageStyle(player.difference)]}>
            {player.difference === null
              ? "-"
              : Math.max(0, player.difference).toFixed(1)}
          </Text>
          <Text style={[s.summaryFlag, flagStyle(player.flag)]}>
            {player.flag}
          </Text>
        </View>
      ))}

      <Footer generatedAt={report.generatedAt} />
    </Page>
  );
}

export function AuditBook({ report }: { report: AuditReport }) {
  return (
    <Document title="Goodrich Men's Club Handicap Committee Audit">
      <Page size="LETTER" style={s.cover}>
        <Text style={s.title}>Goodrich Men's Club</Text>
        <Text style={s.subtitle}>Handicap Committee Audit</Text>

        <View style={s.meta}>
          <Text style={s.metaText}>
            Generated: {new Date(report.generatedAt).toLocaleString("en-US")}
          </Text>
          <Text style={s.metaText}>
            Players reviewed: {report.players.length}
          </Text>
          <Text style={s.metaText}>
            Includes players with at least 5 competition scores. Ranked by Current GHIN HI minus Competition HI.
          </Text>
        </View>
      </Page>

      <Summary report={report} title="Competition Handicap Audit Ranking" />

      {report.players.map((player, index) => (
        <PlayerPage
          key={player.id}
          player={player}
          generatedAt={report.generatedAt}
          rank={index + 1}
        />
      ))}

      <Summary report={report} title="Final Committee Summary" />
    </Document>
  );
}
