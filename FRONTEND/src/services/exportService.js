import { adaptReviewResult } from "../adapters/reviewAdapter.js";

export function buildReviewExportJson({ result, analyzedInput, stale = false, exportedAt = new Date().toISOString() }) {
  if (!result || !analyzedInput) throw new Error("Nenhuma análise disponível para exportação.");
  return {
    exportVersion: "1.0",
    exportedAt,
    application: "CodeReview AI",
    stale: Boolean(stale),
    ...(stale ? { staleReason: "inputs_changed_after_analysis" } : {}),
    input: { ...analyzedInput },
    result,
  };
}

function text(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/([\\`*_{}[\]()#+.!|~])/g, "\\$1").replace(/\r?\n/g, " ");
}

function fence(value, language = "text") {
  const content = String(value);
  const length = [...content.matchAll(/`+/g)].reduce((max, match) => Math.max(max, match[0].length + 1), 3);
  const delimiter = "`".repeat(length);
  return `${delimiter}${language}\n${content}${content.endsWith("\n") ? "" : "\n"}${delimiter}`;
}

export function buildReviewMarkdown(options) {
  const exported = buildReviewExportJson(options);
  const { input, result, stale, exportedAt } = exported;
  const view = adaptReviewResult(result);
  const lines = [
    "# CodeReview AI — Relatório de revisão", "", "## Informações da análise", "",
    `- Versão da exportação: ${exported.exportVersion}`,
    `- Cenário: ${text(result.scenario)}`,
    `- Modo: ${text(input.mode)}`,
    `- Ambiente: ${text(input.environment)}`,
    `- Arquivo: ${text(input.filename)}`,
    `- Data da exportação: ${text(exportedAt)}`,
    `- Resultado desatualizado: ${stale ? "Sim" : "Não"} (stale: ${stale})`, "",
  ];
  if (stale) lines.push("Os dados atuais da interface foram modificados após esta execução. Este relatório exporta a última análise e seu código original, não as entradas atuais do editor.", "");
  lines.push("A data de exportação indica a criação deste arquivo; não substitui timestamps de geração do backend.", "",
    "## Código analisado", "", fence(input.code, /\.jsx$/i.test(input.filename) ? "jsx" : "javascript"), "",
    "## Resumo", "", `- Issues: ${view.metrics.issues}`, `- Categorias: ${view.metrics.categories}`,
    `- Categorias encontradas: ${view.categories.map(category => text(category.label)).join(", ") || "Nenhuma"}`,
    `- Contextos: ${view.metrics.contexts}`, `- Status da execução: ${text(view.metrics.status)}`, "");
  if (view.validation) lines.push(`- Status de validação: ${view.validation.valid === true ? "Aprovada" : view.validation.valid === false ? "Falhou" : "Não disponível"}`, "");
  if (view.validation?.valid === false) lines.push("Atenção: a validação falhou. Os comentários e referências abaixo são os dados retornados e não devem ser tratados como validados.", "");

  if (view.usesStatic) {
    lines.push("## Alertas do ESLint", "");
    if (!view.staticAlerts.length) lines.push("Nenhum alerta estático encontrado.", "");
    view.staticAlerts.forEach((alert, index) => {
      lines.push(`### Alerta ${index + 1}${alert.ruleId ? ` — ${text(alert.ruleId)}` : ""}`, "",
        `- Categoria: ${text(alert.category?.label ?? "Sem categoria")}`);
      for (const [key, label] of [["severity", "Severidade"], ["line", "Linha"], ["column", "Coluna"]]) {
        if (alert[key] != null) lines.push(`- ${label}: ${text(alert[key])}`);
      }
      if (alert.message != null) lines.push("", "Mensagem:", "", fence(alert.message));
      lines.push("");
    });
  } else lines.push("A análise estática não é utilizada no cenário C2.", "");

  if (view.usesContext) {
    lines.push("## Contextos recuperados", "", "O total do resumo conta ocorrências por alerta. Documentos repetidos são agrupados por documentId, mantendo suas associações. O score representa correspondência determinística por metadados, não similaridade vetorial.", "");
    if (!view.contexts.length) lines.push("Nenhum contexto recuperado.", "");
    view.contexts.forEach(({ document, matches }, index) => {
      lines.push(`### Documento ${index + 1} — ${text(document.title ?? document.documentId ?? "Contexto recuperado")}`, "");
      for (const [key, label] of [["documentId", "Identificador"], ["technology", "Tecnologia"], ["ruleId", "Regra do documento"], ["documentPath", "Caminho do documento"]]) {
        if (document[key] != null) lines.push(`- ${label}: ${text(document[key])}`);
      }
      if (document.summary != null) lines.push("", fence(document.summary));
      lines.push("", "Associações com alertas:", "");
      for (const match of matches) {
        lines.push(`- ${[
          match.ruleId != null ? `Regra: ${text(match.ruleId)}` : null,
          match.line != null ? `Linha: ${text(match.line)}` : null,
          match.score != null ? `Score: ${text(match.score)}` : null,
          match.retrievalReason != null ? `Motivo: ${text(match.retrievalReason)}` : null,
        ].filter(Boolean).join(" · ")}`);
      }
      if (document.source != null) lines.push("", "Fonte:", "", fence(JSON.stringify(document.source, null, 2), "json"));
      lines.push("");
    });
  } else lines.push(`A recuperação de contexto não é utilizada no cenário ${text(result.scenario)}.`, "");

  if (view.usesLLM) {
    lines.push("## Comentários gerados", "");
    if (view.generationSkipped) lines.push("Nenhum alerta estático foi encontrado. A geração com LLM foi dispensada neste cenário híbrido.", "");
    else if (!view.reviews.length) lines.push("Nenhum comentário foi produzido pelo modelo.", "");
    view.reviews.forEach((review, index) => {
      lines.push(`### Comentário ${index + 1}`, "");
      for (const [key, label] of [["reviewId", "reviewId"], ["alertId", "alertId"], ...(view.usesContext ? [["ruleId", "ruleId"]] : [])]) {
        if (review[key] != null) lines.push(`- ${label}: ${text(review[key])}`);
      }
      lines.push(`- Categoria: ${text(review.category?.label ?? "Sem categoria")}`);
      if (review.criticality != null) lines.push(`- Criticidade: ${text(review.criticality)}`);
      if (review.line != null) lines.push(`- Linha: ${text(review.line)}`);
      for (const [key, label] of [["description", "Descrição"], ["justification", "Justificativa"], ["suggestion", "Sugestão"]]) {
        if (review[key] != null) lines.push("", `#### ${label}`, "", fence(review[key]));
      }
      lines.push("", review.references?.length ? `Referências: ${review.references.map(text).join(", ")}` : "Referências: nenhuma", "");
    });
    if (result.generation != null) lines.push("## Informações da geração", "", fence(JSON.stringify(result.generation, null, 2), "json"), "");
    if (result.validation != null) {
      lines.push("## Validação", "");
      if (result.validation.valid != null) lines.push(`- valid: ${text(result.validation.valid)}`);
      if (result.validation.stage != null) lines.push(`- stage: ${text(result.validation.stage)}`);
      if (result.validation.errors?.length) lines.push("", "Erros:", "", fence(JSON.stringify(result.validation.errors, null, 2), "json"));
      lines.push("", "A validação verifica a estrutura e as consistências implementadas no backend; não representa avaliação qualitativa da correção técnica do comentário.", "");
    }
  } else lines.push("O cenário C1 utiliza somente análise estática e não gera comentários com LLM.", "");
  return lines.join("\n");
}

export function buildExportFilename(exported, extension) {
  const clean = (value, limit) => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, limit);
  const filename = clean(exported.input.filename.replace(/\.(jsx?|mjs|cjs)$/i, ""), 60) || "snippet";
  const scenario = clean(exported.result.scenario, 12) || "review";
  const timestamp = exported.exportedAt.replace(/[^0-9TZ]/g, "");
  return `codereview-ai-${scenario}-${filename}-${timestamp}.${extension}`;
}

function download(content, mime, filename) {
  const anchor = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  try {
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    // Dar ao navegador tempo para iniciar o download antes de liberar o recurso.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function exportReviewAsJson(options) {
  const exported = buildReviewExportJson(options);
  download(JSON.stringify(exported, null, 2), "application/json;charset=utf-8", buildExportFilename(exported, "json"));
}

export function exportReviewAsMarkdown(options) {
  const exported = buildReviewExportJson(options);
  download(buildReviewMarkdown({ ...options, exportedAt: exported.exportedAt }), "text/markdown;charset=utf-8", buildExportFilename(exported, "md"));
}
