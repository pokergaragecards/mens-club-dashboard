export type AuditTrendPoint = {
  date: string;
  handicapIndex: number;
};

export type AuditRound = {
  id: string;
  playedAt: string;
  courseName: string;
  teeName: string;
  score: number | null;
  differential: number;
  category: "Competition" | "General Play";
  usedInCalculation?: boolean;
};

export type AuditScoreHistoryRound = AuditRound & {
  overallIndexAfterRound: number | null;
  categoryIndexAfterRound: number | null;
};

export type AuditBreakdownRow = {
  label: string;
  rounds: number;
  used: number;
  calculatedHi: number | null;
  averageDifferential: number | null;
  scores: number[];
  differentials: number[];
  usedDifferentials: number[];
};

export type AuditReportDecisionCode =
  | "adjustment_supported"
  | "provisional_adjustment"
  | "manual_review"
  | "monitor"
  | "no_adjustment"
  | "no_action";

export type AuditReportDecision = {
  code: AuditReportDecisionCode;
  label: string;
  suggestedIndex: number | null;
  summary: string;
  evidence: string[];
};

export type AuditPlayerReport = {
  id: string;
  name: string;
  ghinNumber: string | null;
  currentIndex: number | null;
  competitionIndex: number | null;
  last12MonthsCompetitionIndex: number | null;
  last12MonthsCompetitionRounds: number;
  evidenceCutoffDate: string;
  goodrichCompetition24MonthsIndex: number | null;
  goodrichCompetition24MonthsRounds: number;
  allCompetition24MonthsIndex: number | null;
  allCompetition24MonthsRounds: number;
  goodrichGeneralLast10Index: number | null;
  goodrichGeneralLast10Rounds: number;
  committeeEvidenceIndex: number | null;
  committeeEvidenceBasisLabel: string;
  committeeEvidenceFormula: string;
  reviewComparisonIndex: number | null;
  reviewComparisonBasisLabel: string;
  generalIndex: number | null;
  difference: number | null;
  competitionVsGoodrichGeneralGap: number | null;
  sandbagScore: number;
  flag: "NO ACTION" | "MONITOR" | "REVIEW" | "INVESTIGATE";
  competitionRounds: number;
  generalRounds: number;
  competitionAverage: number | null;
  generalAverage: number | null;
  competitionTrend: AuditTrendPoint[];
  generalTrend: AuditTrendPoint[];
  rounds: AuditRound[];
  scoreHistory: AuditScoreHistoryRound[];
  breakdown: AuditBreakdownRow[];
  decision: AuditReportDecision;
};

export type AuditReport = {
  generatedAt: string;
  players: AuditPlayerReport[];
};
