# Marco 17 — Relatório de execução

## Data e contexto

16/10/2026, America/Sao_Paulo. Transição do protótipo para infraestrutura de coleta futura. Marcos 12 a 16 já concluídos. O repositório estava sem alterações locais no início desta tarefa e não possuía estrutura experimental.

Foram inspecionados AGENTS.md, estrutura do repositório, package.json, controllers/serviços/configuração/categorias do backend, serviço/adapter do frontend e documentação/relatórios anteriores. Não foi necessário alterar os cenários existentes.

## Objetivo

Coletar sequencialmente respostas reais de C1/C2/C3 para os mesmos casos externos, com snapshot, SHA-256, runtime, tempos e manifest, sem criar dataset final ou avaliar qualidade dos comentários.

## Arquivos criados

- `BACKEND/scripts/experimentRunner.js`
- `BACKEND/scripts/runExperiment.js`
- `BACKEND/tests/experimentRunner.test.js`
- `experiments/README.md`
- `experiments/cases/non-experimental-smoke.json`
- `experiments/cases/sources/non-experimental-smoke.js`
- `BACKEND/docs/marcos_dev/marco-17-infraestrutura-experimental.md`
- `docs/relatorios_execucao/marco-17-relatorio-execucao.md`
- Quatro artefatos técnicos em `experiments/results/da490007-fcd3-41f2-9f56-66dfefc660ad/`: manifest.json e C1.json/C2.json/C3.json em `non-experimental-smoke/repetition-001/`.

## Arquivos modificados

- `BACKEND/package.json`: adicionados experiment e experiment:smoke; scripts anteriores preservados.
- `AGENTS.md`: histórico e decisões permanentes da infraestrutura experimental.

Não foram alterados frontend, serviços/controllers/validators/configuração do backend, prompts, Retrieval, base de conhecimento, parâmetros, contratos, testes existentes ou .gitignore. Nenhuma dependência adicionada.

## Estrutura e decisões implementadas

Casos versionados 1.0 com sourceFile relativo, classificação explícita do smoke e validação antes de coleta. Um único caso técnico foi criado. Códigos UTF-8 estritos são carregados uma vez e enviados sem alteração; hash calculado sobre bytes originais, incluindo BOM e CRLF quando presentes.

O runner usa GET /api/health e POST /api/reviews; não importa nem replica runStaticReview/runLLMOnlyReview/runHybridReview. Payloads diferem apenas em mode. Todos os casos, repetições e cenários são sequenciais. Padrão de uma repetição, sem retry automático.

Resultados ficam em diretórios exclusivos por UUID/caso/repetição/cenário. São usados mkdir exclusivo e escrita wx. Manifest atualizado no próprio lote, com execução em andamento, completa, parcial ou falha. Os registros preservam response e responseText; erros de transporte/HTTP não viram resultados válidos.

Metadados: timestamps ISO, duração por relógio monotônico do runner, Node/plataforma/arquitetura, Git SHA/dirty e provider/model observados. Temperature/seed ficam null porque não são expostos pela API. O runner não presume configuração do servidor, lê segredos ou grava nomes de usuário/hostname/caminhos absolutos do usuário nos registros.

## Comandos executados

Inspeção: Get-Content, Get-ChildItem, rg --files, git status --short, git diff e git diff --check.

Em BACKEND, usando a instalação local do Node/npm no PATH:

```powershell
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
& 'C:\Program Files\nodejs\npm.cmd' test
& 'C:\Program Files\nodejs\npm.cmd' run experiment:smoke
```

Verificação de disponibilidade com curl.exe em /api/health e /api/tags do Ollama. A API respondeu ok e o Ollama informou llama3.2:3b disponível.

Na raiz:

```text
node BACKEND/scripts/runExperiment.js --help
node --check BACKEND/scripts/runExperiment.js
node --check BACKEND/scripts/experimentRunner.js
git diff --check
```

Também foi executado experiment:smoke com EXPERIMENT_API_BASE_URL apontando para a porta local 13999 sem backend, somente no processo de teste. Nenhuma configuração persistente foi alterada. O CLI encerrou com código 1 e mensagem de health check falho, sem criar outro lote.

