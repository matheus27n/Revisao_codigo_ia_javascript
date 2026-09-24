import CodeEditor from "./CodeEditor";
import {
    FileCode2,
  } from "lucide-react";
  
  function CodePanel({ code, onCodeChange, filename, environment }) {
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
            Edição local
          </span>
        </div>
  
        <CodeEditor code={code} onCodeChange={onCodeChange} />
  
        <footer className="code-footer">
          <span>JavaScript</span>
          <span>UTF-8</span>
          <span>{environment === "react" ? "React" : "Node.js"}</span>
        </footer>
      </section>
    );
  }
  
  export default CodePanel;
