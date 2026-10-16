import { useState } from "react";
import { Bot, Braces, FileSearch, LayoutDashboard, LoaderCircle } from "lucide-react";
import ESLintAlertCard from "./ESLintAlertCard";
import ContextCard from "./ContextCard";
import GeneratedReviewCard from "./GeneratedReviewCard";
import ReviewSummary from "./ReviewSummary";

const tabs = [
  { id: "summary", label: "Resumo", icon: LayoutDashboard },
  { id: "eslint", label: "ESLint", icon: Braces },
  { id: "context", label: "Contexto", icon: FileSearch },
  { id: "comments", label: "Comentários", icon: Bot },
];

function ResultContent({ result, activeTab, isResultStale }) {
  if (activeTab === "summary") return <ReviewSummary result={result} isResultStale={isResultStale} />;
  if (activeTab === "eslint") {
    if (!result.usesStatic) return <p>A análise estática não é utilizada no cenário C2.</p>;
    return result.staticAlerts.length ? result.staticAlerts.map((alert, index) => <ESLintAlertCard key={index} alert={alert} />) : <p>Nenhum alerta estático encontrado.</p>;
  }
  if (activeTab === "context") {
    if (!result.usesContext) return <p>A recuperação de contexto não é utilizada no cenário {result.scenario}.</p>;
    return result.contexts.length ? result.contexts.map((context, index) => <ContextCard key={context.document.documentId ?? index} context={context} />) : <p>Nenhum contexto foi recuperado para os alertas deste cenário híbrido.</p>;
  }
  if (!result.usesLLM) return <p>O cenário C1 utiliza apenas análise estática e não gera comentários com LLM.</p>;
  if (result.generationSkipped) return <p>Nenhum alerta estático foi encontrado. A geração com LLM não foi necessária neste cenário híbrido.</p>;
  return result.reviews.length ? result.reviews.map((review, index) => (
    <GeneratedReviewCard key={index} review={review} showReferences={result.usesContext && result.validation?.valid === true} />
  )) : <p>{result.validation?.valid === false ? "Nenhum comentário disponível para apresentação após a falha de validação." : "Nenhum comentário foi produzido pelo modelo."}</p>;
}

const errorTitles = {
  input: "Código vazio",
  network: "Falha de comunicação",
  http: "O backend não concluiu a análise",
  response: "Resposta inesperada do backend",
  unexpected: "Erro inesperado",
};

export default function ResultsPanel({ result, isAnalyzing, analyzingMode, error, isResultStale, exportActions }) {
  const [activeTab, setActiveTab] = useState("summary");

  function handleTabKeyDown(event, index) {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (index + tabs.length - 1) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[nextIndex].id);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[nextIndex].focus();
  }

  return (
    <section className="results-panel" aria-label="Resultados da análise" aria-busy={isAnalyzing}>
      {exportActions}
      <div className="results-tabs" role="tablist" aria-label="Visualização dos resultados">
        {tabs.map(({ id, label, icon: Icon }, index) => (
          <button key={id} id={`tab-${id}`} role="tab" aria-selected={activeTab === id}
            aria-controls={`panel-${id}`} className={`result-tab${activeTab === id ? " active" : ""}`}
            type="button" tabIndex={activeTab === id ? 0 : -1}
            onKeyDown={(event) => handleTabKeyDown(event, index)} onClick={() => setActiveTab(id)}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>
      {result && !isAnalyzing && !error && <p className={`result-origin${isResultStale ? " result-origin-stale" : ""}`}>
        {isResultStale ? "Última análise · desatualizada" : "Resultado da análise"}: {result.scenario} · {result.filename} · {result.environment}
      </p>}
      <div id={`panel-${activeTab}`} role="tabpanel" tabIndex={0} aria-labelledby={`tab-${activeTab}`} className={result && !isAnalyzing && !error ? "analysis-result" : "empty-results"}>
        {isAnalyzing ? <div className="analysis-loading" role="status">
          <LoaderCircle className="loading-spinner" size={30} aria-hidden="true" />
          <h2>Executando análise...</h2>
          <p>{analyzingMode === "static" ? "Aguarde o processamento da análise estática." : "O modelo local pode demorar. Aguarde a conclusão da análise."}</p>
        </div>
          : error ? <div role="alert" className="analysis-error">
            <h2>{errorTitles[error.type] ?? errorTitles.unexpected}{error.status != null && ` (HTTP ${error.status})`}</h2>
            <p>{error.message}</p>
          </div>
            : result ? <>
              {result.validation?.valid === false && <div className="validation-warning" role="alert">
                <strong>Validação falhou</strong>
                <p>Os comentários retornados não passaram na validação do backend e não devem ser considerados validados.</p>
                {result.validation.errors?.length > 0 && <ul>{result.validation.errors.map((item, index) => <li key={index}>{item.message ?? item.type}</li>)}</ul>}
              </div>}
              <ResultContent result={result} activeTab={activeTab} isResultStale={isResultStale} />
            </> : <>
              <div className="empty-icon"><Bot size={30} /></div>
              <h2>Nenhuma análise executada</h2>
              <p>Insira um código e clique em <strong>Analisar Código</strong> para visualizar os resultados.</p>
            </>}
      </div>
    </section>
  );
}
