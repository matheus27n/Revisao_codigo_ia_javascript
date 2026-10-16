import Editor from "@monaco-editor/react";

function CodeEditor({ code, onCodeChange, readOnly }) {
  return (
    <div className="code-editor">
      <Editor
        height="100%"
        language="javascript"
        theme="vs-dark"
        value={code}
        onChange={(value) => onCodeChange(value ?? "")}
        loading="Carregando editor…"
        options={{
          readOnly,
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          tabSize: 2,
          padding: { top: 16 },
          ariaLabel: "Editor de código JavaScript",
        }}
      />
    </div>
  );
}

export default CodeEditor;
