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
  nextSteps: string[];
};

export type AuditPlayerReport = {
  id: string;
  name: string;
  ghinNumber: string | null;
  currentIndex: number | null;
  competitionIndex: number | null;
  last12MonthsCompetitionIndex: number | null;
  last12MonthsCompetitionRounds: number;
  generalIndex: number | null;
  difference: number | null;
  flag: "NO ACTION" | "MONITOR" | "REVIEW" | "INVESTIGATE";
  competitionRounds: number;
  generalRounds: number;
  competitionAverage: number | null;
  generalAverage: number | null;
  competitionTrend: AuditTrendPoint[];
  generalTrend: AuditTrendPoint[];
  rounds: AuditRound[];
  breakdown: AuditBreakdownRow[];
  decision: AuditReportDecision;
};

export type AuditReport = {
  generatedAt: string;
  players: AuditPlayerReport[];
};
