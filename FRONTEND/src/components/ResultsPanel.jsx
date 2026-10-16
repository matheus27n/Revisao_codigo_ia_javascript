import {
    Bot,
    Braces,
    FileSearch,
    LayoutDashboard,
  } from "lucide-react";
  
  function ResultsPanel({ result, isAnalyzing, error }) {
    return (
      <section className="results-panel">
        <div className="results-tabs">
          <button
            className="result-tab active"
            type="button"
          >
            <LayoutDashboard size={16} />
            Resumo
          </button>
  
          <button
            className="result-tab"
            type="button"
          >
            <Braces size={16} />
            ESLint
          </button>
  
          <button
            className="result-tab"
            type="button"
          >
            <FileSearch size={16} />
            Contexto
          </button>
  
          <button
            className="result-tab"
            type="button"
          >
            <Bot size={16} />
            Comentários
          </button>
        </div>
  
        {isAnalyzing ? (
          <div className="empty-results" role="status">Executando análise...</div>
        ) : error ? (
          <div className="empty-results" role="alert"><p className="analysis-error">{error}</p></div>
        ) : result !== null ? (
          <div className="analysis-result">
            <h2 role="status">Análise concluída</h2>
            <p>Cenário: {result.scenario}</p>
            <p>Modo: {result.mode}</p>
            {/* Visualização temporária para validar a integração do Marco 14.1. */}
            <pre className="analysis-json">{JSON.stringify(result, null, 2)}</pre>
          </div>
        ) : (
        <div className="empty-results">
          <div className="empty-icon">
            <Bot size={30} />
          </div>
  
          <h2>
            Nenhuma análise executada
          </h2>
  
          <p>
            Insira um código e clique em
            {" "}
            <strong>
              Analisar Código
            </strong>
            {" "}
            para visualizar os resultados.
          </p>
        </div>
        )}
      </section>
    );
  }
  
  export default ResultsPanel;
