export default function ESLintAlertCard({ alert }) {
  return <article className="result-card">
    <div className="result-card-heading"><h3>{alert.ruleId ?? "Alerta de sintaxe"}</h3>
      {alert.severity && <span className={`result-badge severity-${alert.severity}`}>{alert.severity}</span>}</div>
    <p className="result-category">{alert.category?.label ?? "Sem categoria"}</p>
    <p>{alert.message}</p>
    {alert.line != null && <p className="result-location">Linha {alert.line}{alert.column != null && `, coluna ${alert.column}`}</p>}
  </article>;
}
