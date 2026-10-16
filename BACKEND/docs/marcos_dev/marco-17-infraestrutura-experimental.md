# Marco 17 — Infraestrutura de execução e coleta experimental C1/C2/C3

## Objetivo

Preparar coleta reproduzível de casos externos nos três cenários existentes, preservando entradas, respostas brutas e metadados, sem avaliar a qualidade dos comentários ou criar o dataset final.

---

## Motivação e escopo

Após a conclusão do protótipo e da exportação, foi criada uma CLI para substituir a coleta manual futura. A execução utiliza `POST /api/reviews`, sem duplicar ou alterar C1/C2/C3, prompts, Retrieval, Ollama, parâmetros ou contratos. Não houve alteração no frontend ou adição de dependências.

---

## Arquitetura

```text
JSON externo + arquivo de código
       ↓
validação de metadados + snapshot UTF-8 + SHA-256
       ↓
GET /api/health
       ↓
lote UUID → caso → repetição → static → llm → hybrid
       ↓
registros C1/C2/C3 + manifest do lote
```

`BACKEND/scripts/runExperiment.js` oferece a CLI; `experimentRunner.js` implementa leitura, validação, HTTP e persistência. A infraestrutura e suas instruções estão em `experiments/`, sem mover arquivos existentes.

---

## Casos e runner

O formato 1.0 exige schemaVersion, id, title, kind, environment, filename, sourceFile relativo e tags. Campos extras, como resultados esperados ou ground truth, são rejeitados. Apenas um caso foi criado: `non-experimental-smoke`, de tipo `non_experimental_smoke`, reutilizando a Promise com executor async já usada no desenvolvimento.

O código é lido uma vez; os mesmos code, filename e environment são enviados nos três payloads. Somente mode muda. C2 não recebe dados de ESLint/RAG. O C3 usa a configuração normal do backend. A CLI aceita vários casos externos do mesmo tipo e repetições explícitas, com padrão 1.

```bash
cd BACKEND
npm run experiment:smoke
npm run experiment -- --case ../experiments/cases/non-experimental-smoke.json
```

`EXPERIMENT_API_BASE_URL` configura a API, com fallback local. O timeout padrão é 600000 ms por requisição e o health check usa até 10000 ms. Falha de health não cria lote.

---

## Resultados, metadados e rastreabilidade

```text
experiments/results/<experimentId>/manifest.json
experiments/results/<experimentId>/<caseId>/repetition-001/C1.json
experiments/results/<experimentId>/<caseId>/repetition-001/C2.json
experiments/results/<experimentId>/<caseId>/repetition-001/C3.json
```

Cada registro contém versão, identificação de lote/caso/cenário/repetição, classificação smoke, snapshot e hash, runtime, execução com timestamps ISO e duração observada pelo runner, HTTP, status, response integral e responseText original. Falhas possuem diagnóstico e errorResponse, sem inventar revisão válida.

O manifest começa como running, registra cada execução e termina como completed, partial_failure ou failed. Completed significa coleta de todos os cenários; não certifica validação ou qualidade dos textos. Falhas de persistência não são tratadas como sucesso.

Diretório exclusivo por UUID e escrita wx impedem sobrescrita dos registros. Somente o manifest do próprio lote é atualizado atomicamente durante sua execução.

O runtime registra Node, plataforma, arquitetura, commit e gitDirty. Provider/model vêm da resposta real; temperature/seed são null, pois a API não os expõe. O runner não lê .env nem impõe configuração ao servidor. Configuração esperada do projeto permanece Ollama/llama3.2:3b/0/42, sem alteração.

---

## Smoke técnico realizado

**Não experimental — não integra amostra, análise ou resultados científicos do TCC.**

Lote: `da490007-fcd3-41f2-9f56-66dfefc660ad`. Backend e Ollama estavam disponíveis. A CLI executou uma repetição, sequencialmente, e terminou com código 0 e manifest completed.

