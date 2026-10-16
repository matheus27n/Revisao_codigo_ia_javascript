# Infraestrutura de execução e coleta C1/C2/C3

## Propósito

Executar casos definidos externamente pela interface oficial `POST /api/reviews`, preservando entradas, respostas brutas e metadados. Esta infraestrutura não avalia relevância, clareza, correção, utilidade ou alucinação e não produz conclusões do TCC.

**O único caso fornecido é `non_experimental_smoke`. Ele e seus resultados não integram a amostra nem os resultados científicos da pesquisa.** O dataset final e a quantidade de repetições serão definidos posteriormente.

## Estrutura

```text
experiments/
├── cases/
│   ├── non-experimental-smoke.json
│   └── sources/non-experimental-smoke.js
├── results/
│   └── <experimentId>/
│       ├── manifest.json
│       └── <caseId>/
│           └── repetition-001/
│               ├── C1.json
│               ├── C2.json
│               └── C3.json
└── README.md

BACKEND/scripts/
├── runExperiment.js       # CLI
└── experimentRunner.js    # leitura, validação, HTTP e persistência
```

O manifest fica junto do lote, sem diretório paralelo de manifests. Casos externos não precisam ser copiados para o repositório.

## Requisitos

- Dependências normais do backend instaladas; nenhuma dependência adicional.
- Node.js com fetch, Blob/Response e AbortSignal.timeout nativos (o ambiente validado utiliza Node 24).
- Backend iniciado separadamente com `npm start` ou `npm run dev` em `BACKEND`.
- Ollama acessível ao backend e modelo configurado disponível para C2/C3. O runner não inicia, instala ou reconfigura o modelo.
- Git opcional para registrar o SHA e a existência de alterações locais.

## Como executar

Em `BACKEND`:

```bash
npm run experiment:smoke
npm run experiment -- --case ../experiments/cases/non-experimental-smoke.json
npm run experiment -- --case /caminho/caso.json --repetitions 1
npm run experiment -- --case /caminho/a.json --case /caminho/b.json
npm run experiment -- --help
```

Use aspas para caminhos com espaços. Caminhos passados por CLI são relativos ao diretório de execução; `sourceFile` é relativo ao JSON do caso. O diretório padrão de resultados é sempre `experiments/results/` da raiz deste repositório.

API configurável, sem credenciais:

```powershell
$env:EXPERIMENT_API_BASE_URL = 'http://127.0.0.1:3000/api'
npm run experiment:smoke
```

Fallback: `http://127.0.0.1:3000/api`. Não são aceitos protocolo diferente de HTTP/HTTPS, credenciais, query ou fragmento na URL base. A URL não é copiada para os artefatos, evitando registrar endereços de máquina desnecessários.

Opções:

| Opção | Comportamento |
|---|---|
| `--case` | Obrigatória; pode se repetir, sem IDs duplicados |
| `--repetitions` | Inteiro de 1 a 100; padrão **1**, sem decisão metodológica sobre repetições finais |
| `--timeout-ms` | Limite de cada requisição; padrão 600000 ms; health check limitado a 10000 ms |
| `--output-dir` | Diretório de lotes; padrão `experiments/results` |

Não executar dois runners simultaneamente se o objetivo for reduzir interferência local. Dentro de cada processo, não há paralelismo de cenários ou repetições.

## Formato dos casos — versão 1.0

O arquivo fornecido é um exemplo técnico completo:

```json
{
  "schemaVersion": "1.0",
  "id": "non-experimental-smoke",
  "title": "Verificação técnica do runner — não integra a amostra do TCC",
  "kind": "non_experimental_smoke",
  "environment": "node",
  "filename": "promiseService.js",
  "sourceFile": "sources/non-experimental-smoke.js",
  "tags": ["smoke", "non_experimental"]
}
```

Todos os campos são obrigatórios. `kind` aceita `non_experimental_smoke` ou `experimental`, exclusivamente para classificar casos futuros fornecidos pelo pesquisador. Não é permitido misturar os dois tipos no mesmo lote.

`id` aceita 1 a 64 caracteres alfanuméricos, hífen e underscore, começando por alfanumérico, sem nomes reservados de dispositivo Windows. IDs duplicados são verificados sem distinguir maiúsculas/minúsculas. `environment` é `node` ou `react`; `filename` é não vazio, sem espaços nas extremidades e limitado a 255 caracteres. `sourceFile` é um caminho relativo; `tags` é um array de strings. Campos extras, inclusive ground truth ou resultados esperados, são rejeitados.

O código é lido uma única vez por lote, em UTF-8 estrito, preservando BOM, espaços e finais de linha. Código vazio/apenas espaços, UTF-8 inválido ou mais de 100000 caracteres são rejeitados antes de criar um lote. SHA-256 é calculado sobre os bytes originais. UTF-8 válido permite reconstruir esses mesmos bytes a partir da string registrada.

## Execução e independência dos cenários

```text
validar todos os casos e carregar os códigos
  → GET /api/health
  → reservar diretório exclusivo do lote
  → caso → repetição → C1(static) → C2(llm) → C3(hybrid)
  → persistir cada execução e atualizar manifest
```

