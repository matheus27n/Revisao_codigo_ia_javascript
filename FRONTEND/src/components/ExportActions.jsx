import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { exportReviewAsJson, exportReviewAsMarkdown } from "../services/exportService.js";

export default function ExportActions({ result, analyzedInput, isAnalyzing, isResultStale }) {
  const [feedback, setFeedback] = useState(null);
  const disabled = !result || !analyzedInput || isAnalyzing;

  useEffect(() => {
    if (!feedback) return;
    const timeout = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  function handleExport(format) {
    if (disabled) return;
    try {
      const options = { result, analyzedInput, stale: isResultStale };
      if (format === "JSON") exportReviewAsJson(options);
      else exportReviewAsMarkdown(options);
      setFeedback({ error: false, message: `Download ${format} iniciado.` });
    } catch {
      setFeedback({ error: true, message: "Não foi possível exportar a análise. Tente novamente." });
    }
  }

  return <div className="export-actions">
    <div className="export-buttons">
      <span>{isResultStale ? "Exportar última análise" : "Exportar análise"}</span>
      <button type="button" className="secondary-button" disabled={disabled} onClick={() => handleExport("JSON")}>
        <Download size={15} aria-hidden="true" /> Exportar JSON
      </button>
      <button type="button" className="secondary-button" disabled={disabled} onClick={() => handleExport("Markdown")}>
        <Download size={15} aria-hidden="true" /> Exportar Markdown
      </button>
    </div>
    {feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "export-error" : "export-feedback"}>{feedback.message}</p>}
  </div>;
}
