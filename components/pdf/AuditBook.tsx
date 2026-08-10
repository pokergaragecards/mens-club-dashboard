import React from "react";
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type {
  AuditBreakdownRow,
  AuditPlayerReport,
  AuditReport,
} from "@/lib/auditReportService";
import { roundTeeDisplayName } from "@/lib/goodrichTeeDisplay";

const COLORS = {
  green900: "#14532d",
  green800: "#166534",
  green700: "#15803d",
  green200: "#bbf7d0",
  green100: "#dcfce7",
  green50: "#f0fdf4",
  blue700: "#1d4ed8",
  blue100: "#dbeafe",
  blue50: "#eff6ff",
  amber800: "#92400e",
  amber700: "#b45309",
  amber100: "#fef3c7",
  amber50: "#fffbeb",
  orange700: "#c2410c",
  orange100: "#ffedd5",
  red800: "#991b1b",
  red700: "#b91c1c",
  red100: "#fee2e2",
  red50: "#fef2f2",
  gray950: "#111827",
  gray900: "#17211b",
  gray700: "#374151",
  gray600: "#4b5563",
  gray500: "#6b7280",
  gray400: "#9ca3af",
  gray300: "#d1d5db",
  gray200: "#e5e7eb",
  gray100: "#f3f4f6",
  gray50: "#f8faf9",
  white: "#ffffff",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 22,
    paddingHorizontal: 22,
    fontFamily: "Helvetica",
    fontSize: 7,
    color: COLORS.gray900,
    backgroundColor: COLORS.white,
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
    color: COLORS.green900,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 18,
    color: COLORS.gray700,
  },
  meta: {
    marginTop: 28,
    width: 340,
    padding: 16,
    borderWidth: 1,
    borderColor: "#86a88f",
    backgroundColor: COLORS.white,
  },
  metaText: {
    marginBottom: 7,
    fontSize: 11,
    lineHeight: 1.35,
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: COLORS.green800,
    paddingBottom: 5,
    marginBottom: 6,
  },
  playerHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
  },
  rankBadge: {
    marginRight: 8,
    minWidth: 31,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.green900,
    backgroundColor: COLORS.green900,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "center",
  },
  name: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
  },
  muted: {
    marginTop: 2,
    color: COLORS.gray600,
  },
  flag: {
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderWidth: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  decisionBadge: {
    maxWidth: 180,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderWidth: 1,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    textAlign: "center",
  },
  investigateFlag: {
    color: COLORS.red800,
    borderColor: COLORS.red700,
    backgroundColor: COLORS.red100,
  },
  reviewFlag: {
    color: COLORS.orange700,
    borderColor: COLORS.orange700,
    backgroundColor: COLORS.orange100,
  },
  noActionFlag: {
    color: COLORS.green800,
    borderColor: COLORS.green700,
    backgroundColor: COLORS.green100,
  },
  monitorFlag: {
    color: COLORS.amber800,
    borderColor: COLORS.amber700,
    backgroundColor: COLORS.amber100,
  },
  noAdjustmentFlag: {
    color: COLORS.blue700,
    borderColor: COLORS.blue700,
    backgroundColor: COLORS.blue100,
  },
  cards: {
    flexDirection: "row",
    marginBottom: 6,
  },
  card: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 59,
    padding: 6,
    borderWidth: 1,
    borderColor: "#cbd5d1",
    backgroundColor: COLORS.gray50,
    marginRight: 4,
  },
  cardLast: {
    marginRight: 0,
  },
  currentCard: {
    borderColor: COLORS.blue100,
    backgroundColor: COLORS.blue50,
  },
  competitionCard: {
    borderColor: COLORS.green200,
    backgroundColor: COLORS.green50,
  },
  competitionAlertCard: {
    borderColor: "#fca5a5",
    backgroundColor: COLORS.red50,
  },
  competitionAlertLabel: {
    color: COLORS.red700,
  },
  competitionAlertValue: {
    color: COLORS.red700,
  },
  generalCard: {
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.gray50,
  },
  advantageCard: {
    borderColor: "#fed7aa",
    backgroundColor: COLORS.amber50,
  },
  cardLabel: {
    fontSize: 5.9,
    color: COLORS.gray600,
    marginBottom: 3,
    fontFamily: "Helvetica-Bold",
  },
  cardValue: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray950,
  },
  cardComparison: {
    marginTop: 3,
    fontSize: 6.4,
    fontFamily: "Helvetica-Bold",
  },
  cardDescription: {
    marginTop: 2,
    fontSize: 5.4,
    color: COLORS.gray500,
  },
  comparisonGood: {
    color: COLORS.green700,
  },
  comparisonBad: {
    color: COLORS.red700,
  },
  comparisonNeutral: {
    color: COLORS.gray600,
  },
  advantageRed: {
    color: COLORS.red700,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  advantageOrange: {
    color: COLORS.orange700,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  advantageNormal: {
    color: COLORS.gray950,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
  },
  dashboardRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  timelinePanel: {
    width: "52%",
    minHeight: 88,
    marginRight: 5,
    padding: 6,
    borderWidth: 1,
    borderColor: "#cbd5d1",
    backgroundColor: COLORS.white,
  },
  confidencePanel: {
    width: "21%",
    minHeight: 88,
    marginRight: 5,
    padding: 6,
    borderWidth: 1,
    borderColor: "#cbd5d1",
    backgroundColor: COLORS.white,
  },
  recommendationPanel: {
    width: "27%",
    minHeight: 88,
    padding: 6,
    borderWidth: 1,
    borderColor: "#cbd5d1",
    backgroundColor: COLORS.white,
  },
  panelTitle: {
    fontSize: 7.7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
    marginBottom: 4,
  },
  timelineLegend: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 11,
  },
  legendDotCompetition: {
    width: 7,
    height: 7,
    marginRight: 3,
    borderRadius: 4,
    backgroundColor: COLORS.green700,
  },
  legendDotGeneral: {
    width: 7,
    height: 7,
    marginRight: 3,
    borderRadius: 4,
    backgroundColor: COLORS.gray400,
  },
  legendDotUsed: {
    width: 7,
    height: 7,
    marginRight: 3,
    borderRadius: 4,
    borderWidth: 1.4,
    borderColor: COLORS.amber700,
    backgroundColor: COLORS.white,
  },
  timelineTrack: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: COLORS.gray200,
  },
  timelinePoint: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  timelineCompetition: {
    backgroundColor: COLORS.green700,
  },
  timelineGeneral: {
    backgroundColor: COLORS.gray400,
  },
  timelineUsed: {
    borderWidth: 2,
    borderColor: COLORS.amber700,
  },
  timelineDates: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
    color: COLORS.gray600,
    fontSize: 5.6,
  },
  timelineSummary: {
    marginTop: 4,
    color: COLORS.gray600,
    fontSize: 5.6,
  },
  confidenceStars: {
    flexDirection: "row",
    marginBottom: 3,
  },
  confidenceStarOn: {
    fontSize: 12,
    color: COLORS.green800,
  },
  confidenceStarOff: {
    fontSize: 12,
    color: COLORS.gray300,
  },
  confidenceLabel: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
    marginBottom: 4,
  },
  confidenceScore: {
    marginBottom: 3,
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green800,
  },
  evidenceItem: {
    flexDirection: "row",
    marginBottom: 2.5,
  },
  evidenceIcon: {
    width: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green700,
  },
  evidenceWarning: {
    width: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.amber700,
  },
  evidenceText: {
    flexGrow: 1,
    fontSize: 5.7,
    lineHeight: 1.2,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  checkboxChecked: {
    width: 10,
    height: 10,
    marginRight: 4,
    borderWidth: 1,
    borderColor: COLORS.green800,
    backgroundColor: COLORS.green800,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    textAlign: "center",
  },
  checkboxEmpty: {
    width: 10,
    height: 10,
    marginRight: 4,
    borderWidth: 1,
    borderColor: COLORS.gray500,
    backgroundColor: COLORS.white,
    fontSize: 7,
    textAlign: "center",
  },
  recommendationText: {
    flexGrow: 1,
    fontSize: 5.9,
    fontFamily: "Helvetica-Bold",
  },
  recommendationNote: {
    marginTop: 2,
    fontSize: 5.1,
    color: COLORS.gray500,
    lineHeight: 1.25,
  },
  recommendationLabel: {
    fontSize: 8.2,
    lineHeight: 1.2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray950,
  },
  recommendationSuggested: {
    marginTop: 5,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.red700,
  },
  recommendationSummary: {
    marginTop: 4,
    fontSize: 5.3,
    lineHeight: 1.25,
    color: COLORS.gray600,
  },
  insight: {
    marginBottom: 6,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: COLORS.green200,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.green700,
    backgroundColor: COLORS.green50,
    flexDirection: "row",
    alignItems: "center",
  },
  insightAlert: {
    borderColor: "#fca5a5",
    borderLeftColor: COLORS.red700,
    backgroundColor: COLORS.red50,
  },
  insightTitle: {
    width: "18%",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
  },
  insightTitleAlert: {
    color: COLORS.red700,
  },
  insightText: {
    width: "82%",
    fontSize: 6.3,
    lineHeight: 1.3,
    color: COLORS.gray700,
  },
  insightEmphasis: {
    color: COLORS.red700,
    fontFamily: "Helvetica-Bold",
  },
  decisionAnalysis: {
    marginBottom: 6,
    padding: 7,
    borderWidth: 1.2,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.gray50,
  },
  decisionAdjustment: {
    borderColor: COLORS.red700,
    backgroundColor: COLORS.red50,
  },
  decisionProvisional: {
    borderColor: COLORS.orange700,
    backgroundColor: COLORS.orange100,
  },
  decisionManual: {
    borderColor: COLORS.amber700,
    backgroundColor: COLORS.amber50,
  },
  decisionMonitor: {
    borderColor: COLORS.amber700,
    backgroundColor: COLORS.amber50,
  },
  decisionNoAdjustment: {
    borderColor: COLORS.blue700,
    backgroundColor: COLORS.blue50,
  },
  decisionNoAction: {
    borderColor: COLORS.green700,
    backgroundColor: COLORS.green50,
  },
  decisionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  decisionHeaderCopy: {
    flexGrow: 1,
    flexBasis: 0,
    paddingRight: 8,
  },
  decisionEyebrow: {
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray600,
    marginBottom: 2,
  },
  decisionLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray950,
  },
  decisionSummary: {
    marginTop: 3,
    fontSize: 6,
    lineHeight: 1.3,
    color: COLORS.gray700,
  },
  suggestedBox: {
    width: 92,
    padding: 5,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
    alignItems: "center",
  },
  suggestedLabel: {
    fontSize: 5.4,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray600,
    textAlign: "center",
  },
  suggestedValue: {
    marginTop: 2,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: COLORS.red700,
  },
  decisionMetrics: {
    marginBottom: 5,
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderWidth: 0.6,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.white,
    fontSize: 5.7,
    fontFamily: "Helvetica-Bold",
  },
  decisionColumns: {
    flexDirection: "row",
  },
  decisionColumn: {
    width: "50%",
    paddingRight: 7,
  },
  decisionColumnLast: {
    width: "50%",
    paddingLeft: 7,
    borderLeftWidth: 0.6,
    borderLeftColor: COLORS.gray300,
  },
  decisionColumnTitle: {
    marginBottom: 3,
    fontSize: 6.2,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray950,
  },
  decisionListItem: {
    flexDirection: "row",
    marginBottom: 2.2,
  },
  decisionListMarker: {
    width: 10,
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray700,
  },
  decisionListText: {
    flexGrow: 1,
    flexBasis: 0,
    fontSize: 5.5,
    lineHeight: 1.25,
    color: COLORS.gray700,
  },
  decisionDisclaimer: {
    marginTop: 4,
    fontSize: 5.1,
    color: COLORS.gray500,
  },
  section: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
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
    backgroundColor: COLORS.gray200,
    borderBottomWidth: 0.6,
    borderBottomColor: COLORS.gray500,
    fontFamily: "Helvetica-Bold",
  },
  breakdownRow: {
    flexDirection: "row",
    minHeight: 22,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.gray300,
  },
  bGroup: { width: "19%", padding: 3 },
  bGroupBold: { width: "19%", padding: 3, fontFamily: "Helvetica-Bold" },
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
  th: {
    backgroundColor: "#e8f1eb",
    fontFamily: "Helvetica-Bold",
  },
  competitionRound: {
    backgroundColor: "#f3faf5",
  },
  usedRound: {
    backgroundColor: COLORS.green100,
    borderBottomColor: "#86a88f",
  },
  date: { width: "12%", padding: 2 },
  course: { width: "38%", padding: 2 },
  tee: { width: "12%", padding: 2 },
  score: { width: "10%", padding: 2, textAlign: "right" },
  diff: { width: "10%", padding: 2, textAlign: "right" },
  type: { width: "18%", padding: 2 },
  compText: { color: COLORS.green700, fontFamily: "Helvetica-Bold" },
  usedText: { fontFamily: "Helvetica-Bold", color: COLORS.green900 },
  notes: {
    marginTop: 5,
    minHeight: 48,
    borderWidth: 1,
    borderColor: COLORS.gray400,
    padding: 5,
  },
  committeeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 3,
  },
  committeeOption: {
    flexDirection: "row",
    alignItems: "center",
    width: "25%",
    marginBottom: 4,
  },
  committeeBox: {
    width: 9,
    height: 9,
    marginRight: 3,
    borderWidth: 1,
    borderColor: COLORS.gray500,
  },
  notesLine: {
    marginTop: 5,
    borderBottomWidth: 0.6,
    borderBottomColor: COLORS.gray400,
    height: 9,
  },
  footer: {
    position: "absolute",
    bottom: 7,
    left: 22,
    right: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    color: COLORS.gray500,
    fontSize: 6,
  },
  summaryTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
    marginBottom: 12,
  },
  summaryPlayer: { width: "21%", padding: 4 },
  summaryNum: { width: "8%", padding: 4, textAlign: "right" },
  summaryDecision: { width: "31%", padding: 4 },
});

