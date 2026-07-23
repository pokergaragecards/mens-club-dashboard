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
    borderColor: COLORS.green800,
    backgroundColor: "#e8f1eb",
    color: COLORS.green900,
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
    width: "56%",
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
    width: "23%",
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
  evidenceItem: {
    flexDirection: "row",
    marginBottom: 2.5,
  },
  evidenceIcon: {
    width: 8,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green700,
  },
  evidenceWarning: {
    width: 8,
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
  insight: {
    marginBottom: 6,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.green700,
    backgroundColor: COLORS.green50,
  },
  insightTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
    marginBottom: 2,
  },
  insightText: {
    fontSize: 6.3,
    lineHeight: 1.3,
    color: COLORS.gray700,
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
  summaryPlayer: { width: "35%", padding: 5 },
  summaryNum: { width: "13%", padding: 5, textAlign: "right" },
  summaryFlag: { width: "13%", padding: 5 },
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
      <Text>Goodrich Men's Club Handicap Committee Audit</Text>
      <Text>
        Generated {new Date(generatedAt).toLocaleDateString("en-US")} · Page{" "}
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

function flagStyle(flag: AuditPlayerReport["flag"]) {
  if (flag === "INVESTIGATE") return s.investigateFlag;
  if (flag === "REVIEW") return s.reviewFlag;
  return s.noActionFlag;
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
      text: `▼ ${gap.toFixed(1)} vs Current GHIN`,
      detail: `${gap.toFixed(1)} lower than Current GHIN`,
      tone: "good" as const,
    };
  }

  if (gap < 0) {
    return {
      text: `▲ ${Math.abs(gap).toFixed(1)} vs Current GHIN`,
      detail: `${Math.abs(gap).toFixed(1)} higher than Current GHIN`,
      tone: "bad" as const,
    };
  }

  return {
    text: "— 0.0 vs Current GHIN",
    detail: "Equal to Current GHIN",
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
      <Text style={s.cardLabel}>CURRENT GHIN HI</Text>
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
  const cardStyle =
    cardType === "competition"
      ? [s.card, s.competitionCard]
      : [s.card, s.generalCard];

  return (
    <View style={cardStyle}>
      <Text style={s.cardLabel}>{label}</Text>
      <Text style={s.cardValue}>{value}</Text>
      <View style={s.cardComparison}>
        <ComparisonText text={comparison.text} tone={comparison.tone} />
      </View>
      <Text style={s.cardDescription}>{comparison.detail}</Text>
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
      <Text style={s.cardLabel}>COMPETITION ADVANTAGE</Text>
      <Text style={advantageStyle(player.difference)}>{value}</Text>
      <Text style={s.cardDescription}>Current GHIN minus Competition HI</Text>
    </View>
  );
}

