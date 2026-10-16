export default function ReviewSummary({ result }) {
  return <div className="review-summary">
    <h2>{result.metrics.status}</h2>
    <dl className="summary-fields">
      <div><dt>Cenário</dt><dd>{result.scenario}</dd></div>
      <div><dt>Modo</dt><dd>{result.modeLabel}</dd></div>
      <div><dt>Ambiente</dt><dd>{result.environment}</dd></div>
      <div><dt>Arquivo</dt><dd>{result.filename}</dd></div>
      <div><dt>Issues encontradas</dt><dd>{result.metrics.issues}</dd></div>
      <div><dt>Categorias encontradas</dt><dd>{result.categories.map(category => category.label).join(", ") || "Nenhuma categoria"}</dd></div>
      <div><dt>Contextos recuperados</dt><dd>{result.metrics.contexts}</dd></div>
    </dl>
    {result.generationSkipped && <p className="result-notice">Nenhum alerta estático foi encontrado. A geração com LLM não foi necessária neste cenário híbrido.</p>}
    {result.usesLLM && <p>Validação: {result.validation?.valid === true ? "Aprovada" : result.validation?.valid === false ? "Falhou" : "Não disponível"}. A validação verifica a estrutura e a consistência previstas no backend; não comprova a qualidade técnica dos comentários.</p>}
    {result.usesContext && <p className="result-muted">O total conta ocorrências recuperadas por alerta. Na aba Contexto, documentos repetidos são agrupados por identificador. O score representa correspondência por metadados.</p>}
  </div>;
}
