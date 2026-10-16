import { useState } from "react";
import Header from "../components/Header";
import ReviewToolbar from "../components/ReviewToolbar";
import MetricsBar from "../components/MetricsBar";
import CodePanel from "../components/CodePanel";
import ResultsPanel from "../components/ResultsPanel";
import { submitReview } from "../services/reviewService";

import "../styles/review-page.css";

function ReviewPage() {
  const [code, setCode] = useState('function greet(name) {\n  return `Olá, ${name}!`;\n}\n\nconsole.log(greet("Mundo"));\n');
  const [filename, setFilename] = useState("snippet.js");
  const [environment, setEnvironment] = useState("node");
  const [mode, setMode] = useState("hybrid");
  const [inputError, setInputError] = useState("");
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

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
    if (isAnalyzing) return;
    setAnalysisError("");
    setAnalysisResult(null);

    if (!code.trim()) {
      setAnalysisError("Insira um código antes de executar a análise.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await submitReview({ code, filename, environment, mode });
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisError(error.message || "Não foi possível executar a análise. Tente novamente.");
    } finally {
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

        <MetricsBar />

        <div className="review-workspace">
          <CodePanel
            code={code}
            onCodeChange={setCode}
            filename={filename}
            environment={environment}
          />

          <ResultsPanel result={analysisResult} isAnalyzing={isAnalyzing} error={analysisError} />
        </div>
      </main>
    </div>
  );
}

export default ReviewPage;