const n = (value: number | null) =>
  value == null || !Number.isFinite(value) ? "-" : value.toFixed(1);

function safeDate(value: string) {
  return new Date(value.includes("T") ? value : `${value}T00:00:00`);
}

function shortDate(value: string) {
  const date = safeDate(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
}

function Footer({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={s.footer} fixed>
      <Text>Goodrich Men&apos;s Club Handicap Committee Audit</Text>
      <Text>
        Generated {new Date(generatedAt).toLocaleDateString("en-US")} - Page{" "}
        <Text render={({ pageNumber }) => `${pageNumber}`} />
      </Text>
    </View>
  );
}

function advantageStyle(difference: number | null) {
  if (difference !== null && difference >= 1.5) return s.advantageRed;
  if (difference !== null && difference >= 1.0) return s.advantageOrange;
  return s.advantageNormal;
}

function decisionBadgeStyle(code: AuditPlayerReport["decision"]["code"]) {
  if (code === "adjustment_supported") return s.investigateFlag;
  if (code === "provisional_adjustment") return s.reviewFlag;
  if (code === "manual_review" || code === "monitor") {
    return s.monitorFlag;
  }
  if (code === "no_adjustment") return s.noAdjustmentFlag;
  return s.noActionFlag;
}

function decisionPanelStyle(code: AuditPlayerReport["decision"]["code"]) {
  if (code === "adjustment_supported") return s.decisionAdjustment;
  if (code === "provisional_adjustment") return s.decisionProvisional;
  if (code === "manual_review") return s.decisionManual;
  if (code === "monitor") return s.decisionMonitor;
  if (code === "no_adjustment") return s.decisionNoAdjustment;
  return s.decisionNoAction;
}

function comparisonData(
  categoryIndex: number | null,
  currentIndex: number | null
) {
  if (categoryIndex === null || currentIndex === null) {
    return {
      text: "Comparison unavailable",
      detail: "",
      tone: "neutral" as const,
    };
  }

  const gap = Number((currentIndex - categoryIndex).toFixed(1));

  if (gap > 0) {
    return {
      text: `${gap.toFixed(1)} lower vs Current GHIN Handicap Index`,
      detail: `${gap.toFixed(1)} lower than Current GHIN Handicap Index`,
      tone: "good" as const,
    };
  }

  if (gap < 0) {
    return {
      text: `${Math.abs(gap).toFixed(1)} higher vs Current GHIN Handicap Index`,
      detail: `${Math.abs(gap).toFixed(1)} higher than Current GHIN Handicap Index`,
      tone: "bad" as const,
    };
  }

  return {
    text: "0.0 vs Current GHIN Handicap Index",
    detail: "Equal to Current GHIN Handicap Index",
    tone: "neutral" as const,
  };
}

function ComparisonText({
  text,
  tone,
}: {
  text: string;
  tone: "good" | "bad" | "neutral";
}) {
  if (tone === "good") {
    return <Text style={s.comparisonGood}>{text}</Text>;
  }

  if (tone === "bad") {
    return <Text style={s.comparisonBad}>{text}</Text>;
  }

  return <Text style={s.comparisonNeutral}>{text}</Text>;
}

function CurrentCard({ value }: { value: string }) {
  return (
    <View style={[s.card, s.currentCard]}>
      <Text style={s.cardLabel}>CURRENT GHIN HANDICAP INDEX</Text>
      <Text style={s.cardValue}>{value}</Text>
      <Text style={s.cardDescription}>Official comparison baseline</Text>
    </View>
  );
}

function CategoryCard({
  label,
  value,
  comparison,
  cardType,
}: {
  label: string;
  value: string;
  comparison: ReturnType<typeof comparisonData>;
  cardType: "competition" | "general";
}) {
  const isCompetitionAlert =
    cardType === "competition" && comparison.tone === "good";

  if (cardType === "general") {
    return (
      <View style={[s.card, s.generalCard]}>
        <Text style={s.cardLabel}>{label}</Text>
        <Text style={s.cardValue}>{value}</Text>
      </View>
    );
  }

  return (
    <View
      style={
        isCompetitionAlert
          ? [s.card, s.competitionCard, s.competitionAlertCard]
          : [s.card, s.competitionCard]
      }
    >
      <Text
        style={
          isCompetitionAlert
            ? [s.cardLabel, s.competitionAlertLabel]
            : s.cardLabel
        }
      >
        {label}
      </Text>

      <Text
        style={
          isCompetitionAlert
            ? [s.cardValue, s.competitionAlertValue]
            : s.cardValue
        }
      >
        {value}
      </Text>

      <View style={s.cardComparison}>
        {isCompetitionAlert ? (
          <Text style={s.comparisonBad}>{comparison.text}</Text>
        ) : (
          <ComparisonText text={comparison.text} tone={comparison.tone} />
        )}
      </View>

      {comparison.detail ? (
        <Text style={s.cardDescription}>{comparison.detail}</Text>
      ) : null}
    </View>
  );
}

function AdvantageCard({ player }: { player: AuditPlayerReport }) {
  const value =
    player.difference === null
      ? "-"
      : `${Math.max(0, player.difference).toFixed(1)} STROKES`;

  return (
    <View style={[s.card, s.cardLast, s.advantageCard]}>
      <Text style={s.cardLabel}>EVIDENCE GAP</Text>
      <Text style={advantageStyle(player.difference)}>{value}</Text>
      <Text style={s.cardDescription}>
        Current GHIN Handicap Index minus Conservative Review HI
      </Text>
    </View>
  );
}

function HandicapCards({ player }: { player: AuditPlayerReport }) {
  const competitionComparison = comparisonData(
    player.reviewComparisonIndex,
    player.currentIndex
  );
  const generalComparison = comparisonData(
    player.goodrichGeneralLast10Index,
    player.currentIndex
  );

  return (
    <View style={s.cards}>
      <CurrentCard value={n(player.currentIndex)} />
      <CategoryCard
        label="CONSERVATIVE REVIEW HI"
        value={n(player.reviewComparisonIndex)}
        comparison={competitionComparison}
        cardType="competition"
      />
      <CategoryCard
        label="GOODRICH GENERAL HI"
        value={n(player.goodrichGeneralLast10Index)}
        comparison={generalComparison}
        cardType="general"
      />
      <AdvantageCard player={player} />
    </View>
  );
}

function MiniTimeline({ player }: { player: AuditPlayerReport }) {
  const rounds = [...player.rounds]
    .sort(
      (a, b) => safeDate(a.playedAt).getTime() - safeDate(b.playedAt).getTime()
    )
    .slice(-18);

  return (
    <View style={s.timelinePanel}>
      <Text style={s.panelTitle}>RECENT ROUND ACTIVITY (Last 20)</Text>

      <View style={s.timelineLegend}>
        <View style={s.legendItem}>
          <View style={s.legendDotCompetition} />
          <Text>Competition</Text>
        </View>
        <View style={s.legendItem}>
          <View style={s.legendDotGeneral} />
          <Text>General play</Text>
        </View>
        <View style={s.legendItem}>
          <View style={s.legendDotUsed} />
          <Text>Used in calculation</Text>
        </View>
      </View>

      {rounds.length ? (
        <>
          <View style={s.timelineTrack}>
            {rounds.map((round) => {
              const baseStyle =
                round.category === "Competition"
                  ? [s.timelinePoint, s.timelineCompetition]
                  : [s.timelinePoint, s.timelineGeneral];

              return (
                <View
                  key={round.id}
                  style={
                    round.usedInCalculation
                      ? [...baseStyle, s.timelineUsed]
                      : baseStyle
                  }
                />
              );
            })}
          </View>

          <View style={s.timelineDates}>
            <View>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Older</Text>
              <Text>{shortDate(rounds[0].playedAt)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>More Recent</Text>
              <Text>{shortDate(rounds[rounds.length - 1].playedAt)}</Text>
            </View>
          </View>

          <Text style={s.timelineSummary}>
            Latest {rounds.length} official rounds, shown chronologically.
          </Text>
        </>
      ) : (
        <Text>No official round activity is available.</Text>
      )}
    </View>
  );
}

type Confidence = {
  label: "LOW" | "MODERATE" | "HIGH" | "VERY HIGH";
  stars: number;
  description: string;
};

function confidenceForPlayer(player: AuditPlayerReport): Confidence {
  const goodrichCompetition =
    player.goodrichCompetition24MonthsRounds;
  const competition = player.allCompetition24MonthsRounds;
  const general = player.goodrichGeneralLast10Rounds;

  if (goodrichCompetition >= 10) {
    return {
      label: "VERY HIGH",
      stars: 5,
      description: "At least 10 recent Goodrich competition rounds.",
    };
  }

  if (competition >= 10) {
    return {
      label: "HIGH",
      stars: 4,
      description: "At least 10 recent competition rounds across all courses.",
    };
  }

  if (competition >= 3 && general >= 3) {
    return {
      label: "MODERATE",
      stars: 3,
      description: "Limited competition sample supported by Goodrich general play.",
    };
  }

  return {
    label: "LOW",
    stars: 2,
    description: "Limited sample. Interpret cautiously.",
  };
}

function EvidenceItem({ passed, text }: { passed: boolean; text: string }) {
  return (
    <View style={s.evidenceItem}>
      <Text style={passed ? s.evidenceIcon : s.evidenceWarning}>
        {passed ? "OK" : "!"}
      </Text>
      <Text style={s.evidenceText}>{text}</Text>
    </View>
  );
}

function ConfidencePanel({ player }: { player: AuditPlayerReport }) {
  const confidence = confidenceForPlayer(player);

  return (
    <View style={s.confidencePanel}>
      <Text style={s.panelTitle}>CONFIDENCE / EVIDENCE</Text>

      <Text style={s.confidenceLabel}>{confidence.label}</Text>
      <Text style={s.confidenceScore}>
        {confidence.stars}/5 evidence strength
      </Text>
      <EvidenceItem
        passed={player.goodrichCompetition24MonthsRounds >= 10}
        text={`${player.goodrichCompetition24MonthsRounds} Goodrich competition rounds / 24 mo.`}
      />
      <EvidenceItem
        passed={player.allCompetition24MonthsRounds >= 10}
        text={`${player.allCompetition24MonthsRounds} all-course competition rounds / 24 mo.`}
      />
      <EvidenceItem
        passed={player.goodrichGeneralLast10Rounds >= 3}
        text={`${player.goodrichGeneralLast10Rounds} Goodrich general rounds used as available`}
      />
      <EvidenceItem
        passed={player.difference != null && player.difference >= 2}
        text="2.0-stroke review threshold"
      />
      <Text style={s.recommendationNote}>{confidence.description}</Text>
    </View>
  );
}

function RecommendationPanel({ player }: { player: AuditPlayerReport }) {
  return (
    <View style={s.recommendationPanel}>
      <Text style={s.panelTitle}>RECOMMENDED ACTION</Text>
      <Text style={s.recommendationLabel}>{player.decision.label}</Text>
      {player.decision.suggestedIndex != null ? (
        <Text style={s.recommendationSuggested}>
          {player.decision.suggestedIndex.toFixed(1)}
        </Text>
      ) : null}
      <Text style={s.recommendationSummary}>
        {player.decision.summary}
      </Text>
    </View>
  );
}

function NumberList({
  values,
  usedValues,
}: {
  values: number[];
  usedValues?: number[];
}) {
  const remainingUsed = [...(usedValues ?? [])];

  return (
    <Text>
      {values.map((value, index) => {
        const usedIndex = remainingUsed.findIndex(
          (usedValue) => Math.abs(usedValue - value) < 0.001
        );
        const isUsed = usedIndex >= 0;

        if (isUsed) remainingUsed.splice(usedIndex, 1);

        return isUsed ? (
          <Text key={`${value}-${index}`} style={s.usedText}>
            {value.toFixed(1)}
            {index < values.length - 1 ? "  " : ""}
          </Text>
        ) : (
          <Text key={`${value}-${index}`}>
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

function BreakdownTable({ rows }: { rows: AuditBreakdownRow[] }) {
  return (
    <View>
      <Text style={s.section}>OFFICIAL HANDICAP EVIDENCE BREAKDOWN</Text>

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
            <Text style={s.bGroupBold}>{row.label}</Text>
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

function OfficialRoundsTable({ player }: { player: AuditPlayerReport }) {
  return (
    <View>
      <Text style={s.section}>LAST 20 OFFICIAL HANDICAP ROUNDS</Text>

      <View style={[s.row, s.th]}>
        <Text style={s.date}>Date</Text>
        <Text style={s.course}>Course</Text>
        <Text style={s.tee}>Tee</Text>
        <Text style={s.score}>Score</Text>
        <Text style={s.diff}>Diff</Text>
        <Text style={s.type}>Category</Text>
      </View>

      {player.rounds.map((round) => {
        const rowStyle = round.usedInCalculation
          ? [s.row, s.usedRound]
          : round.category === "Competition"
            ? [s.row, s.competitionRound]
            : s.row;

        const dateStyle = round.usedInCalculation
          ? [s.date, s.usedText]
          : s.date;
        const courseStyle = round.usedInCalculation
          ? [s.course, s.usedText]
          : s.course;
        const teeStyle = round.usedInCalculation
          ? [s.tee, s.usedText]
          : s.tee;
        const diffStyle = round.usedInCalculation
          ? [s.diff, s.usedText]
          : s.diff;

        const scoreStyle = round.usedInCalculation
          ? round.category === "Competition"
            ? [s.score, s.compText, s.usedText]
            : [s.score, s.usedText]
          : round.category === "Competition"
            ? [s.score, s.compText]
            : s.score;

        const typeStyle = round.usedInCalculation
          ? round.category === "Competition"
            ? [s.type, s.compText, s.usedText]
            : [s.type, s.usedText]
          : round.category === "Competition"
            ? [s.type, s.compText]
            : s.type;

        return (
          <View style={rowStyle} key={round.id} wrap={false}>
            <Text style={dateStyle}>{shortDate(round.playedAt)}</Text>
            <Text style={courseStyle}>{round.courseName}</Text>
            <Text style={teeStyle}>
              {roundTeeDisplayName(round.courseName, round.teeName)}
            </Text>
            <Text style={scoreStyle}>{round.score ?? "-"}</Text>
            <Text style={diffStyle}>{round.differential.toFixed(1)}</Text>
            <Text style={typeStyle}>
              {round.category}
              {round.usedInCalculation ? " - USED" : ""}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function DecisionAnalysis({ player }: { player: AuditPlayerReport }) {
  const { decision } = player;
  return (
    <View
      style={[s.decisionAnalysis, decisionPanelStyle(decision.code)]}
      wrap={false}
    >
      <View style={s.decisionHeader}>
        <View style={s.decisionHeaderCopy}>
          <Text style={s.decisionEyebrow}>COMMITTEE DECISION ANALYSIS</Text>
          <Text style={s.decisionLabel}>{decision.label}</Text>
          <Text style={s.decisionSummary}>{decision.summary}</Text>
        </View>

        {decision.suggestedIndex != null ? (
          <View style={s.suggestedBox}>
            <Text style={s.suggestedLabel}>SUGGESTED COMMITTEE HI</Text>
            <Text style={s.suggestedValue}>
              {decision.suggestedIndex.toFixed(1)}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={s.decisionMetrics}>
        TWO-YEAR WINDOW: {player.evidenceCutoffDate} through the generated date
      </Text>
      <Text style={s.decisionMetrics}>
        Goodrich Competition HI {n(player.goodrichCompetition24MonthsIndex)}
        {" "}({player.goodrichCompetition24MonthsRounds} rounds) | All
        Competition HI {n(player.allCompetition24MonthsIndex)} ({player.allCompetition24MonthsRounds}
        {" "}rounds) | Last-{player.goodrichGeneralLast10Rounds} Goodrich
        General HI {n(player.goodrichGeneralLast10Index)}
      </Text>
      <Text style={s.decisionMetrics}>
        TWO-YEAR EVIDENCE: {player.committeeEvidenceBasisLabel}{" "}
        {n(player.committeeEvidenceIndex)} | CONSERVATIVE REVIEW:{" "}
        {player.reviewComparisonBasisLabel} {n(player.reviewComparisonIndex)}
        {" "}| Current HI {n(player.currentIndex)} | Gap {n(player.difference)}
        {" "}| Sandbag Score {player.sandbagScore}
      </Text>

      <View style={s.decisionColumns}>
        <View style={s.decisionColumn}>
          <Text style={s.decisionColumnTitle}>WHY THIS DECISION</Text>
          {decision.evidence.map((item) => (
            <View style={s.decisionListItem} key={item}>
              <Text style={s.decisionListMarker}>-</Text>
              <Text style={s.decisionListText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={s.decisionColumnLast}>
          <Text style={s.decisionColumnTitle}>SUGGESTED NEXT STEPS</Text>
          {decision.nextSteps.map((item, index) => (
            <View style={s.decisionListItem} key={item}>
              <Text style={s.decisionListMarker}>{index + 1}.</Text>
              <Text style={s.decisionListText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={s.decisionDisclaimer}>
        Recommendation generated from the documented audit rules. Final action
        remains at the Handicap Committee&apos;s discretion.
      </Text>
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
        <View style={s.playerHeaderLeft}>
          <Text style={s.rankBadge}>#{rank}</Text>
          <View>
            <Text style={s.name}>{player.name}</Text>
            <Text style={s.muted}>
              GHIN #{player.ghinNumber ?? "-"} | {player.competitionRounds}{" "}
              Competition Rounds | {player.generalRounds} General Play Rounds
            </Text>
          </View>
        </View>

        <Text
          style={[
            s.decisionBadge,
            decisionBadgeStyle(player.decision.code),
          ]}
        >
          {player.decision.label}
        </Text>
      </View>

      <HandicapCards player={player} />

      <View style={s.dashboardRow}>
        <MiniTimeline player={player} />
        <ConfidencePanel player={player} />
        <RecommendationPanel player={player} />
      </View>

      <DecisionAnalysis player={player} />
      <BreakdownTable rows={player.breakdown} />
      <OfficialRoundsTable player={player} />
      <Footer generatedAt={generatedAt} />
    </Page>
  );
}

function Summary({ report, title }: { report: AuditReport; title: string }) {
  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.summaryTitle}>{title}</Text>

      <View style={[s.row, s.th]}>
        <Text style={s.summaryPlayer}>Player</Text>
        <Text style={s.summaryNum}>Current</Text>
        <Text style={s.summaryNum}>Review</Text>
        <Text style={s.summaryNum}>G Comp</Text>
        <Text style={s.summaryNum}>All Comp</Text>
        <Text style={s.summaryNum}>G General</Text>
        <Text style={s.summaryNum}>Gap</Text>
        <Text style={s.summaryDecision}>Decision</Text>
      </View>

      {report.players.map((player, index) => (
        <View style={s.row} key={player.id} wrap={false}>
          <Text style={s.summaryPlayer}>
            #{index + 1} {player.name}
          </Text>
          <Text style={s.summaryNum}>{n(player.currentIndex)}</Text>
          <Text style={s.summaryNum}>{n(player.reviewComparisonIndex)}</Text>
          <Text style={s.summaryNum}>
            {n(player.goodrichCompetition24MonthsIndex)}
          </Text>
          <Text style={s.summaryNum}>{n(player.allCompetition24MonthsIndex)}</Text>
          <Text style={s.summaryNum}>{n(player.goodrichGeneralLast10Index)}</Text>
          <Text style={[s.summaryNum, advantageStyle(player.difference)]}>
            {player.difference === null
              ? "-"
              : Math.max(0, player.difference).toFixed(1)}
          </Text>
          <Text
            style={[
              s.summaryDecision,
              decisionBadgeStyle(player.decision.code),
            ]}
          >
            {player.decision.label}
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
        <Text style={s.title}>Goodrich Men&apos;s Club</Text>
        <Text style={s.subtitle}>Handicap Committee Audit</Text>

        <View style={s.meta}>
          <Text style={s.metaText}>
            Generated: {new Date(report.generatedAt).toLocaleString("en-US")}
          </Text>
          <Text style={s.metaText}>
            Players reviewed: {report.players.length}
          </Text>
          <Text style={s.metaText}>
            Includes players with at least five all-time competition scores. Players are
            grouped by committee decision: adjustments, monitor, then no
            adjustment. Each group is ranked by the two-year Committee
            Evidence-HI-vs-Overall gap.
          </Text>
          <Text style={s.metaText}>
            Evidence hierarchy: use 10 or more Goodrich competition rounds,
            otherwise 10 or more total competition rounds. With 3-9 total
            competition rounds, blend the competition HI with the last 10
            available Goodrich general-play rounds. Fewer than three
            competition rounds are monitoring context only.
          </Text>
          <Text style={s.metaText}>
            Benefit of the doubt: with fewer than 10 Goodrich competition
            rounds in the two-year window, the gap and recommendation use the
            higher of the Last 20 Competition HI and Two-Year Committee
            Evidence HI.
          </Text>
          <Text style={s.metaText}>
            Category Handicap Indexes are committee screening tools and do not
            replace the player&apos;s official GHIN Handicap Index.
          </Text>
        </View>
      </Page>

      <Summary
        report={report}
        title="Two-Year Committee Evidence Audit Ranking"
      />

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
