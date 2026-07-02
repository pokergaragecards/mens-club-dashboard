export type AuditInput = {
  id: string;
  full_name: string;
  competition_average: number | null;
  casual_average: number | null;
  competition_gap: number | null;
};

export type AuditResult = AuditInput & {
  audit_score: number;
  flag: "Normal" | "Watch" | "Review";
  reasons: string[];
};

export function calculateAuditScore(row: AuditInput): AuditResult {
  let score = 0;
  const reasons: string[] = [];

  const gap = Number(row.competition_gap);

  if (!Number.isNaN(gap)) {
    if (gap <= -6) {
      score += 60;
      reasons.push("Competition rounds are 6+ strokes better than casual rounds.");
    } else if (gap <= -4) {
      score += 40;
      reasons.push("Competition rounds are 4+ strokes better than casual rounds.");
    } else if (gap <= -2) {
      score += 20;
      reasons.push("Competition rounds are 2+ strokes better than casual rounds.");
    }
  }

  let flag: AuditResult["flag"] = "Normal";

  if (score >= 60) flag = "Review";
  else if (score >= 20) flag = "Watch";

  return {
    ...row,
    audit_score: score,
    flag,
    reasons,
  };
}