# Marco 16 — Exportação dos resultados da revisão

## Objetivo

Disponibilizar JSON estruturado e Markdown legível de uma análise já executada, preservando o snapshot analisado e a resposta original da API.

---

## Motivação

A exportação permite guardar resultados e inspecionar execuções sem confundir a entrada atual do editor com os dados que produziram o resultado. A resposta bruta continua sendo a fonte canônica para processamento posterior.

---

## Escopo

- JSON com envelope versionado e resposta integral do backend.
- Markdown com seções conforme C1/C2/C3.
- Ações secundárias no painel de resultados, feedback temporário e erro independente.
- Nomes de arquivo seguros e download com APIs nativas.
- Nenhuma dependência, alteração de backend, PDF, persistência ou recurso de marco posterior.

---

## Arquitetura da exportação

```text
ReviewPage
  analysisResult + analyzedInput + isResultStale
        ↓
ExportActions
        ↓
exportService
  ├── buildReviewExportJson
  ├── buildReviewMarkdown → reviewAdapter (somente apresentação)
  └── exportReviewAsJson / exportReviewAsMarkdown
        ↓
Blob → object URL → link de download → remoção e revogação
```

O serviço não executa código ou conteúdo retornado pelo modelo. Os builders não modificam os objetos recebidos. O adapter e o serviço HTTP existentes foram preservados.

---

## Formato JSON

```json
{
  "exportVersion": "1.0",
  "exportedAt": "2026-10-16T04:30:00.000Z",
  "application": "CodeReview AI",
  "stale": false,
  "input": {
    "code": "console.log('exemplo');",
    "filename": "snippet.js",
    "environment": "node",
    "mode": "static"
  },
  "result": {}
}
```

Exemplo conceitual do envelope: em uma exportação real, `result` contém integralmente a resposta de `POST /api/reviews`. Nenhum campo científico é removido, renomeado ou recalculado dentro de `result`.

`exportedAt` é o instante da exportação em ISO 8601 UTC. Não substitui `generation.generatedAt` nem outro timestamp original.

---

## Snapshot e resultados desatualizados

`input` é uma cópia de `analyzedInput`, com código, arquivo, ambiente e modo efetivamente enviados. `scenario` permanece no resultado real da API.

Quando as entradas atuais diferem da última análise, a exportação continua disponível como **Exportar última análise**. O JSON registra:

```json
{
  "stale": true,
  "staleReason": "inputs_changed_after_analysis"
}
```

O Markdown registra `stale: true` e explica que as entradas da interface foram modificadas. O código atual do editor não substitui o código analisado.

---

## Formato Markdown

O relatório inclui informações da análise, snapshot do código e resumo. Conforme o cenário, acrescenta:

| Cenário | Seções e distinções |
|---|---|
| C1 | Alertas ESLint; explica que não usa recuperação de contexto nem LLM |
| C2 | Comentários, geração e validação; explica ausência de ESLint e RAG |
| C3 | Alertas, contextos, comentários, geração e validação disponíveis |

Categorias nulas aparecem como `Sem categoria`. Linhas nulas são omitidas. Referências vazias aparecem como `Referências: nenhuma`. Dados da geração são preservados em bloco JSON; erros e estágio de validação são apresentados quando disponíveis.

No C3 sem alertas, o texto informa que a geração foi dispensada, sem tratar o caso como erro. Contextos são agrupados pelo identificador real conforme o adapter, mantendo score, motivo e associações com alertas. O total do resumo conta ocorrências recuperadas, e o score é descrito como correspondência por metadados.

Se a validação falhar, o relatório avisa que os comentários e referências retornados não devem ser tratados como validados. A validação estrutural/semântica não representa avaliação qualitativa da correção técnica.

Blocos de código usam delimitadores maiores que qualquer sequência de crases contida no texto. O snapshot não é alterado; arquivos `.jsx` usam linguagem `jsx`, demais arquivos usam `javascript`. Outros valores textuais são escapados ou apresentados em blocos literais.

---

## Download, controles e feedback

Os botões Exportar JSON e Exportar Markdown ficam no topo do painel de resultados e são desabilitados sem resposta/snapshot ou durante loading. Resultados com falha de validação ainda podem ser exportados para inspeção, preservando a falha.

O download utiliza `Blob`, `URL.createObjectURL()` e um link temporário. O link é removido em `finally`; a object URL é revogada após um segundo para permitir o início da transferência.

O feedback informa `Download JSON iniciado.` ou `Download Markdown iniciado.` e desaparece após cinco segundos. Exceções síncronas de geração/download recebem uma mensagem amigável, sem apagar a análise ou alterar seu status. O navegador pode impedir a gravação sem produzir uma exceção capturável; o feedback indica apenas o início, não confirma arquivo salvo.

Os nomes incluem aplicação, cenário, arquivo sanitizado e momento da exportação. O trecho derivado do arquivo é limitado a 60 caracteres e usa caracteres seguros para Windows.

---

## Arquivos criados e modificados

Criados:

```text
FRONTEND/src/services/exportService.js
FRONTEND/src/components/ExportActions.jsx
BACKEND/docs/marcos_dev/marco-16-exportacao-resultados.md
docs/relatorios_execucao/marco-16-relatorio-execucao.md
```

