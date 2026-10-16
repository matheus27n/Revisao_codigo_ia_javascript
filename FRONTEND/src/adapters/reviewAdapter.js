import { REVIEW_MODES } from "../constants/reviewModes.js";

export function adaptReviewResult(result) {
  if (!result) return null;
  const usesStatic = ["C1", "C3"].includes(result.scenario);
  const usesLLM = ["C2", "C3"].includes(result.scenario);
  const usesContext = result.scenario === "C3";
  const staticAlerts = usesStatic ? result.analysis?.alerts ?? [] : [];
  const reviews = usesLLM ? result.validation?.data?.reviews ?? [] : [];
  const validation = usesLLM ? result.validation ?? null : null;
  const generation = usesLLM ? result.generation ?? null : null;
  const generationSkipped = usesContext && generation?.skipped === true && generation.reason === "no_static_alerts";
  const documents = new Map();
  if (usesContext) {
    for (const alert of staticAlerts) {
      for (const context of alert.contexts ?? []) {
        const key = context.documentId ?? context;
        if (!documents.has(key)) documents.set(key, { document: context, matches: [] });
        documents.get(key).matches.push({ ruleId: alert.ruleId, line: alert.line, score: context.score, retrievalReason: context.retrievalReason });
      }
    }
  }
  const categoryItems = result.scenario === "C1" ? staticAlerts : usesContext ? [...staticAlerts, ...reviews] : reviews;
  const categories = [...new Map(categoryItems.filter(item => item.category?.id).map(item => [item.category.id, item.category])).values()];
  const modeInfo = Object.values(REVIEW_MODES).find(item => item.id === result.mode);
  return {
    scenario: result.scenario, mode: result.mode,
    modeLabel: modeInfo ? `${modeInfo.scenario} — ${modeInfo.label}` : result.mode,
    environment: result.environment, filename: result.filename,
    metrics: {
      issues: result.scenario === "C1" ? staticAlerts.length : usesContext ? (generationSkipped || validation?.valid !== true ? 0 : reviews.length) : reviews.length,
      categories: categories.length,
      contexts: usesContext ? result.retrieval?.totalContexts ?? staticAlerts.reduce((sum, alert) => sum + (alert.contexts?.length ?? 0), 0) : 0,
      status: validation?.valid === false ? "Validação falhou" : "Concluída",
    },
    categories, staticAlerts, contexts: [...documents.values()], reviews,
    generation, validation, generationSkipped, usesStatic, usesContext, usesLLM,
  };
}
