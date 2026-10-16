import { parseArgs } from "node:util";
import { runExperiment } from "./experimentRunner.js";

try {
  const { values } = parseArgs({ options: {
    case: { type: "string", multiple: true },
    repetitions: { type: "string", default: "1" },
    "timeout-ms": { type: "string", default: "600000" },
    "output-dir": { type: "string" },
    help: { type: "boolean" },
  } });
  if (values.help) {
    console.log("Uso: npm run experiment -- --case <arquivo.json> [--case <outro.json>] [--repetitions 1] [--timeout-ms 600000] [--output-dir <diretório>]");
    console.log("API: EXPERIMENT_API_BASE_URL (padrão http://127.0.0.1:3000/api). Consulte experiments/README.md.");
  } else {
    const { manifest } = await runExperiment({
      casePaths: values.case,
      repetitions: Number(values.repetitions),
      timeoutMs: Number(values["timeout-ms"]),
      ...(values["output-dir"] ? { outputDir: values["output-dir"] } : {}),
    });
    if (manifest.status !== "completed") process.exitCode = 1;
  }
} catch (error) {
  const message = error.code ? `Falha de sistema (${error.code}); verifique arquivos, diretórios e permissões.` : error.message;
  console.error(`Runner encerrado: ${message}`);
  process.exitCode = 1;
}