Modificados:

```text
FRONTEND/src/pages/ReviewPage.jsx
FRONTEND/src/components/ResultsPanel.jsx
FRONTEND/src/styles/review-page.css
AGENTS.md
```

---

## Testes realizados e resultados

Foram feitas requisições reais para C1, C2, C3 e C3 sem alertas. A geração dos conteúdos JSON/Markdown foi verificada **em memória**, sem gravar relatórios por outro meio. C2 e C3 usaram Ollama/Llama e retornaram validação aprovada.

Verificações aprovadas com assertions temporárias:

- resposta bruta integral após serialização JSON;
- snapshot preservado, inclusive quando `stale: true`;
- imutabilidade de objetos congelados;
- timestamps de geração preservados;
- C1 sem geração/retrieval artificial e com `no-unused-vars`;
- C2 sem analysis/retrieval e com referências vazias;
- C3 com contexto recuperado e comentários reais;
- C3 sem alertas com geração dispensada;
- delimitadores Markdown com crases internas e linguagem JSX;
- filename com espaços e caracteres especiais sanitizado;
- validação inválida, categoria nula e linha nula;
- remoção de link e revogação de URL com DOM/URL simulados, em sucesso e falha.

No navegador, verificaram-se C1, botões inicialmente desabilitados e posteriormente habilitados, identificação de última análise desatualizada e desabilitação dos dois formatos durante C2.

```bash
cd FRONTEND
npm run build
npm run lint
git diff --check
```

Build e lint passaram. Não foi criada suíte persistente, pois o frontend não possui infraestrutura de testes configurada; nenhuma dependência foi adicionada.

---

## Histórico da limitação no navegador automatizado

Durante a execução do Codex, o teste de recebimento dos downloads reais foi bloqueado pelo navegador automatizado, que informou recusa de autorização para baixar arquivos da origem local. Nenhum caminho alternativo de download foi utilizado. Naquela etapa, o fluxo de transferência só foi verificado com APIs simuladas em memória.

Naquela etapa, ficaram pendentes os downloads reais JSON/Markdown de C1, C2, C3, C3 sem alertas e de resultado desatualizado, assim como a inspeção dos arquivos efetivamente recebidos. O feedback e o tratamento visual de erro de exportação não foram validados de ponta a ponta pelo Codex com download autorizado. A confirmação manual posterior do usuário está registrada abaixo, sem atribuir ao Codex downloads que ele não realizou.

### Nova tentativa de fechamento — 16/10/2026

Após autorização explícita do usuário para executar os dez downloads reais, C1 foi novamente executado no navegador e retornou uma issue, uma categoria e zero contextos. Ao tentar obter o JSON pelo botão de exportação, o controle de downloads voltou a informar recusa de permissão para `http://127.0.0.1:5174`.

Não foi fornecido caminho de arquivo pelo navegador automatizado, e nenhum arquivo efetivamente recebido pôde ser confirmado ou inspecionado pelo Codex naquela tentativa. Os demais downloads não foram tentados após essa nova recusa; não houve tentativa por caminho alternativo. O teste stale em arquivos reais permaneceu pendente naquela ocasião. A implementação foi preservada, pois não foi demonstrado defeito no código.

---

## Validação manual confirmada pelo usuário — 16/10/2026

O usuário informou que validou o Marco 16 no navegador real, fora do navegador automatizado do Codex, e confirmou expressamente todos os cinco pares de exportação:

| Caso | JSON | Markdown | Responsável pela confirmação |
|---|---|---|---|
| C1 | Aprovado | Aprovado | Usuário, manualmente |
| C2 | Aprovado | Aprovado | Usuário, manualmente |
| C3 | Aprovado | Aprovado | Usuário, manualmente |
| C3 sem alertas | Aprovado | Aprovado | Usuário, manualmente |
| Resultado desatualizado | Aprovado | Aprovado | Usuário, manualmente |

Para o caso stale, o usuário confirmou os quatro critérios:

- `stale = true`;
- `input` corresponde ao snapshot da última análise executada;
- o código atual do editor não substitui o snapshot analisado;
- `scenario` permanece o da resposta original.

A limitação anterior era específica do navegador automatizado utilizado durante a execução do Codex e não representava defeito demonstrado na implementação. Nenhum nome de arquivo, caminho local ou outro teste não informado pelo usuário foi acrescentado como evidência.

Não houve alteração na implementação para este fechamento. A validação manual foi registrada por confirmação do usuário, sem repetição ou inspeção independente desses downloads pelo Codex.

---

## Critério de conclusão e situação do marco

**Concluído.**

Os checks técnicos anteriormente executados permanecem registrados. A validação final dos cinco pares JSON/Markdown e dos quatro critérios stale foi confirmada manualmente pelo usuário, encerrando a pendência dos downloads reais. O AGENTS.md preserva o histórico e registra o Marco 16 como concluído. Não há pendência de fechamento do Marco 16 entre os testes solicitados e confirmados.

Nenhum commit, merge ou avanço para marco posterior foi realizado.
