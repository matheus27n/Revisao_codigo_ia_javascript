export default function ContextCard({ context }) {
  const { document, matches } = context;
  return <article className="result-card">
    <h3>{document.title ?? document.documentId}</h3><p className="result-category">{document.documentId}</p>
    {document.technology && <p>Tecnologia: {document.technology}</p>}
    {document.ruleId && <p>Regra do documento: {document.ruleId}</p>}
    {document.summary && <p>{document.summary}</p>}
    <ul>{matches.map((match, index) => <li key={index}>
      {match.ruleId ?? "Alerta"}{match.line != null && ` · Linha ${match.line}`}
      {match.score != null && ` · Score: ${match.score}`}{match.retrievalReason && ` · ${match.retrievalReason}`}
    </li>)}</ul>
    {document.source && <p>Fonte: {document.source.provider}{document.source.document && ` · ${document.source.document}`}</p>}
    {document.documentPath && <p>Documento: {document.documentPath}</p>}
  </article>;
}