O payload contém somente `code`, `filename`, `environment` e `mode`. Para o mesmo caso, apenas `mode` muda. Não são enviados ao C2 alertas, categorias, regras, contextos ou dados de outro cenário. O runner não importa os serviços de revisão e não duplica lógica experimental. O C3 utiliza os defaults existentes do backend, sem enviar `maxContexts` ou parâmetros LLM.

## Formato dos registros

Cada JSON possui:

- `schemaVersion: "1.0"`;
- `experiment`: UUID comum do lote, caseId, scenario, mode, repetição, kind e nonExperimental;
- `input`: filename, environment, código exato e codeSha256;
- `runtime`: nodeVersion, platform, architecture, gitCommit e gitDirty;
- `status`: succeeded, http_error, network_error, timeout, invalid_json ou contract_error;
- `execution`: startedAt/finishedAt ISO 8601 e durationMs observado pelo runner;
- `http.status`: status recebido ou null;
- `response`: objeto original integral da resposta bem-sucedida, sem normalização;
- `responseText`: corpo textual original, preservado inclusive em erro;
- `failure` e `errorResponse`: diagnóstico e corpo recebido quando a execução falha;
- `llm`: provider/model observados em generation, temperature/seed null por não serem expostos pela API, e descrição da fonte.

`generation.durationMs`, generatedAt, tokens, comentários, validação e demais campos do backend permanecem intactos em response. Os tempos observados pelo runner têm outro significado e não os substituem. Respostas HTTP com erro não são colocadas em `response` como se fossem revisões válidas.

## Configuração LLM e runtime

O projeto espera atualmente Ollama, `llama3.2:3b`, temperature 0 e seed 42. O runner **não sobrescreve nem infere esses parâmetros no servidor**. Registra provider/model quando constam na resposta, mas não consegue atestar temperature/seed do backend em execução. O pesquisador deve controlar a configuração do servidor ao preparar uma coleta científica.

Não são coletados .env, tokens, senhas, API keys, hostname ou caminho absoluto do usuário. Falhas de Git geram aviso e metadados indisponíveis null. `gitDirty: true` indica que o SHA sozinho não representa as alterações locais; os arquivos modificados precisam ser preservados pelo pesquisador para reprodução futura.

## Manifest, falhas e não sobrescrita

Um UUID nativo identifica cada lote. O diretório é reservado sem sobrescrever diretórios existentes. Os arquivos de cenário são criados com `flag: wx`. O manifest do próprio lote é atualizado por arquivo temporário e rename; resultados anteriores não são substituídos.

O manifest contém versão, experimentId, createdAt/finishedAt, tipo do lote, indicação não experimental, casos com hashes, cenários, repetições, timeout, runtime e lista de execuções com status, HTTP e caminho relativo.

- `running`: lote em andamento ou interrompido antes da finalização;
- `completed`: todas as respostas foram coletadas com HTTP de sucesso, JSON e scenario/mode compatíveis;
- `partial_failure`: parte das execuções foi coletada e outra falhou;
- `failed`: nenhuma execução foi coletada ou ocorreu falha de persistência.

`completed` significa coleta completa, **não** qualidade técnica aprovada, `validation.valid = true` ou geração necessariamente concluída. Todos esses dados permanecem disponíveis na resposta original.

Falhas de um cenário são gravadas e os demais cenários são tentados sequencialmente. HTTP, mensagem, cenário e timestamps permitem diagnóstico. O CLI termina com código 1 em falha parcial/total e 0 em coleta completa. Health check incompatível/indisponível encerra antes de criar arquivos de lote. Falha de gravação não é mascarada como sucesso.

Não há retry automático, retomada de lote interrompido ou cancelamento do processamento do servidor. Após timeout, o backend/Ollama pode continuar processando a requisição; o timeout cancela a espera do cliente. Lotes interrompidos não devem ser interpretados como completos.

## Smoke validado no Marco 17

Lote técnico: `da490007-fcd3-41f2-9f56-66dfefc660ad`, uma repetição, três coletas HTTP 200. Os artefatos estão em `results/<experimentId>/`. Código/hash/filename/environment iguais e responses comparadas a `JSON.parse(responseText)`.

SHA-256 do código:

```text
46e01d6508daf0d5417ab36fd422373f35835189aa6414ec7ed3e6b0e149eb8b
```

Este lote é somente verificação de infraestrutura. Não representa experimento científico nem pode integrar resultados do TCC.

## Versionamento e pendências

A política de versionamento dos resultados experimentais ainda precisa ser definida pelo pesquisador. Nenhuma regra de ignore foi adicionada, nenhum arquivo foi staged e nenhum commit foi criado. Os quatro arquivos do smoke foram mantidos no disco para inspeção, identificados como não experimentais; sua presença no workspace não decide seu versionamento.

Permanecem para decisões posteriores: dataset/ground truth, quantidade científica de repetições, controle do estado do servidor e política de guarda/versionamento dos dados. Não foram implementadas avaliações qualitativas ou métricas científicas.
