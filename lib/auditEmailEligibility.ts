type AuditEmailDecision = {
  code: string;
  suggestedIndex: number | null;
};

const EMAIL_ADJUSTMENT_DECISIONS = new Set([
  "adjustment_supported",
  "provisional_adjustment",
]);

export function shouldShowPrepareEmail(decision: AuditEmailDecision) {
  return (
    EMAIL_ADJUSTMENT_DECISIONS.has(decision.code) &&
    decision.suggestedIndex !== null &&
    Number.isFinite(decision.suggestedIndex)
  );
}
