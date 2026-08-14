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
import { handicapScoreWindowCount } from "@/lib/auditEvidence";
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
    marginTop: 24,
    width: 430,
    padding: 18,
    borderWidth: 1,
    borderColor: "#86a88f",
    backgroundColor: COLORS.white,
  },
  metaText: {
    fontSize: 9,
    lineHeight: 1.3,
    color: COLORS.gray600,
  },
  coverMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 9,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  coverSectionTitle: {
    marginBottom: 9,
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
    textAlign: "center",
  },
  coverStep: {
    flexDirection: "row",
    marginBottom: 9,
    alignItems: "flex-start",
  },
  coverStepNumber: {
    width: 22,
    height: 22,
    marginRight: 9,
    paddingTop: 4,
    borderRadius: 11,
    backgroundColor: COLORS.green900,
    color: COLORS.white,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  coverStepText: {
    flexGrow: 1,
    flexBasis: 0,
    fontSize: 10,
    lineHeight: 1.35,
    color: COLORS.gray900,
  },
  coverStepStrong: {
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
  },
  coverFormula: {
    marginTop: 3,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.blue700,
    backgroundColor: COLORS.blue50,
    alignItems: "center",
  },
  coverFormulaLabel: {
    marginBottom: 4,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: COLORS.blue700,
  },
  coverFormulaValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray950,
    textAlign: "center",
  },
  coverAlert: {
    marginTop: 16,
    width: 430,
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderWidth: 3,
    borderColor: COLORS.red700,
    backgroundColor: COLORS.red50,
    alignItems: "center",
  },
  coverAlertThreshold: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: COLORS.red700,
  },
  coverAlertTitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: COLORS.red800,
  },
  coverAlertText: {
    marginTop: 6,
    fontSize: 8.5,
    lineHeight: 1.35,
    color: COLORS.gray700,
    textAlign: "center",
  },
  coverDisclaimer: {
    marginTop: 12,
    width: 430,
    fontSize: 8,
    lineHeight: 1.35,
    color: COLORS.gray600,
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
  bHi: {
    width: "8%",
    padding: 3,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },
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
    marginBottom: 4,
  },
  summaryCountNote: {
    marginBottom: 8,
    fontSize: 6.5,
    color: COLORS.gray600,
  },
  summaryGuide: {
    marginBottom: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.green200,
    backgroundColor: COLORS.green50,
  },
  summaryGuideTitle: {
    marginBottom: 3,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
  },
  summaryGuideIntro: {
    fontSize: 6.6,
    lineHeight: 1.35,
    color: COLORS.gray700,
  },
  summaryGuideGrid: {
    marginTop: 3,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryGuideItem: {
    width: "50%",
    paddingTop: 4,
    paddingRight: 8,
  },
  summaryGuideLabel: {
    marginBottom: 1,
    fontSize: 6.6,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
  },
  summaryGuideText: {
    fontSize: 6.2,
    lineHeight: 1.3,
    color: COLORS.gray700,
  },
  summaryPlayer: { width: "21%", padding: 4 },
  summaryNum: { width: "8%", padding: 4, textAlign: "right" },
  summaryDecision: { width: "31%", padding: 4 },
  historyPageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 7,
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.green800,
  },
  historyEyebrow: {
    marginBottom: 2,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green700,
  },
  historyTitle: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: COLORS.green900,
  },
  historyPlayer: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray700,
    textAlign: "right",
  },
  historyIntro: {
    marginBottom: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: COLORS.green200,
    backgroundColor: COLORS.green50,
    fontSize: 6.4,
    lineHeight: 1.35,
    color: COLORS.gray700,
  },
  historyCards: {
    flexDirection: "row",
    marginBottom: 8,
  },
  historyCard: {
    width: "25%",
    minHeight: 36,
    marginRight: 4,
    padding: 5,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    backgroundColor: COLORS.gray50,
  },
  historyCardLast: {
    marginRight: 0,
  },
  historyCardLabel: {
    marginBottom: 3,
    fontSize: 5.6,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray600,
  },
  historyCardValue: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLORS.gray950,
  },
  historyTable: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  historyRow: {
    minHeight: 19,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.gray300,
    fontSize: 6.1,
  },
  historyHead: {
    minHeight: 22,
    backgroundColor: COLORS.green900,
    color: COLORS.white,
    fontFamily: "Helvetica-Bold",
  },
  historySequence: { width: "5%", padding: 3, textAlign: "right" },
  historyDate: { width: "10%", padding: 3 },
  historyCourse: { width: "25%", padding: 3 },
  historyTee: { width: "10%", padding: 3 },
  historyScore: { width: "7%", padding: 3, textAlign: "right" },
  historyDiff: { width: "8%", padding: 3, textAlign: "right" },
  historyCategory: { width: "13%", padding: 3 },
  historyOverallHi: { width: "11%", padding: 3, textAlign: "right" },
  historyCategoryHi: { width: "11%", padding: 3, textAlign: "right" },
  historyEmpty: {
    padding: 24,
    fontSize: 9,
    color: COLORS.gray600,
    textAlign: "center",
  },
});

