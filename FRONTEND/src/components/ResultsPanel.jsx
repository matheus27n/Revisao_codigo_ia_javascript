import { useState } from "react";
import { Bot, Braces, FileSearch, LayoutDashboard } from "lucide-react";
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

function ResultContent({ result, activeTab }) {
  if (activeTab === "summary") return <ReviewSummary result={result} />;
  if (activeTab === "eslint") {
    if (!result.usesStatic) return <p>A análise estática não é utilizada no cenário C2.</p>;
    return result.staticAlerts.length ? result.staticAlerts.map((alert, index) => <ESLintAlertCard key={index} alert={alert} />) : <p>Nenhum alerta estático encontrado.</p>;
  }
  if (activeTab === "context") {
    if (!result.usesContext) return <p>A recuperação de contexto não é utilizada no cenário {result.scenario}.</p>;
    return result.contexts.length ? result.contexts.map((context, index) => <ContextCard key={context.document.documentId ?? index} context={context} />) : <p>Nenhum contexto recuperado.</p>;
  }
  if (!result.usesLLM) return <p>O cenário C1 utiliza apenas análise estática e não gera comentários com LLM.</p>;
  if (result.generationSkipped) return <p>Nenhum alerta estático foi encontrado. A geração com LLM não foi necessária neste cenário híbrido.</p>;
  return result.reviews.length ? result.reviews.map((review, index) => (
    <GeneratedReviewCard key={index} review={review} showReferences={result.usesContext && result.validation?.valid === true} />
  )) : <p>{result.validation?.valid === false ? "Nenhum comentário disponível para apresentação após a falha de validação." : "Nenhum comentário gerado."}</p>;
}

export default function ResultsPanel({ result, isAnalyzing, error }) {
  const [activeTab, setActiveTab] = useState("summary");
  return (
    <section className="results-panel" aria-label="Resultados da análise" aria-busy={isAnalyzing}>
      <div className="results-tabs" role="tablist" aria-label="Visualização dos resultados">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} id={`tab-${id}`} role="tab" aria-selected={activeTab === id}
            aria-controls={`panel-${id}`} className={`result-tab${activeTab === id ? " active" : ""}`}
            type="button" onClick={() => setActiveTab(id)}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>
      <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className={result && !isAnalyzing && !error ? "analysis-result" : "empty-results"}>
        {isAnalyzing ? <p role="status">Executando análise...</p>
          : error ? <p role="alert" className="analysis-error">{error}</p>
            : result ? <>
              {result.validation?.valid === false && <div className="validation-warning" role="alert">
                <strong>Validação falhou</strong>
                <p>Os comentários retornados não passaram na validação do backend e não devem ser considerados validados.</p>
                {result.validation.errors?.length > 0 && <ul>{result.validation.errors.map((item, index) => <li key={index}>{item.message ?? item.type}</li>)}</ul>}
              </div>}
              <ResultContent result={result} activeTab={activeTab} />
            </> : <>
              <div className="empty-icon"><Bot size={30} /></div>
              <h2>Nenhuma análise executada</h2>
              <p>Insira um código e clique em <strong>Analisar Código</strong> para visualizar os resultados.</p>
            </>}
      </div>
    </section>
  );
}