| Cenário | HTTP | Verificação técnica observada |
|---|---|---|
| C1 | 200 | Um alerta estático; sem generation/retrieval |
| C2 | 200 | Uma review; referências vazias; sem analysis/retrieval; validation.valid true |
| C3 | 200 | Um alerta, três ocorrências de contexto e uma review; validation.valid true |

C2/C3 informaram provider ollama e modelo llama3.2:3b. As quatro peças de rastreabilidade foram verificadas: mesmo código, mesmo hash, filename promiseService.js e environment node. response foi comparada com JSON.parse(responseText), sem normalização científica.

```text
codeSha256 = 46e01d6508daf0d5417ab36fd422373f35835189aa6414ec7ed3e6b0e149eb8b
gitCommit = c5555ac8896cab7b9fb138314306d936f8f37dbd
gitDirty = true
```

Nenhuma avaliação qualitativa ou métrica científica foi calculada.

---

## Testes e checks

`npm test`: 14 testes aprovados, zero falhas — nove existentes preservados e cinco novos para o runner. Os testes novos usam respostas simuladas, não resultados experimentais:

- execução sequencial e igualdade de payloads em duas repetições técnicas;
- resposta bruta/hash e não sobrescrita;
- health inválido sem arquivos;
- HTTP com erro, JSON inválido, timeout, rede e cenário incompatível;
- metadados e preservação de BOM/CRLF/UTF-8.

Foi testada também indisponibilidade real da API em uma porta sem servidor: encerramento controlado com código 1, sem novo lote. A ajuda da CLI e `node --check` dos dois scripts passaram. Não existe script lint no backend; ele não foi adicionado nem apresentado como executado. `git diff --check` passou.

---

## Arquivos criados e modificados

Criados:

```text
BACKEND/scripts/runExperiment.js
BACKEND/scripts/experimentRunner.js
BACKEND/tests/experimentRunner.test.js
experiments/README.md
experiments/cases/non-experimental-smoke.json
experiments/cases/sources/non-experimental-smoke.js
experiments/results/da490007-fcd3-41f2-9f56-66dfefc660ad/manifest.json
experiments/results/da490007-fcd3-41f2-9f56-66dfefc660ad/non-experimental-smoke/repetition-001/C1.json
experiments/results/da490007-fcd3-41f2-9f56-66dfefc660ad/non-experimental-smoke/repetition-001/C2.json
experiments/results/da490007-fcd3-41f2-9f56-66dfefc660ad/non-experimental-smoke/repetition-001/C3.json
BACKEND/docs/marcos_dev/marco-17-infraestrutura-experimental.md
docs/relatorios_execucao/marco-17-relatorio-execucao.md
```

Modificados: `BACKEND/package.json` (dois scripts npm) e `AGENTS.md`. Arquivos de implementação dos cenários, testes existentes, frontend e .gitignore foram preservados.

---

## Limitações e pendências

- Política de versionamento/guarda dos resultados ainda precisa ser definida; nenhum ignore, staging ou commit foi feito.
- Dataset, ground truth e número científico de repetições serão definidos posteriormente.
- A API não atesta temperature/seed; o pesquisador deve controlar a configuração real do servidor.
- O SHA Git com gitDirty true não identifica sozinho o conteúdo de todas as alterações locais.
- Não há retry, retomada ou controle de concorrência entre processos independentes. Interrupção pode deixar manifest running; isso não significa coleta concluída.
- Timeout cancela a espera do cliente; a geração pode continuar no servidor.
- Os artefatos não substituem avaliação qualitativa; validation.valid não representa qualidade técnica.

---

## Critério de conclusão e situação do marco

**Concluído.**

Infraestrutura implementada, checks disponíveis aprovados e smoke técnico validado por API real nos três cenários, com entradas/hashes idênticos e respostas brutas preservadas. As decisões metodológicas e de versionamento pendentes não foram assumidas como concluídas. Nenhum marco posterior iniciado; nenhum commit ou merge realizado.