const n = (value: number | null) =>
  value == null || !Number.isFinite(value) ? "-" : value.toFixed(1);

const historyNumber = (value: number | null) =>
  value == null || !Number.isFinite(value) ? "N/A" : value.toFixed(1);

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
      <Text>Goodrich Men&apos;s Club Current Handicap Review Sheet</Text>
      <Text>
        Generated {new Date(generatedAt).toLocaleDateString("en-US")} - Page{" "}
        <Text render={({ pageNumber }) => `${pageNumber}`} />
      </Text>
    </View>
  );
}

function advantageStyle(difference: number | null) {
  if (difference !== null && difference >= 2) return s.advantageRed;
  return s.advantageNormal;
}

function needsHandicapReview(player: AuditPlayerReport) {
  return player.difference != null && player.difference >= 2;
}

function publicReviewLabel(player: AuditPlayerReport) {
  return needsHandicapReview(player)
    ? "Needing a Handicap Review"
    : "No Review Flag";
}

function publicReviewStyle(player: AuditPlayerReport) {
  return needsHandicapReview(player) ? s.investigateFlag : s.noActionFlag;
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

function ReviewStatusPanel({ player }: { player: AuditPlayerReport }) {
  const needsReview = needsHandicapReview(player);

  return (
    <View style={s.recommendationPanel}>
      <Text style={s.panelTitle}>PUBLIC REVIEW STATUS</Text>
      <Text style={s.recommendationLabel}>
        {publicReviewLabel(player)}
      </Text>
      <Text style={s.recommendationSummary}>
        {needsReview
          ? "Stroke Discrepancy is 2.0 or greater. This is a review flag only."
          : "Stroke Discrepancy is below the public 2.0-stroke review line."}
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

function PublicReviewEvidence({ player }: { player: AuditPlayerReport }) {
  const needsReview = needsHandicapReview(player);

  return (
    <View style={s.decisionAnalysis} wrap={false}>
      <View style={s.decisionHeader}>
        <View style={s.decisionHeaderCopy}>
          <Text style={s.decisionEyebrow}>PUBLIC HANDICAP COMPARISON</Text>
          <Text style={s.decisionLabel}>{publicReviewLabel(player)}</Text>
          <Text style={s.decisionSummary}>
            {needsReview
              ? `The Current Handicap Index is ${n(player.difference)} strokes higher than the Conservative Review HI.`
              : "The comparison does not reach the 2.0-stroke public review line."}
          </Text>
        </View>
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
        {" "}| Current HI {n(player.currentIndex)} | Stroke Discrepancy{" "}
        {n(player.difference)}
      </Text>

      <Text style={s.decisionDisclaimer}>
        This sheet reports current scoring comparisons only. A review flag is
        not a committee decision, a suggested handicap, or an automatic change
        to the player&apos;s official GHIN Handicap Index.
      </Text>
    </View>
  );
}

function historyAverage(values: Array<number | null>) {
  const available = values.filter(
    (value): value is number => value != null && Number.isFinite(value)
  );

  if (!available.length) return null;
  return available.reduce((sum, value) => sum + value, 0) / available.length;
}

function HandicapScoreHistoryPage({
  player,
  generatedAt,
  pageIndex,
}: {
  player: AuditPlayerReport;
  generatedAt: string;
  pageIndex: 0 | 1;
}) {
  const pageSize = 25;
  const start = pageIndex * pageSize;
  const rows = player.scoreHistory.slice(start, start + pageSize);
  const competitionCount = rows.filter(
    (round) => round.category === "Competition"
  ).length;
  const generalCount = rows.length - competitionCount;
  const averageScore = historyAverage(rows.map((round) => round.score));
  const averageDifferential = historyAverage(
    rows.map((round) => round.differential)
  );

  return (
    <Page size="LETTER" style={s.page} wrap={false}>
      <View style={s.historyPageHeader}>
        <View>
          <Text style={s.historyEyebrow}>SUPPORTING SCORE EVIDENCE</Text>
          <Text style={s.historyTitle}>
            Handicap Score History {pageIndex + 1} of 2
          </Text>
        </View>
        <View>
          <Text style={s.historyPlayer}>{player.name}</Text>
          <Text style={s.muted}>GHIN #{player.ghinNumber ?? "N/A"}</Text>
        </View>
      </View>

      <Text style={s.historyIntro}>
        Official handicap-counting rounds are listed newest first. Overall HI
        After Round recalculates from the latest 20 overall differentials
        available on that date. Category HI After Round independently uses the
        latest 20 Competition or General Play differentials. Green rows marked
        USED are part of the player&apos;s current overall Handicap Index
        calculation.
      </Text>

      <View style={s.historyCards}>
        <View style={s.historyCard}>
          <Text style={s.historyCardLabel}>ROUNDS ON THIS PAGE</Text>
          <Text style={s.historyCardValue}>{rows.length}</Text>
        </View>
        <View style={s.historyCard}>
          <Text style={s.historyCardLabel}>COMPETITION / GENERAL</Text>
          <Text style={s.historyCardValue}>
            {competitionCount} / {generalCount}
          </Text>
        </View>
        <View style={s.historyCard}>
          <Text style={s.historyCardLabel}>AVERAGE SCORE</Text>
          <Text style={s.historyCardValue}>{historyNumber(averageScore)}</Text>
        </View>
        <View style={[s.historyCard, s.historyCardLast]}>
          <Text style={s.historyCardLabel}>AVERAGE DIFFERENTIAL</Text>
          <Text style={s.historyCardValue}>
            {historyNumber(averageDifferential)}
          </Text>
        </View>
      </View>

      <View style={s.historyTable}>
        <View style={[s.historyRow, s.historyHead]}>
          <Text style={s.historySequence}>#</Text>
          <Text style={s.historyDate}>Date</Text>
          <Text style={s.historyCourse}>Course</Text>
          <Text style={s.historyTee}>Tee</Text>
          <Text style={s.historyScore}>Score</Text>
          <Text style={s.historyDiff}>Diff</Text>
          <Text style={s.historyCategory}>Category</Text>
          <Text style={s.historyOverallHi}>Overall HI</Text>
          <Text style={s.historyCategoryHi}>Category HI</Text>
        </View>

        {rows.length ? (
          rows.map((round, index) => (
            <View
              key={round.id}
              style={
                round.usedInCalculation
                  ? [s.historyRow, s.usedRound]
                  : s.historyRow
              }
            >
              <Text style={s.historySequence}>{start + index + 1}</Text>
              <Text style={s.historyDate}>{shortDate(round.playedAt)}</Text>
              <Text style={s.historyCourse}>{round.courseName}</Text>
              <Text style={s.historyTee}>
                {roundTeeDisplayName(round.courseName, round.teeName)}
              </Text>
              <Text style={s.historyScore}>{round.score ?? "N/A"}</Text>
              <Text style={s.historyDiff}>
                {round.differential.toFixed(1)}
              </Text>
              <Text style={s.historyCategory}>
                {round.category}
                {round.usedInCalculation ? " - USED" : ""}
              </Text>
              <Text style={s.historyOverallHi}>
                {historyNumber(round.overallIndexAfterRound)}
              </Text>
              <Text style={s.historyCategoryHi}>
                {historyNumber(round.categoryIndexAfterRound)}
              </Text>
            </View>
          ))
        ) : (
          <Text style={s.historyEmpty}>
            No additional official handicap score history is available for
            this page.
          </Text>
        )}
      </View>

      <Footer generatedAt={generatedAt} />
    </Page>
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

        <Text style={[s.decisionBadge, publicReviewStyle(player)]}>
          {publicReviewLabel(player)}
        </Text>
      </View>

      <HandicapCards player={player} />

      <View style={s.dashboardRow}>
        <MiniTimeline player={player} />
        <ConfidencePanel player={player} />
        <ReviewStatusPanel player={player} />
      </View>

      <PublicReviewEvidence player={player} />
      <BreakdownTable rows={player.breakdown} />
      <OfficialRoundsTable player={player} />
      <Footer generatedAt={generatedAt} />
    </Page>
  );
}

const SUMMARY_COLUMN_GUIDE = [
  {
    label: "Player",
    text: "The member's rank and name. Players are ordered from the largest Gap to the smallest.",
  },
  {
    label: "Current",
    text: "The official current GHIN Handicap Index. (#) is the active calculation window, capped at the latest 20 eligible scores.",
  },
  {
    label: "Review",
    text: "The committee comparison HI. With fewer than 10 Goodrich competition scores, it uses the higher (more player-favorable) of the Last 20 Competition HI and Two-Year Committee Evidence HI. (#) is its supporting score count.",
  },
  {
    label: "G Comp",
    text: "Goodrich Competition HI from competition scores at Goodrich during the last 24 months, capped at the latest 20 scores.",
  },
  {
    label: "All Comp",
    text: "All Competition HI from competition scores at every course during the last 24 months, capped at the latest 20 scores.",
  },
  {
    label: "G General",
    text: "Goodrich General-Play HI from the latest 10 eligible Goodrich general-play scores in the last 24 months. It supports the Two-Year Evidence HI when only 3-9 competition scores are available.",
  },
  {
    label: "Gap",
    text: "Current HI minus Review HI. A larger positive number means the official Current HI gives more strokes than the Review HI.",
  },
  {
    label: "Review Status",
    text: "A Gap of 2.0 strokes or more is labeled Needing a Handicap Review. This is a screening flag, not an automatic adjustment.",
  },
] as const;

function SummaryGuide() {
  return (
    <View style={s.summaryGuide} wrap={false}>
      <Text style={s.summaryGuideTitle}>HOW TO READ THIS PAGE</Text>
      <Text style={s.summaryGuideIntro}>
        Each Handicap Index is followed by its score count in parentheses. The
        definitions below explain the source and time window for every column.
      </Text>
      <View style={s.summaryGuideGrid}>
        {SUMMARY_COLUMN_GUIDE.map((item) => (
          <View style={s.summaryGuideItem} key={item.label}>
            <Text style={s.summaryGuideLabel}>{item.label}</Text>
            <Text style={s.summaryGuideText}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Summary({
  report,
  title,
  showGuide = false,
}: {
  report: AuditReport;
  title: string;
  showGuide?: boolean;
}) {
  const hiWithScoreCount = (index: number | null, count: number) =>
    index === null ? "-" : `${n(index)} (${count})`;

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.summaryTitle}>{title}</Text>

      {showGuide ? (
        <SummaryGuide />
      ) : (
        <Text style={s.summaryCountNote}>
          (#) is the number of scores considered in that Handicap Index
          section.
        </Text>
      )}

      <View style={[s.row, s.th]}>
        <Text style={s.summaryPlayer}>Player</Text>
        <Text style={s.summaryNum}>Current</Text>
        <Text style={s.summaryNum}>Review</Text>
        <Text style={s.summaryNum}>G Comp</Text>
        <Text style={s.summaryNum}>All Comp</Text>
        <Text style={s.summaryNum}>G General</Text>
        <Text style={s.summaryNum}>Gap</Text>
        <Text style={s.summaryDecision}>Review Status</Text>
      </View>

      {report.players.map((player, index) => (
        <View style={s.row} key={player.id} wrap={false}>
          <Text style={s.summaryPlayer}>
            #{index + 1} {player.name}
          </Text>
          <Text style={s.summaryNum}>
            {hiWithScoreCount(
              player.currentIndex,
              player.currentIndexScoreCount
            )}
          </Text>
          <Text style={s.summaryNum}>
            {hiWithScoreCount(
              player.reviewComparisonIndex,
              player.reviewComparisonScoreCount
            )}
          </Text>
          <Text style={s.summaryNum}>
            {hiWithScoreCount(
              player.goodrichCompetition24MonthsIndex,
              handicapScoreWindowCount(
                player.goodrichCompetition24MonthsRounds
              )
            )}
          </Text>
          <Text style={s.summaryNum}>
            {hiWithScoreCount(
              player.allCompetition24MonthsIndex,
              handicapScoreWindowCount(
                player.allCompetition24MonthsRounds
              )
            )}
          </Text>
          <Text style={s.summaryNum}>
            {hiWithScoreCount(
              player.goodrichGeneralLast10Index,
              handicapScoreWindowCount(
                player.goodrichGeneralLast10Rounds,
                10
              )
            )}
          </Text>
          <Text style={[s.summaryNum, advantageStyle(player.difference)]}>
            {player.difference === null
              ? "-"
              : Math.max(0, player.difference).toFixed(1)}
          </Text>
          <Text style={[s.summaryDecision, publicReviewStyle(player)]}>
            {publicReviewLabel(player)}
          </Text>
        </View>
      ))}

      <Footer generatedAt={report.generatedAt} />
    </Page>
  );
}

export function AuditBook({
  report,
  includeScoreHistory = false,
}: {
  report: AuditReport;
  includeScoreHistory?: boolean;
}) {
  return (
    <Document title="Goodrich Men's Club Current Handicap Review Sheet">
      <Page size="LETTER" style={s.cover}>
        <Text style={s.title}>Goodrich Men&apos;s Club</Text>
        <Text style={s.subtitle}>Current Handicap Review Sheet</Text>

        <View style={s.meta}>
          <View style={s.coverMetaRow}>
            <Text style={s.metaText}>
              Generated: {new Date(report.generatedAt).toLocaleString("en-US")}
            </Text>
            <Text style={s.metaText}>
              Players reviewed: {report.players.length}
            </Text>
          </View>

          <Text style={s.coverSectionTitle}>HOW WE CALCULATE IT</Text>

          <View style={s.coverStep}>
            <Text style={s.coverStepNumber}>1</Text>
            <Text style={s.coverStepText}>
              Start with the player&apos;s official{" "}
              <Text style={s.coverStepStrong}>Current GHIN Handicap Index.</Text>
            </Text>
          </View>

          <View style={s.coverStep}>
            <Text style={s.coverStepNumber}>2</Text>
            <Text style={s.coverStepText}>
              Build a <Text style={s.coverStepStrong}>Review HI</Text> from the
              last two years of scores. We prefer Goodrich competition scores;
              if that sample is small, we add other competition and Goodrich
              general-play scores as needed.
            </Text>
          </View>

          <View style={s.coverStep}>
            <Text style={s.coverStepNumber}>3</Text>
            <Text style={s.coverStepText}>
              <Text style={s.coverStepStrong}>Benefit of the doubt:</Text> with
              fewer than 10 Goodrich competition rounds, use the higher of the
              Last 20 Competition HI or the Two-Year Evidence HI. The higher
              HI is more favorable to the player.
            </Text>
          </View>

          <View style={s.coverStep}>
            <Text style={s.coverStepNumber}>4</Text>
            <Text style={s.coverStepText}>
              Subtract the Review HI from the Current GHIN Handicap Index.
            </Text>
          </View>

          <View style={s.coverFormula}>
            <Text style={s.coverFormulaLabel}>THE ONE FORMULA TO REMEMBER</Text>
            <Text style={s.coverFormulaValue}>
              STROKE DISCREPANCY = CURRENT GHIN HI - REVIEW HI
            </Text>
          </View>
        </View>

        <View style={s.coverAlert}>
          <Text style={s.coverAlertThreshold}>2.0 STROKES OR MORE</Text>
          <Text style={s.coverAlertTitle}>NEEDING A HANDICAP REVIEW</Text>
          <Text style={s.coverAlertText}>
            This means review the scoring history. It is not an automatic
            handicap adjustment and it does not change the player&apos;s official
            GHIN Handicap Index.
          </Text>
        </View>

        <Text style={s.coverDisclaimer}>
          Players on this sheet have at least five all-time competition scores
          and are ranked from highest to lowest Stroke Discrepancy.
        </Text>
      </Page>

      <Summary
        report={report}
        title="Current Handicap Review - Stroke Discrepancy"
        showGuide
      />

      {report.players.map((player, index) => (
        <React.Fragment key={player.id}>
          <PlayerPage
            player={player}
            generatedAt={report.generatedAt}
            rank={index + 1}
          />
          {includeScoreHistory ? (
            <>
              <HandicapScoreHistoryPage
                player={player}
                generatedAt={report.generatedAt}
                pageIndex={0}
              />
              <HandicapScoreHistoryPage
                player={player}
                generatedAt={report.generatedAt}
                pageIndex={1}
              />
            </>
          ) : null}
        </React.Fragment>
      ))}

      <Summary report={report} title="Current Handicap Review Reference" />
    </Document>
  );
}
