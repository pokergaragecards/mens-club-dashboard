type AuditEmailDecision = {
  code: string;
  suggestedIndex: number | null;
};

export function shouldShowPrepareEmail(decision: AuditEmailDecision) {
  return (
    decision.suggestedIndex !== null &&
    Number.isFinite(decision.suggestedIndex)
  );
}
