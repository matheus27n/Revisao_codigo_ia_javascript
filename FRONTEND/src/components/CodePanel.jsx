import CodeEditor from "./CodeEditor";
import {
    FileCode2,
  } from "lucide-react";
  
  function CodePanel({ code, onCodeChange, filename, environment, readOnly }) {
    return (
      <section className="code-panel">
        <div className="panel-header">
          <div className="panel-title">
            <FileCode2 size={17} />
  
            <span>
              {filename}
            </span>
          </div>
  
          <span className="panel-status">
            {readOnly ? "Análise em andamento" : "Edição local"}
          </span>
        </div>
  
        <CodeEditor code={code} onCodeChange={onCodeChange} readOnly={readOnly} />
  
        <footer className="code-footer">
          <span>JavaScript</span>
          <span>UTF-8</span>
          <span>{environment === "react" ? "React" : "Node.js"}</span>
        </footer>
      </section>
    );
  }
  
  export default CodePanel;
