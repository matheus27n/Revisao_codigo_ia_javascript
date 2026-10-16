import { useRef } from "react";
import {
    Clipboard,
    CloudUpload,
    Sparkles,
  } from "lucide-react";
  
  function ReviewToolbar({ environment, onEnvironmentChange, mode, onModeChange, onPaste, onUpload, onAnalyze, isAnalyzing }) {
    const fileInputRef = useRef(null);

    return (
      <section className="review-toolbar">
        <div className="toolbar-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onPaste}
          >
            <Clipboard size={17} />
            Colar código
          </button>
  
          <button
            className="secondary-button"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <CloudUpload size={17} />
            Upload de arquivo
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".js,.jsx,.mjs,.cjs"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              onUpload(file);
            }}
          />
        </div>
  
        <div className="toolbar-config">
          <label className="field">
            <span>Ambiente</span>
  
            <select value={environment} onChange={(event) => onEnvironmentChange(event.target.value)}>
              <option value="node">
                Node.js
              </option>
  
              <option value="react">
                React
              </option>
            </select>
          </label>
  
          <label className="field">
            <span>Modo</span>
  
            <select value={mode} onChange={(event) => onModeChange(event.target.value)}>
              <option value="static">
                C1 — Estático
              </option>
  
              <option value="llm">
                C2 — LLM
              </option>
  
              <option value="hybrid">
                C3 — Híbrido
              </option>
            </select>
          </label>
  
          <button
            className="primary-button"
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing}
          >
            <Sparkles size={18} />
            {isAnalyzing ? "Analisando..." : "Analisar Código"}
          </button>
        </div>
      </section>
    );
  }
  
  export default ReviewToolbar;
