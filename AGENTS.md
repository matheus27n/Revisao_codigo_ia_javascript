# AGENTS.md

## Projeto

Este repositório contém o projeto de TCC:

**CodeReview AI — Revisão de Código Assistida por IA em Aplicações JavaScript**

O sistema possui dois módulos principais:

```text
BACKEND/
FRONTEND/
```

O objetivo do projeto é investigar experimentalmente três abordagens de revisão de código JavaScript:

```text
C1 — análise estática isolada
C2 — LLM isolado
C3 — abordagem híbrida
```

A implementação deve preservar rigorosamente a separação entre esses três cenários.

---

## Regra principal de trabalho

Antes de modificar qualquer arquivo:

1. Leia a estrutura atual do projeto.
2. Leia os arquivos relacionados à tarefa.
3. Não faça refatorações amplas sem necessidade.
4. Preserve funcionalidades já validadas.
5. Não altere contratos do backend sem necessidade explícita.
6. Faça mudanças incrementais e fáceis de revisar.
7. Explique resumidamente o que foi alterado ao finalizar.
8. Não faça commit automaticamente, a menos que isso seja solicitado explicitamente.

---

# BACKEND

## Tecnologias

```text
Node.js
Express
JavaScript ES Modules
Zod
ESLint
Ollama
Llama 3.2 3B
```

O backend utiliza ES Modules. Use `import` e `export`; não introduza CommonJS.

## Cenários experimentais

### C1 — Static

`mode = static`

Fluxo:

```text
Código → ESLint → classificação → resposta
```

C1 NÃO pode utilizar LLM, RAG ou base de conhecimento.

Serviço principal: `runStaticReview()`.

### C2 — LLM

`mode = llm`

Fluxo:

```text
Código → prompt exclusivo C2 → Ollama/Llama → validação
```

C2 NÃO pode receber alertas ESLint, `ruleId` do ESLint, RAG, documentos da base de conhecimento ou contextos recuperados.

No C2:

```text
references = []
```

Serviço principal: `runLLMOnlyReview()`.

Arquivos relacionados:

```text
src/config/llmOnlyOutputContract.js
src/services/llmOnlyPromptBuilderService.js
src/services/llmOnlyResponseValidationService.js
src/validators/llmOnlyReviewValidator.js
```

### C3 — Hybrid

`mode = hybrid`

Fluxo:

```text
Código → ESLint → classificação → Retrieval → Prompt Builder → Ollama/Llama → validação
```

Serviço principal: `runHybridReview()`.

No C3, referências retornadas pelo LLM devem corresponder somente aos documentos recuperados.

## Categorias oficiais

Não criar categorias novas sem solicitação explícita.

```text
readability
→ Legibilidade e clareza

maintainability
→ Manutenibilidade e estrutura

error_handling
→ Tratamento de erros e fluxos assíncronos

best_practices
→ Boas práticas em React e Node.js
```

Quando uma regra não puder ser classificada com segurança:

```js
category: null
```

Nunca force uma classificação.

## Retrieval / RAG

A base está em:

```text
BACKEND/base-conhecimento/
```

A recuperação atual é determinística por metadados.

Não descrever ou implementar o score atual como similaridade vetorial.

Regras atuais:

```text
100 → exact_rule_match
70  → category_environment_match
```

Não transformar o Retrieval em busca vetorial sem solicitação explícita.

## LLM

Provider atual:

```text
Ollama
```

Modelo atual:

```text
llama3.2:3b
```

Parâmetros experimentais:

```text
temperature = 0
seed = 42
```

C2 e C3 devem utilizar o mesmo modelo e parâmetros.

Não substituir Ollama por OpenAI ou outro provider sem solicitação explícita.

## Validação do LLM

No C3, a validação verifica:

```text
JSON válido
schema válido
alertId
ruleId
category
line
references
duplicidade
reviews ausentes
```

A validação NÃO comprova automaticamente a qualidade técnica de:

```text
description
justification
suggestion
```

Não trate validação estrutural como avaliação qualitativa.

## Rotas importantes

```text
GET  /api/health

POST /api/reviews
     mode = static | llm | hybrid

POST /api/reviews/evidence
POST /api/reviews/prompt-preview
POST /api/reviews/generate-preview

GET  /api/knowledge/status
POST /api/knowledge/retrieve
```

`/evidence`, `/prompt-preview` e `/generate-preview` são endpoints técnicos, não cenários experimentais formais.

---

# FRONTEND

## Tecnologias

```text
React
Vite
JavaScript
CSS próprio
lucide-react
@monaco-editor/react
```

Não introduza TypeScript, Tailwind, Redux, React Router ou Axios sem necessidade explícita.

Para chamadas HTTP, inicialmente usar:

```js
fetch()
```

## Estrutura esperada

```text
FRONTEND/
├── src/
│   ├── adapters/
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── .env
├── .env.example
└── package.json
```

## Estado atual do frontend

Já existe:

```text
Header
Toolbar
cards de métricas
painel de código
painel de resultados
abas:
- Resumo
- ESLint
- Contexto
- Comentários
```

Também existem seletores:

```text
environment:
node
react

mode:
static
llm
hybrid
```

