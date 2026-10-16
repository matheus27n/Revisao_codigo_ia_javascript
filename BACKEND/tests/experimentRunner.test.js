import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { loadCase, runExperiment, REPOSITORY_ROOT } from "../scripts/experimentRunner.js";

const casePath = resolve(REPOSITORY_ROOT, "experiments/cases/non-experimental-smoke.json");
const scenarioByMode = { static: "C1", llm: "C2", hybrid: "C3" };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });
const quiet = () => {};

async function temporary(t) {
  const path = await mkdtemp(resolve(tmpdir(), "codereview-runner-test-"));
  t.after(async () => {
    assert.equal(dirname(resolve(path)), resolve(tmpdir()));
    await rm(path, { recursive: true, force: true });
  });
  return path;
}

function api(handler) {
  return async (url, options) => url.endsWith("/health")
    ? json({ status: "ok", service: "codereview-ai-backend" })
    : handler(JSON.parse(options.body), options);
}

test("coleta os três cenários sequencialmente, preserva payloads/respostas e não sobrescreve", async t => {
  const outputDir = await temporary(t);
  const requests = [];
  let active = 0;
  let maxActive = 0;
  const raw = mode => ({ scenario: scenarioByMode[mode], mode, original: { field: [null, "não normalizar"] }, validation: { valid: false } });
  const fetchImpl = api(async payload => {
    active++;
    maxActive = Math.max(active, maxActive);
    requests.push(payload);
    await new Promise(done => setTimeout(done, 2));
    active--;
    return json(raw(payload.mode));
  });
  const options = { casePaths: [casePath], outputDir, experimentId: "test-collection", repetitions: 2, fetchImpl, log: quiet };
  const { manifest, runDir } = await runExperiment(options);
  assert.equal(manifest.status, "completed");
  assert.equal(manifest.nonExperimental, true);
  assert.equal(maxActive, 1);
  assert.deepEqual(requests.map(item => item.mode), ["static", "llm", "hybrid", "static", "llm", "hybrid"]);
  for (const payload of requests) {
    assert.deepEqual(Object.keys(payload).sort(), ["code", "environment", "filename", "mode"]);
    const { mode, ...input } = payload;
    const { mode: firstMode, ...firstInput } = requests[0];
    assert.ok(mode && firstMode);
    assert.deepEqual(input, firstInput);
  }
  const hashes = [];
  for (const entry of manifest.executions) {
    const record = JSON.parse(await readFile(resolve(runDir, entry.path), "utf8"));
    assert.deepEqual(record.response, raw(entry.mode));
    assert.deepEqual(JSON.parse(record.responseText), record.response);
    assert.equal(record.input.code, requests[0].code);
    assert.equal(record.input.codeSha256, createHash("sha256").update(record.input.code).digest("hex"));
    assert.equal(record.experiment.scenario, scenarioByMode[entry.mode]);
    assert.equal(record.llm.temperature, null);
    assert.ok(record.execution.durationMs >= 0);
    hashes.push(record.input.codeSha256);
  }
  assert.equal(new Set(hashes).size, 1);
  const original = await readFile(resolve(runDir, manifest.executions[0].path), "utf8");
  await assert.rejects(runExperiment(options), /experimentId já existe/);
  assert.equal(await readFile(resolve(runDir, manifest.executions[0].path), "utf8"), original);
});

test("health check inválido não cria lote ou resultados", async t => {
  const root = await temporary(t);
  const outputDir = resolve(root, "results");
  for (const fetchImpl of [async () => { throw new Error("indisponível"); }, async () => json({ status: "outro" })]) {
    await assert.rejects(runExperiment({ casePaths: [casePath], outputDir, fetchImpl, log: quiet }), /Health check falhou/);
  }
  assert.deepEqual(await readdir(root), []);
});

test("HTTP com erro e JSON inválido são falhas separadas e deixam lote parcial", async t => {
  const { manifest, runDir } = await runExperiment({ casePaths: [casePath], outputDir: await temporary(t), log: quiet,
    fetchImpl: api(async payload => payload.mode === "static" ? json({ scenario: "C1", mode: "static" })
      : payload.mode === "llm" ? json({ error: "review_execution_failed", message: "Ollama indisponível" }, 500)
        : new Response("não é JSON", { status: 200 })),
  });
  assert.equal(manifest.status, "partial_failure");
  assert.deepEqual(manifest.executions.map(item => item.status), ["succeeded", "http_error", "invalid_json"]);
  const c2 = JSON.parse(await readFile(resolve(runDir, manifest.executions[1].path), "utf8"));
  assert.equal(c2.response, null);
  assert.equal(c2.http.status, 500);
  assert.equal(c2.errorResponse.message, "Ollama indisponível");
  assert.ok(c2.failure.failedAt);
  const c3 = JSON.parse(await readFile(resolve(runDir, manifest.executions[2].path), "utf8"));
  assert.equal(c3.responseText, "não é JSON");
});

test("timeout, rede e cenário incompatível nunca produzem coleta válida", async t => {
  const { manifest } = await runExperiment({ casePaths: [casePath], outputDir: await temporary(t), log: quiet,
    fetchImpl: api(async payload => {
      if (payload.mode === "static") throw Object.assign(new Error(), { name: "TimeoutError" });
      if (payload.mode === "llm") throw new TypeError("fetch failed");
      return json({ scenario: "C2", mode: "llm" });
    }),
  });
  assert.equal(manifest.status, "failed");
  assert.deepEqual(manifest.executions.map(item => item.status), ["timeout", "network_error", "contract_error"]);
});

test("valida metadados e preserva BOM/CRLF e hash dos bytes UTF-8", async t => {
  const path = await temporary(t);
  const metadata = JSON.parse(await readFile(casePath, "utf8"));
  metadata.sourceFile = "source.js";
  const source = Buffer.from("\ufeffconst valor = 1;\r\n", "utf8");
  const file = resolve(path, "case.json");
  await writeFile(resolve(path, "source.js"), source);
  await writeFile(file, JSON.stringify(metadata));
  const loaded = await loadCase(file);
  assert.deepEqual(Buffer.from(loaded.input.code, "utf8"), source);
  assert.equal(loaded.codeSha256, createHash("sha256").update(source).digest("hex"));
  await writeFile(file, JSON.stringify({ ...metadata, expectedCategory: "inventada" }));
  await assert.rejects(loadCase(file), /Metadados/);
  await writeFile(file, JSON.stringify({ ...metadata, id: "../escape" }));
  await assert.rejects(loadCase(file), /Metadados/);
  await writeFile(file, JSON.stringify(metadata));
  await writeFile(resolve(path, "source.js"), Buffer.from([0xff]));
  await assert.rejects(loadCase(file));
});
