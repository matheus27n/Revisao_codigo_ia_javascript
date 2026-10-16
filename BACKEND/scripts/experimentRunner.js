import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { TextDecoder } from "node:util";

const execFileAsync = promisify(execFile);
export const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const SCENARIOS = Object.freeze([
  { scenario: "C1", mode: "static" },
  { scenario: "C2", mode: "llm" },
  { scenario: "C3", mode: "hybrid" },
]);

function safeId(value) {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(value)
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(value);
}

export async function loadCase(casePath) {
  const metadata = JSON.parse(await readFile(casePath, "utf8"));
  const allowed = ["schemaVersion", "id", "title", "kind", "environment", "filename", "sourceFile", "tags"];
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)
    || Object.keys(metadata).some(key => !allowed.includes(key))
    || metadata.schemaVersion !== "1.0" || !safeId(metadata.id)
    || typeof metadata.title !== "string" || !metadata.title.trim()
    || !["experimental", "non_experimental_smoke"].includes(metadata.kind)
    || !["node", "react"].includes(metadata.environment)
    || typeof metadata.filename !== "string" || !metadata.filename.trim()
    || metadata.filename !== metadata.filename.trim() || metadata.filename.length > 255
    || typeof metadata.sourceFile !== "string" || !metadata.sourceFile.trim() || isAbsolute(metadata.sourceFile)
    || !Array.isArray(metadata.tags) || metadata.tags.some(tag => typeof tag !== "string")) {
    throw new Error("Metadados do caso inválidos: verifique o formato 1.0 documentado em experiments/README.md.");
  }
  const bytes = await readFile(resolve(dirname(casePath), metadata.sourceFile));
  // Decodificação estrita: não substituir bytes inválidos nem remover BOM/CRLF.
  const code = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  if (!code.trim() || code.length > 100000) throw new Error(`[${metadata.id}] Código vazio ou acima de 100000 caracteres.`);
  return {
    metadata,
    input: { code, filename: metadata.filename, environment: metadata.environment },
    codeSha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function apiUrl(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("A URL da API deve usar HTTP/HTTPS, sem credenciais, query ou fragmento.");
  }
  return url.href.replace(/\/+$/, "");
}

export async function getRuntime(log = console.log) {
  let gitCommit = null;
  let gitDirty = null;
  try {
    gitCommit = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: REPOSITORY_ROOT })).stdout.trim();
    gitDirty = Boolean((await execFileAsync("git", ["status", "--porcelain"], { cwd: REPOSITORY_ROOT })).stdout.trim());
  } catch {
    log("Git indisponível ou repositório sem commit acessível; metadados indisponíveis serão null.");
  }
  return { nodeVersion: process.version, platform: process.platform, architecture: process.arch, gitCommit, gitDirty };
}

async function checkHealth(baseUrl, fetchImpl, timeoutMs) {
  try {
    const response = await fetchImpl(`${baseUrl}/health`, { signal: AbortSignal.timeout(Math.min(timeoutMs, 10000)) });
    const body = await response.json();
    if (!response.ok || body?.status !== "ok" || body?.service !== "codereview-ai-backend") throw new Error();
  } catch {
    throw new Error("Health check falhou: backend indisponível ou resposta incompatível. Nenhum lote foi criado.");
  }
}