O layout base já está implementado e não deve ser redesenhado do zero.

Preserve:

```text
tema escuro
tons azul/roxo
painéis divididos
editor à esquerda
resultados à direita
```

## Estado atual do desenvolvimento

Marcos concluídos:

- **Marco 12 — Fundação e layout do frontend**: concluído.
- **Marco 13 — Entrada de Código e Editor Funcional**: concluído.
- **Marco 14.1 — Comunicação real entre frontend e backend**: concluído.
- **Marco 14.2 — Adaptação e apresentação das respostas C1/C2/C3**: concluído.
- **Marco 15 — Refinamento de UX, consistência e robustez do frontend**: concluído.

O frontend já realiza `POST /api/reviews` por meio de `src/services/reviewService.js`,
com URL centralizada em `src/services/api.js` e configurada por `VITE_API_BASE_URL`.

A resposta bruta permanece em `analysisResult` no `ReviewPage`.
A camada `src/adapters/reviewAdapter.js` organiza as respostas C1/C2/C3
em um View Model para apresentação, sem modificar os dados científicos originais.

`MetricsBar` usa dados reais e apresenta estados de espera, carregamento, conclusão,
erro de API e falha de validação. `ResultsPanel` possui abas funcionais:
Resumo, ESLint, Contexto e Comentários.

C1, C2 e C3 continuam metodologicamente separados:
C1 apresenta apenas análise estática; C2 apresenta comentários do LLM sem ESLint,
contextos ou referências; C3 apresenta alertas, contextos recuperados e comentários,
com referências exibidas somente quando a validação do backend é válida.

Contextos repetidos são agrupados visualmente por `documentId`, preservando suas
associações com os alertas. A métrica usa `retrieval.totalContexts`, quando disponível.
Validação não comprova a qualidade técnica dos comentários.

O `ReviewPage` compara os campos atuais `code`, `filename`, `environment` e `mode`
com a cópia enviada na análise que produziu o resultado. Entradas diferentes marcam
o resultado e as métricas como desatualizados, preservando o cenário da resposta.
Durante uma requisição, os controles de entrada ficam bloqueados, o editor fica
somente leitura e uma trava local impede envios simultâneos.

Erros de comunicação, HTTP e leitura da resposta são diferenciados no serviço do
frontend, preservando status HTTP e mensagem da API quando disponíveis.
Esses metadados de apresentação não alteram o contrato do backend.

O próximo marco ainda não foi definido como concluído.
Não avançar automaticamente para outro marco.

## Payload para o backend

```json
{
  "code": "...",
  "filename": "snippet.js",
  "environment": "node",
  "mode": "hybrid"
}
```

Para C3 poderá ser enviado:

```json
{
  "maxContexts": 3
}
```

## Convenções React

Preferir componentes pequenos e com responsabilidade clara.

Evitar concentrar tudo em `App.jsx` e `ReviewPage.jsx`.

Componentes reutilizáveis:

```text
src/components/
```

Chamadas ao backend:

```text
src/services/
```

Adaptação de respostas C1/C2/C3:

```text
src/adapters/
```

Constantes:

```text
src/constants/
```

## CSS

Continuar utilizando:

```text
src/styles/global.css
src/styles/review-page.css
```

Usar as variáveis CSS existentes antes de criar valores repetidos.

Preservar responsividade existente.

Não reescrever toda a folha de estilos quando uma alteração localizada for suficiente.

---

# Metodologia de desenvolvimento

O projeto está sendo desenvolvido em marcos.

Para cada tarefa:

```text
1. identificar o marco atual
2. alterar apenas o necessário
3. executar/testar
4. informar resultado
5. apontar arquivos modificados
6. listar pendências
```

Não avançar automaticamente para outro marco.

---

# Testes e validação

Backend:

```bash
cd BACKEND
npm test
```

Quando adequado:

```bash
npm run dev
```

Frontend:

```bash
cd FRONTEND
npm run build
npm run lint
```

Não considerar uma alteração concluída se houver erro de build ou lint causado pelas mudanças.

Se testes existentes falharem, investigar antes de modificar testes para fazê-los passar.

---

# Git

Não apagar histórico.

Não fazer force push.

Não fazer merge automaticamente.

Não criar commits ou branches sem solicitação explícita.

Ao finalizar uma tarefa, sugerir uma mensagem de commit em português.

Formato recomendado:

```text
feat: ...
fix: ...
refactor: ...
test: ...
docs: ...
```

---

# Restrições importantes

Não:

- modificar os cenários experimentais sem necessidade;
- misturar evidências de C3 no C2;
- inventar resultados de teste;
- inventar arquivos ou rotas;
- alterar a base de conhecimento sem solicitação;
- adicionar dependências desnecessárias;
- refatorar módulos estáveis apenas por preferência estética;
- remover endpoints técnicos existentes;
- armazenar segredos no repositório.

---

# Definição de tarefa concluída

Uma tarefa só deve ser considerada pronta quando:

```text
- código implementado
- build/lint correspondente executado quando aplicável
- funcionalidade anterior preservada
- nenhuma mudança fora do escopo introduzida
- arquivos modificados informados
- resultado resumido
- pendências identificadas
```
