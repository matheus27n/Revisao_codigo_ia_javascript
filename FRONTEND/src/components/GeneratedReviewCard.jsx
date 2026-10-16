const criticalityLabels = { low: "Baixa", medium: "Média", high: "Alta" };

export default function GeneratedReviewCard({ review, showReferences }) {
  return <article className="result-card">
    <div className="result-card-heading"><h3>{review.category?.label ?? "Sem categoria"}</h3>
      {review.criticality && <span className={`result-badge criticality-${review.criticality}`}>{criticalityLabels[review.criticality] ?? review.criticality}</span>}</div>
    {review.line != null && <p className="result-location">Linha {review.line}</p>}
    <h4>Descrição</h4><p>{review.description}</p>
    <h4>Justificativa</h4><p>{review.justification}</p>
    <h4>Sugestão</h4><p className="review-suggestion">{review.suggestion}</p>
    {showReferences && review.references?.length > 0 && <><h4>Referências</h4><ul>{review.references.map(reference => <li key={reference}>{reference}</li>)}</ul></>}
  </article>;
}
