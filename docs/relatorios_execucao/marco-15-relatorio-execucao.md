# Marco 15 — Relatório de execução

## Data e contexto

16/10/2026, fuso America/Sao_Paulo. Refinamento do frontend após os Marcos 12, 13, 14.1 e 14.2. O repositório estava sem alterações locais no início desta tarefa.

Não existia diretório de relatórios de execução. Foi utilizado o caminho solicitado `docs/relatorios_execucao/`. A documentação do marco foi criada em `BACKEND/docs/marcos_dev/`, seguindo a localização dos documentos anteriores.

## Objetivo

Evitar resultados antigos com aparência de atuais, melhorar loading, erros, estados vazios, controles, responsividade e acessibilidade básica, preservando backend e separação metodológica.

## Arquivos criados

- `BACKEND/docs/marcos_dev/marco-15-refinamento-ux-frontend.md`
- `docs/relatorios_execucao/marco-15-relatorio-execucao.md`

## Arquivos modificados

- `AGENTS.md`
- `FRONTEND/index.html`
- `FRONTEND/src/pages/ReviewPage.jsx`
- `FRONTEND/src/services/reviewService.js`
- `FRONTEND/src/components/CodeEditor.jsx`
- `FRONTEND/src/components/CodePanel.jsx`
- `FRONTEND/src/components/MetricsBar.jsx`
- `FRONTEND/src/components/ResultsPanel.jsx`
- `FRONTEND/src/components/ReviewSummary.jsx`
- `FRONTEND/src/components/ReviewToolbar.jsx`
- `FRONTEND/src/styles/global.css`
- `FRONTEND/src/styles/review-page.css`

## Alterações realizadas

- Cópia local das entradas enviadas na análise bem-sucedida e comparação dos quatro campos em `ReviewPage`.
- Aviso, métricas e resumo de resultado desatualizado, com identificação permanente da resposta nas abas.
- Trava síncrona contra envios simultâneos, controles desabilitados e Monaco somente leitura durante análise.
- Indicador de processamento e explicação sobre a demora do modelo local.
- Erros tipados de comunicação, HTTP e leitura de JSON; status e mensagem da API preservados internamente.
- Mensagens específicas para código vazio e erro inesperado.
- Estados vazios de comentários e contextos mais explícitos, mantendo as mensagens metodológicas.
- Rolagem interna no desktop e disposição móvel dos controles.
- Foco visível, navegação das abas por teclado, idioma do HTML e respeito a movimento reduzido.
- AGENTS.md atualizado com os marcos concluídos e decisões locais de apresentação.

## Comandos e ferramentas utilizados

Inspeção com `Get-Content`, `Get-ChildItem`, `rg --files`, `git status --short`, `git diff --stat` e `git diff --check`. Leitura das instruções da raiz, componentes, adapter, serviço, estilos e documentação existente.

Na sessão, npm foi executado pelo caminho completo da instalação local e com o diretório do Node no PATH:

```powershell
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
& 'C:\Program Files\nodejs\npm.cmd' run build
& 'C:\Program Files\nodejs\npm.cmd' run lint
```

Diretório de execução: `FRONTEND`.

Também foram usados:

- `curl.exe` para verificar frontend e health check locais;
- Node.js com script em memória e Vite SSR para simular fetch e verificar erros/payloads/renderização com assertions;
- navegador integrado para os testes manuais;
- uma instância temporária do Vite na porta 5176 com `VITE_API_BASE_URL=http://127.0.0.1:13999/api`, sem backend nessa porta, para verificar indisponibilidade da API. `.env` não foi modificado.

## Resultado do build

`npm run build`: aprovado, código de saída 0. Na execução final, 1893 módulos transformados e build concluído em 1,07 s.

## Resultado do lint

`npm run lint`: aprovado, código de saída 0, sem diagnósticos.

## Testes manuais e resultados observados

| Teste | Resultado observado |
|---|---|
| Estado inicial | Nenhuma análise executada; status Aguardando |
| C1 com variável não utilizada | Uma issue, categoria real, zero contextos e no-unused-vars |
| Editar linha no Monaco após C1 | Aviso de desatualização, métricas marcadas e status Desatualizado |
| Mudar modo/ambiente sem analisar | Cenário original preservado no painel; aviso de nova análise |
| Retornar às entradas analisadas | Status Concluída reaparece quando os dados voltam a coincidir |
| Upload de App.jsx após análise | Nome do arquivo atualizado no editor; resultado anterior marcado como desatualizado |
| Código vazio ou espaços | Código vazio, mensagem amigável e status Erro |
| C2 com Promise async | Loading, botão e entradas desabilitados; conclusão real com quatro comentários e validação aprovada |
| API indisponível | Falha de comunicação, status Erro e controles recuperados |
| C3 com greet sem alertas | Zero issues, status Concluída e explicação da geração dispensada |
| Tecla End nas abas | Aba Comentários selecionada com foco visível |
| Desktop 1440×900 | Documento com altura de 900 px; painel de comentários com scrollHeight 1182 px e clientHeight 508 px |
| Móvel 390×844 | Layout em uma coluna; seletores com largura aproximada de 157,5 px após ajuste; abas com rolagem horizontal |

As verificações em memória com respostas simuladas passaram para: HTTP 400 com mensagem da API, HTTP 503 sem JSON, HTTP 200 com JSON inválido, falha de rede com causa preservada, payloads static/llm/hybrid, métricas de espera/loading/erro/desatualização/validação e renderização de erro HTTP/loading.

## Erros encontrados e correções

- No móvel, a disposição anterior dos dois seletores e botão em uma linha estreitava os rótulos: botão movido para linha própria e campos com largura flexível mínima.
- O locator de textbox do Monaco não aceitou os comandos de edição da automação: o teste foi realizado pelo editor visível com entrada de teclado. Não houve alteração no Monaco para contornar o teste.
- O HTML declarava inglês para uma interface em português: alterado para `pt-BR`.
- A conectividade local do ambiente restrito exigiu execução autorizada fora do sandbox para verificar servidores e iniciar a instância isolada de teste.
- Nenhum erro de build ou lint foi encontrado nas execuções realizadas.

## Limitações

- Testes HTTP/JSON e alguns estados visuais foram simulados em memória e não representam resultados experimentais.
- O backend existente foi preservado; a indisponibilidade foi testada usando outra origem de API, sem parar o processo existente.
- C3 com geração não foi reexecutado neste marco. C2 real e C3 sem alertas foram exercitados.
- Sem suíte persistente de interface, cancelamento ou novo timeout de requisição.
- Validação aprovada não é avaliação qualitativa dos comentários.

## Pendências

Nenhuma pendência bloqueadora identificada no escopo do Marco 15. Não foram introduzidos recursos de marco posterior.

## Sugestão de commit

```text
feat: refinar UX e robustez do frontend no Marco 15
```

Nenhum commit ou merge realizado.