function HandicapCards({ player }: { player: AuditPlayerReport }) {
  const competitionComparison = comparisonData(
    player.competitionIndex,
    player.currentIndex
  );
  const generalComparison = comparisonData(
    player.generalIndex,
    player.currentIndex
  );

  return (
    <View style={s.cards}>
      <CurrentCard value={n(player.currentIndex)} />
      <CategoryCard
        label="COMPETITION HI"
        value={n(player.competitionIndex)}
        comparison={competitionComparison}
        cardType="competition"
      />
      <CategoryCard
        label="GENERAL PLAY HI"
        value={n(player.generalIndex)}
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
      <Text style={s.panelTitle}>RECENT ROUND ACTIVITY</Text>

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
            <Text>{shortDate(rounds[0].playedAt)}</Text>
            <Text>{shortDate(rounds[rounds.length - 1].playedAt)}</Text>
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
  const competition = player.competitionRounds;
  const general = player.generalRounds;
  const total = competition + general;

  if (competition >= 10 && general >= 20 && total >= 30) {
    return {
      label: "VERY HIGH",
      stars: 5,
      description: "Strong samples in both categories.",
    };
  }

  if (competition >= 5 && general >= 15 && total >= 20) {
    return {
      label: "HIGH",
      stars: 4,
      description: "Sufficient evidence for committee review.",
    };
  }

  if (competition >= 5 && total >= 15) {
    return {
      label: "MODERATE",
      stars: 3,
      description: "Useful evidence; continued monitoring may help.",
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
        {passed ? "✓" : "!"}
      </Text>
      <Text style={s.evidenceText}>{text}</Text>
    </View>
  );
}

function ConfidencePanel({ player }: { player: AuditPlayerReport }) {
  const confidence = confidenceForPlayer(player);
  const total = player.competitionRounds + player.generalRounds;

  return (
    <View style={s.confidencePanel}>
      <Text style={s.panelTitle}>CONFIDENCE</Text>

      <View style={s.confidenceStars}>
        {Array.from({ length: 5 }, (_, index) => (
          <Text
            key={index}
            style={
              index < confidence.stars
                ? s.confidenceStarOn
                : s.confidenceStarOff
            }
          >
            ★
          </Text>
        ))}
      </View>

      <Text style={s.confidenceLabel}>{confidence.label}</Text>
      <EvidenceItem
        passed={player.generalRounds >= 15}
        text={`${player.generalRounds} general rounds`}
      />
      <EvidenceItem
        passed={player.competitionRounds >= 5}
        text={`${player.competitionRounds} competition rounds`}
      />
      <EvidenceItem passed={total >= 20} text={`${total} total rounds`} />
      <EvidenceItem
        passed={player.competitionRounds >= 5 && player.generalRounds >= 15}
        text="Review threshold met"
      />
      <Text style={s.recommendationNote}>{confidence.description}</Text>
    </View>
  );
}

type Recommendation = {
  interview: boolean;
  reviewScores: boolean;
  adjust: boolean;
  noAction: boolean;
};

function recommendationForPlayer(
  player: AuditPlayerReport
): Recommendation {
  if (player.flag === "INVESTIGATE") {
    return {
      interview: true,
      reviewScores: true,
      adjust: false,
      noAction: false,
    };
  }

  if (player.flag === "REVIEW") {
    return {
      interview: false,
      reviewScores: true,
      adjust: false,
      noAction: false,
    };
  }

  return {
    interview: false,
    reviewScores: false,
    adjust: false,
    noAction: true,
  };
}

function RecommendationItem({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  return (
    <View style={s.recommendationItem}>
      <Text style={checked ? s.checkboxChecked : s.checkboxEmpty}>
        {checked ? "✓" : ""}
      </Text>
      <Text style={s.recommendationText}>{label}</Text>
    </View>
  );
}

function RecommendationPanel({ player }: { player: AuditPlayerReport }) {
  const recommendation = recommendationForPlayer(player);

  return (
    <View style={s.recommendationPanel}>
      <Text style={s.panelTitle}>RECOMMENDED ACTION</Text>
      <RecommendationItem
        checked={recommendation.interview}
        label="Interview player"
      />
      <RecommendationItem
        checked={recommendation.reviewScores}
        label="Review exceptional scores"
      />
      <RecommendationItem
        checked={recommendation.adjust}
        label="Adjust Handicap Index"
      />
      <RecommendationItem
        checked={recommendation.noAction}
        label="No action"
      />
      <Text style={s.recommendationNote}>
        Screening recommendation only. Final action remains a committee
        decision.
      </Text>
    </View>
  );
}

function KeyInsight({ player }: { player: AuditPlayerReport }) {
  let text =
    "Insufficient data is available to compare the player's category Handicap Indexes.";

  if (player.currentIndex !== null && player.competitionIndex !== null) {
    const competitionGap = Number(
      (player.currentIndex - player.competitionIndex).toFixed(1)
    );

    if (competitionGap > 0) {
      text = `Competition HI is ${competitionGap.toFixed(
        1
      )} strokes lower than Current GHIN HI.`;
    } else if (competitionGap < 0) {
      text = `Competition HI is ${Math.abs(competitionGap).toFixed(
        1
      )} strokes higher than Current GHIN HI.`;
    } else {
      text = "Competition HI is equal to Current GHIN HI.";
    }

    if (player.generalIndex !== null) {
      const categoryGap = Number(
        (player.generalIndex - player.competitionIndex).toFixed(1)
      );

      if (categoryGap > 0) {
        text += ` General Play HI is ${categoryGap.toFixed(
          1
        )} strokes higher than Competition HI.`;
      } else if (categoryGap < 0) {
        text += ` General Play HI is ${Math.abs(categoryGap).toFixed(
          1
        )} strokes lower than Competition HI.`;
      }
    }
  }

  return (
    <View style={s.insight}>
      <Text style={s.insightTitle}>KEY INSIGHT</Text>
      <Text style={s.insightText}>{text}</Text>
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
      <Text style={s.section}>Last 20 Official Handicap Rounds</Text>

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
            <Text style={teeStyle}>{round.teeName}</Text>
            <Text style={scoreStyle}>{round.score ?? "-"}</Text>
            <Text style={diffStyle}>{round.differential.toFixed(1)}</Text>
            <Text style={typeStyle}>
              {round.category}
              {round.usedInCalculation ? " · USED" : ""}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function CommitteeDecision() {
  const options = [
    "No action",
    "Monitor",
    "Interview player",
    "Adjust Handicap Index",
  ];

  return (
    <View style={s.notes}>
      <Text style={s.section}>Committee Decision</Text>

      <View style={s.committeeOptions}>
        {options.map((option) => (
          <View style={s.committeeOption} key={option}>
            <View style={s.committeeBox} />
            <Text>{option}</Text>
          </View>
        ))}
      </View>

      <Text>New Handicap Index, if applicable: __________</Text>
      <View style={s.notesLine} />
      <View style={s.notesLine} />
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
              GHIN #{player.ghinNumber ?? "-"} · {player.competitionRounds}{" "}
              competition · {player.generalRounds} general play
            </Text>
          </View>
        </View>

        <Text style={[s.flag, flagStyle(player.flag)]}>{player.flag}</Text>
      </View>

      <HandicapCards player={player} />

      <View style={s.dashboardRow}>
        <MiniTimeline player={player} />
        <ConfidencePanel player={player} />
        <RecommendationPanel player={player} />
      </View>

      <KeyInsight player={player} />
      <BreakdownTable rows={player.breakdown} />
      <OfficialRoundsTable player={player} />
      <CommitteeDecision />
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
        <Text style={s.summaryNum}>Comp</Text>
        <Text style={s.summaryNum}>General</Text>
        <Text style={s.summaryNum}>Comp Advantage</Text>
        <Text style={s.summaryFlag}>Flag</Text>
      </View>

      {report.players.map((player, index) => (
        <View style={s.row} key={player.id} wrap={false}>
          <Text style={s.summaryPlayer}>
            #{index + 1} {player.name}
          </Text>
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
            Includes players with at least five competition scores. Players are
            ranked by Current GHIN Handicap Index minus Competition Handicap
            Index.
          </Text>
          <Text style={s.metaText}>
            Category Handicap Indexes are committee screening tools and do not
            replace the player's official GHIN Handicap Index.
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