## Smoke real executado

**Técnico, non_experimental_smoke. Não integra dados finais, amostra ou resultados científicos do TCC.**

```text
experimentId: da490007-fcd3-41f2-9f56-66dfefc660ad
caseId: non-experimental-smoke
repetitions: 1
status: completed
gitCommit: c5555ac8896cab7b9fb138314306d936f8f37dbd
gitDirty: true
filename: promiseService.js
environment: node
codeSha256: 46e01d6508daf0d5417ab36fd422373f35835189aa6414ec7ed3e6b0e149eb8b
```

| Cenário | HTTP | Status da coleta | Dados técnicos observados |
|---|---|---|---|
| C1 | 200 | succeeded | Um alerta; sem geração/retrieval |
| C2 | 200 | succeeded | Uma review, references vazias, validation.valid true; sem analysis/retrieval |
| C3 | 200 | succeeded | Um alerta, três ocorrências de contexto, uma review e validation.valid true |

C2 e C3 informaram provider ollama e modelo llama3.2:3b. Não se mediu ou inferiu temperature/seed na API. O código dos serviços e seus parâmetros foram preservados.

Após a coleta, os quatro arquivos foram abertos com Node/readFile. Assertions confirmaram mesmo código/hash/filename/environment, hash igual ao arquivo fonte, cenário/mode corretos, três respostas brutas iguais a JSON.parse(responseText), isolamento observado e provider/model iguais. Nenhuma avaliação de qualidade ou média científica foi produzida.

## Testes e checks

- npm test final: **14 aprovados, zero falhas**; nove testes existentes e cinco testes novos do runner.
- Testes novos cobrem sequência sem concorrência, duas repetições técnicas simuladas, igualdade dos payloads, persistência/imutabilidade da resposta original, hash, colisão sem sobrescrita, health sem arquivos, HTTP 500, JSON inválido, timeout, rede, cenário incompatível e UTF-8/BOM/CRLF.
- As respostas dos testes unitários são simuladas, não dados de experimento.
- API indisponível real: encerramento controlado, código 1, nenhum lote novo; permaneceu apenas o UUID do smoke bem-sucedido.
- Ajuda da CLI e node --check dos dois scripts: aprovados.
- Lint: backend não possui script; não foi executado npm run lint nem adicionado lint ao projeto.
- git diff --check: aprovado.
- Frontend não alterado; build/lint do frontend não foram reexecutados nesta tarefa.

## Erros encontrados e correções

A primeira execução do novo teste de colisão falhou porque a expressão regular do teste esperava outra redação da mensagem. O runner já rejeitava corretamente o diretório existente, sem sobrescrever arquivos. Após investigar o diagnóstico, ajustou-se somente a expressão do teste novo para reconhecer a mensagem de colisão. A comparação de conteúdo anterior permaneceu no teste. Nenhum teste existente foi alterado.

Não houve erro durante o smoke real. A falha de health na porta sem servidor foi provocada deliberadamente para verificar o controle de indisponibilidade.

## Limitações e pendências

- Política de versionamento/guarda de resultados deve ser definida; resultados do smoke permanecem no workspace, sem regra nova de ignore, staging ou commit.
- Dataset final, ground truth e quantidade científica de repetições não foram criados/definidos.
- Configuração real de temperature/seed não é atestável pela API atual; exige controle externo do backend.
- Git dirty registra a limitação de reproduzir alterações locais só pelo SHA.
- Não há retomada de lote/retry/trava entre runners independentes; interrupção pode deixar running. Timeout do cliente não garante interrupção do Ollama.
- Coleta completed e validation.valid não são avaliação qualitativa das reviews.

## Situação do marco

**Concluído.** Infraestrutura implementada, testes/checks disponíveis aprovados e smoke real validado nos três cenários. As pendências metodológicas e de versionamento foram explicitadas sem serem assumidas como encerradas.

Nenhum commit, merge ou marco posterior iniciado.

## Sugestão de commit

```text
feat: criar infraestrutura de coleta experimental C1 C2 e C3
```