async function collect({ baseUrl, fetchImpl, timeoutMs, input, scenario, mode }) {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  let httpStatus = null;
  let responseText = null;
  let parsed = null;
  let status = "network_error";
  let failure = null;
  try {
    const response = await fetchImpl(`${baseUrl}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, mode }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    httpStatus = response.status;
    responseText = await response.text();
    try { parsed = JSON.parse(responseText); } catch { /* Texto original preservado abaixo. */ }
    if (!response.ok) {
      status = "http_error";
      failure = { message: typeof parsed?.message === "string" ? parsed.message : "A API respondeu com erro HTTP." };
    } else if (parsed === null) {
      status = "invalid_json";
      failure = { message: "A resposta de sucesso não contém um objeto JSON válido." };
    } else if (parsed.scenario !== scenario || parsed.mode !== mode) {
      status = "contract_error";
      failure = { message: "Cenário ou modo retornado não corresponde à requisição." };
    } else status = "succeeded";
  } catch (error) {
    status = error.name === "TimeoutError" || error.name === "AbortError" ? "timeout" : "network_error";
    failure = { message: status === "timeout" ? "Tempo limite da requisição excedido; o processamento no servidor pode continuar." : "Falha de comunicação ou leitura da resposta da API." };
  }
  const finishedAt = new Date().toISOString();
  return {
    status,
    execution: { startedAt, finishedAt, durationMs: performance.now() - start },
    http: { status: httpStatus },
    // HTTP 200 com validação inválida é coleta realizada, não aprovação qualitativa.
    response: status === "succeeded" ? parsed : null,
    responseText,
    ...(failure ? { failure: { ...failure, failedAt: finishedAt }, errorResponse: parsed } : {}),
    llm: {
      provider: parsed?.generation?.provider ?? null,
      model: parsed?.generation?.model ?? null,
      temperature: null,
      seed: null,
      source: "provider/model: response.generation; temperature/seed: not_exposed_by_api",
    },
  };
}

export async function runExperiment({
  casePaths,
  outputDir = resolve(REPOSITORY_ROOT, "experiments/results"),
  apiBaseUrl = process.env.EXPERIMENT_API_BASE_URL ?? "http://127.0.0.1:3000/api",
  repetitions = 1,
  timeoutMs = 600000,
  experimentId = randomUUID(),
  fetchImpl = fetch,
  log = console.log,
}) {
  if (!Array.isArray(casePaths) || !casePaths.length) throw new Error("Informe ao menos um --case.");
  if (!Number.isSafeInteger(repetitions) || repetitions < 1 || repetitions > 100) throw new Error("repetitions deve ser inteiro entre 1 e 100; padrão 1.");
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) throw new Error("timeout-ms deve ser inteiro positivo até 2147483647.");
  if (!safeId(experimentId)) throw new Error("experimentId inválido.");
  const cases = [];
  for (const path of casePaths) cases.push(await loadCase(resolve(path)));
  if (new Set(cases.map(item => item.metadata.id.toLowerCase())).size !== cases.length) throw new Error("IDs de caso duplicados no lote.");
  if (new Set(cases.map(item => item.metadata.kind)).size !== 1) throw new Error("Não misture smoke e casos experimentais no mesmo lote.");
  const baseUrl = apiUrl(apiBaseUrl);
  await checkHealth(baseUrl, fetchImpl, timeoutMs);
  const runtime = await getRuntime(log);
  await mkdir(outputDir, { recursive: true });
  const runDir = resolve(outputDir, experimentId);
  try { await mkdir(runDir); } catch (error) {
    if (error.code === "EEXIST") throw new Error("experimentId já existe: nenhum resultado anterior será sobrescrito.");
    throw error;
  }
  const manifestPath = resolve(runDir, "manifest.json");
  const manifest = {
    schemaVersion: "1.0", experimentId, createdAt: new Date().toISOString(),
    kind: cases[0].metadata.kind,
    nonExperimental: cases[0].metadata.kind === "non_experimental_smoke",
    cases: cases.map(item => ({ ...item.metadata, codeSha256: item.codeSha256 })),
    scenarios: SCENARIOS.map(item => item.scenario), repetitions, timeoutMs, runtime,
    status: "running", executions: [],
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
  async function saveManifest() {
    const temporaryPath = resolve(runDir, `manifest-${randomUUID()}.tmp`);
    await writeFile(temporaryPath, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
    await rename(temporaryPath, manifestPath);
  }
  try {
    for (const item of cases) {
      for (let repetition = 1; repetition <= repetitions; repetition++) {
        const caseDir = resolve(runDir, item.metadata.id, `repetition-${String(repetition).padStart(3, "0")}`);
        await mkdir(caseDir, { recursive: true });
        for (const { scenario, mode } of SCENARIOS) {
          log(`[${item.metadata.id}] ${scenario} iniciado (repetição ${repetition})`);
          const collected = await collect({ baseUrl, fetchImpl, timeoutMs, input: item.input, scenario, mode });
          const record = {
            schemaVersion: "1.0",
            experiment: { experimentId, caseId: item.metadata.id, scenario, mode, repetition, kind: item.metadata.kind, nonExperimental: manifest.nonExperimental },
            input: { ...item.input, codeSha256: item.codeSha256 },
            runtime,
            ...collected,
          };
          const path = resolve(caseDir, `${scenario}.json`);
          await writeFile(path, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
          manifest.executions.push({ caseId: item.metadata.id, scenario, mode, repetition, status: collected.status,
            httpStatus: collected.http.status, path: relative(runDir, path).replaceAll("\\", "/") });
          await saveManifest();
          log(`[${item.metadata.id}] ${scenario} ${collected.status === "succeeded" ? "coletado" : `falhou (${collected.status}, HTTP ${collected.http.status ?? "indisponível"})`}`);
        }
      }
    }
    const successes = manifest.executions.filter(item => item.status === "succeeded").length;
    manifest.status = successes === manifest.executions.length ? "completed" : successes ? "partial_failure" : "failed";
    manifest.finishedAt = new Date().toISOString();
    await saveManifest();
  } catch (error) {
    manifest.status = "failed";
    manifest.finishedAt = new Date().toISOString();
    manifest.failure = { message: "Falha ao persistir o lote; verifique os arquivos. Não considerar coleta completa.", code: error.code ?? null };
    await saveManifest();
    throw error;
  }
  log(`Lote ${experimentId}: ${manifest.status}${manifest.nonExperimental ? " — SMOKE NÃO EXPERIMENTAL" : ""}`);
  return { manifest, runDir };
}
