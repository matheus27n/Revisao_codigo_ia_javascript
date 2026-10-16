import { useRef, useState } from "react";
import Header from "../components/Header";
import ReviewToolbar from "../components/ReviewToolbar";
import MetricsBar from "../components/MetricsBar";
import CodePanel from "../components/CodePanel";
import ResultsPanel from "../components/ResultsPanel";
import { ReviewRequestError, submitReview } from "../services/reviewService";
import { adaptReviewResult } from "../adapters/reviewAdapter";

import "../styles/review-page.css";

function ReviewPage() {
  const [code, setCode] = useState('function greet(name) {\n  return `Olá, ${name}!`;\n}\n\nconsole.log(greet("Mundo"));\n');
  const [filename, setFilename] = useState("snippet.js");
  const [environment, setEnvironment] = useState("node");
  const [mode, setMode] = useState("hybrid");
  const [inputError, setInputError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [analyzedInput, setAnalyzedInput] = useState(null);
  const requestInFlight = useRef(false);
  const review = adaptReviewResult(analysisResult);
  const isResultStale = Boolean(analysisResult && analyzedInput && (
    code !== analyzedInput.code || filename !== analyzedInput.filename ||
    environment !== analyzedInput.environment || mode !== analyzedInput.mode
  ));

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setCode(text);
      setInputError("");
    } catch {
      setInputError("Não foi possível acessar a área de transferência. Permita o acesso ou cole diretamente no editor.");
    }
  }

  async function handleUpload(file) {
    if (!file) return;

    if (!/\.(js|jsx|mjs|cjs)$/i.test(file.name)) {
      setInputError("Selecione um arquivo .js, .jsx, .mjs ou .cjs.");
      return;
    }

    try {
      const text = await file.text();
      setCode(text);
      setFilename(file.name);
      setInputError("");
    } catch {
      setInputError("Não foi possível ler o arquivo. Tente novamente.");
    }
  }

  async function handleAnalyze() {
    if (requestInFlight.current) return;
    setAnalysisError(null);
    setAnalysisResult(null);
    setAnalyzedInput(null);
    setInputError("");

    if (!code.trim()) {
      setAnalysisError({ type: "input", message: "Insira um código antes de executar a análise." });
      return;
    }

    const submittedInput = { code, filename, environment, mode };
    requestInFlight.current = true;
    setIsAnalyzing(true);
    try {
      const result = await submitReview(submittedInput);
      setAnalysisResult(result);
      setAnalyzedInput(submittedInput);
    } catch (error) {
      setAnalysisError(error instanceof ReviewRequestError
        ? { type: error.type, message: error.message, status: error.status, apiMessage: error.apiMessage }
        : { type: "unexpected", message: "Ocorreu um erro inesperado ao analisar o código. Tente novamente." });
    } finally {
      requestInFlight.current = false;
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="app-shell">
      <Header />

      <main className="review-page">
        <ReviewToolbar
          environment={environment}
          onEnvironmentChange={setEnvironment}
          mode={mode}
          onModeChange={setMode}
          onPaste={handlePaste}
          onUpload={handleUpload}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
        />

        {inputError && <p className="input-error" role="alert">{inputError}</p>}

        {isResultStale && <div className="stale-notice" role="status">
          <strong>Resultado desatualizado — última análise: {review.scenario}</strong>
          <p>Os dados de entrada foram alterados após a última análise. Execute uma nova análise para atualizar os resultados.</p>
        </div>}

        <MetricsBar metrics={review?.metrics} isAnalyzing={isAnalyzing} error={analysisError} isResultStale={isResultStale} />

        <div className="review-workspace">
          <CodePanel
            code={code}
            onCodeChange={setCode}
            filename={filename}
            environment={environment}
            readOnly={isAnalyzing}
          />

          <ResultsPanel result={review} isAnalyzing={isAnalyzing} analyzingMode={mode} error={analysisError} isResultStale={isResultStale} />
        </div>
      </main>
    </div>
  );
}

export default ReviewPage;
