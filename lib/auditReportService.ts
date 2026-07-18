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

export type AuditPlayerReport = {
  id: string;
  name: string;
  ghinNumber: string | null;
  currentIndex: number | null;
  competitionIndex: number | null;
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
};

export type AuditReport = {
  generatedAt: string;
  players: AuditPlayerReport[];
};
