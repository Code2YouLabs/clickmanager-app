# Comercial da Gráfica — migração #87

Base: épico #79, auditoria #85 e fundação #86. A #86 foi preservada no commit local `4cf65d5` da branch `feature/86-consolidar-componentes-base`; a branch `feature/87-padronizar-comercial-grafica` parte desse commit. Não houve push nem criação de PR.

Status: implementação técnica concluída; validação visual manual a cargo do usuário.

Escopo: exclusivamente Comercial da Gráfica. `pages/pedido`, `pages/orcamentos`, Depósito, cálculo de preços e regras de workflow permanecem intactos. SmartCalc mantém a implementação; apenas seu destino de navegação após criar rascunho foi atualizado.

## Estrutura final

`src/app/pages/grafica/comercial/` contém:

- `comercial-list.component.{ts,html,scss,spec.ts}`: composição de listagem dos três tipos.
- `comercial-editor.component.{ts,html,scss,spec.ts}`: editor contextual existente, sem reescrita de domínio.
- `comercial.models.ts`: tipo compartilhado e configuração de apresentação da listagem por entidade.
- `comercial-editor-shell.spec.ts` e `comercial.routes.spec.ts`: integração do formulário/footer e rotas.
- `grafica-produto-wizard-dialog.component.{html,scss}` e `grafica-servico-wizard-dialog.component.{html,scss}`: templates/estilos extraídos; classes e cálculos continuam no arquivo do editor.
- `grafica-produto-busca-rapida-dialog.component.{ts,spec.ts}`.
- `pedido-documentos-acoes.component.ts`.
- `pedido-comercial-impressao-page.component.ts` e `orcamento-comercial-impressao-page.component.ts`.
- `pedido-comercial-whatsapp-page.component.ts` e `orcamento-comercial-whatsapp-page.component.ts`.
- `pedido-comercial-whatsapp.util.{ts,spec.ts}`.

Os 12 arquivos antes localizados em `grafica/comercial-beta/` foram movidos, sem manter outra implementação. `comercial-beta-list.component.ts`, `comercial-beta-editor.component.ts` e `comercial-beta-editor.component.spec.ts` foram renomeados; os outros nove mantêm seus nomes na pasta definitiva. As classes/selectors/tipos usam `ComercialListComponent`, `ComercialEditorComponent`, `ComercialTipo` e `app-grafica-comercial-*`.

## Rotas e menu

Para cada tipo (`pedidos`, `orcamentos`, `rascunhos`):

- `/page/grafica/comercial/<tipo>`
- `/page/grafica/comercial/<tipo>/novo`
- `/page/grafica/comercial/<tipo>/:id`

Documentos:

- `/page/grafica/comercial/pedidos/:id/impressao`
- `/page/grafica/comercial/pedidos/:id/impressao/duas-vias`
- `/page/grafica/comercial/pedidos/:id/impressao/etiqueta`
- `/page/grafica/comercial/pedidos/:id/whatsapp`
- `/page/grafica/comercial/orcamentos/:id/impressao`
- `/page/grafica/comercial/orcamentos/:id/whatsapp`

Os 15 caminhos antigos têm apenas redirects temporários `pathMatch: 'full'` para os destinos equivalentes. A decisão preserva bookmarks e links externos de um fluxo já exposto pelo app. Guards, featureKey, segmento e permissões das rotas de destino foram preservados. Testes de navegação real confirmam preservação do ID, sufixo de impressão e query de status.

Menu Comercial: **Pedidos → Orçamentos → Rascunhos → SmartCalc**. Rascunhos usa `file-pencil`, somente Gráfica e `GRAFICA_PRODUTOS_VER`, a mesma permissão da rota anterior. Não foi alterado o filtro do sidebar nem ampliado acesso. FeatureKeys existentes permanecem, incluindo SmartCalc. Dashboard, status-grid e navegação do Full apontam para os destinos definitivos.

## Fundação e domínio

Listagens usam PageCard/CardHeader, DataTable, ListFilterBar/InputPesquisa pela composição da tabela, filtros tipados, paginação e estados da #86. Ações principais e títulos distinguem as três entidades. Filtro de status oferece somente valores aceitos pelo tipo correspondente. A feature continua proprietária dos dados, chamadas HTTP e paginação.

Erro deixa de apagar dados/totais. Loading inicial, refreshing, erro/retry, 403, vazio real e vazio filtrado são distintos. Requisições de listagem anteriores são canceladas quando uma nova consulta é iniciada; a troca de entidade limpa os dados anteriores. O detalhe também distingue carregamento/erro/sem permissão e não apresenta um formulário vazio como se fosse criação.

O editor preserva ClienteSelectorCard, ItensPedidoSection, ObservacoesCard, PedidoFluxoControles, PedidoDocumentosAcoes e os configuradores. PageCard e SectionCard continuam estruturando o conteúdo; ações finais passam ao contrato `footerActions` da #86. Resumo e pagamentos locais permanecem na feature: seus contratos de recebimentos e ajustes são específicos do Comercial da Gráfica; não foram substituídos pelos componentes do fluxo legado apenas por semelhança de nome.

Salvar pedido/orçamento usa `type="submit"`, associado por `form="comercial-editor-form"`; somente o submit chama o handler. Converter rascunho permanece comando específico. Saving bloqueia ações e os handlers protegem requisições repetidas. FormGroups de pagamentos e ajustes deixam de ser forms aninhados; seus botões mantêm handlers explícitos. Enter em inputs dessas seções não dispara o salvamento principal, e a ativação dos botões por teclado continua disponível.

### Diferenças preservadas

| Contexto | Comportamento preservado |
|---|---|
| Rascunho | Atendimento em composição, criação pelos handlers existentes/SmartCalc, consulta dos itens e conversão para pedido ou orçamento; nenhuma unificação de entidade |
| Orçamento | Proposta formal, validade, ajustes/observações quando editável, envio/aprovação/recusa/cancelamento, conversão para pedido, PDF e WhatsApp |
| Pedido | Cliente obrigatório, recebimentos, saldo, ajustes, workflow/permissões, impressão completa/duas vias/etiqueta e WhatsApp |

Não foi criado endpoint de atualização de rascunho: o contrato atual consultado oferece criar, buscar, listar, converter e descartar. Os limites de persistência já existentes do editor foram preservados. Quantidades, snapshot comercial, precificação, desconto, acréscimos, frete e totais não foram recalculados por uma nova regra.

## Busca: contrato real e limitação explícita

Foram inspecionados `PedidoCoreController`, `OrcamentoController` e `RascunhoComercialController` no backend local. As listagens aceitam Pageable e status; Orçamento também possui origem/período. Nenhuma dessas três listagens oferece parâmetro de busca textual por referência/cliente/status.

Antes, a busca recarregava a primeira página e filtrava somente os registros retornados, mantendo o total global. Não era busca global. Agora a interface diz **Buscar nesta página**, informa a limitação e filtra os dados já carregados. Digitar não reseta a página nem faz requisição HTTP desnecessária. Ao paginar, a busca continua aplicada à nova página; total e índices permanecem os fornecidos pelo servidor. Apagar a busca restaura a página carregada. O status consulta o servidor, fica sincronizado com a URL e reinicia a paginação.

Busca textual global exige evolução futura do contrato da API; não foi simulada baixando todas as páginas nem implementada no backend nesta issue. Para Rascunhos, o serviço passou a encaminhar o parâmetro opcional de status que o backend já aceitava, preservando os defaults dos consumidores existentes.

## Ocorrências remanescentes de beta

Busca global por `comercial-beta`, `ComercialBeta` e `app-grafica-comercial-beta`:

- `pages.routes.ts`: 15 ocorrências, exclusivamente origens de redirects.
- `grafica.service.ts`: oito ocorrências em endpoints HTTP. `GraficaComercialController` ainda publica `/api/grafica/comercial-beta` para composição/criação. Renomeá-los só no frontend quebraria o contrato; preservados até migração coordenada de backend.
- `comercial.routes.spec.ts`: seis ocorrências que verificam redirects/compatibilidade, sem imports de implementação antiga.
- `docs/frontend-screen-pattern-audit.md`: inventário histórico da #85, preservado como evidência do estado auditado.
- Este documento: descrição explícita da migração e das exceções.

Não restam pasta, classe, selector, import ou link de navegação interno da implementação antiga. Outros usos não relacionados da palavra “beta”, se existentes, não pertencem a esta migração.

## Validação

Aplicada a [skill anthropics/frontend-design](https://www.ui-skills.com/skills/anthropics/frontend-design), mantendo identidade, tipografia, paleta e componentes do ERP. Plano: evolução mínima dos contratos existentes; construção: migração real e composição compartilhada; revisão: testes, compilação e inspeção de diferenças. A validação visual autenticada será realizada manualmente pelo usuário, conforme instrução de 25/09/2026; não foi executada nem declarada aprovada pelo agente, e não há screenshots posteriores nesta entrega.

Baseline pós-#86: 378 testes, 371 passando e sete falhas conhecidas de `GraficaProdutoFormComponent` (`categoriaService.listarTodas is not a function`).

- Build final: `npm run build` — **exit 0**, aplicação de produção gerada em `dist/clickmanager-app`. [Log](validation/issue-87/build.log).
- Suíte completa final: `npm test -- --watch=false --browsers=ChromeHeadless` — **402 executados, 395 passaram, sete falharam**, exit 1 exclusivamente pelas mesmas sete falhas conhecidas. Os nomes foram comparados automaticamente com o [log da #86](validation/issue-86/full-tests.log). **Novas falhas: 0**. [Log completo](validation/issue-87/full-tests.log).
- Focados: mesmo runner, com `--include` para `grafica/comercial/**/*.spec.ts`, `sidebar-menu.spec.ts` e `grafica.service.spec.ts` — **66/66 passaram**, exit 0. [Log focado](validation/issue-87/focused-tests.log).
- `git diff --check`: passou.
- Comparação textual confirmou os guards/dados das rotas preservados e os templates/estilos dos dois wizards extraídos sem alterações de conteúdo.
- Verificação de escopo: nenhuma alteração em `pages/pedido`, `pages/orcamentos`, `pages/deposito` ou componentes base da #86.

Cobertura adicionada: contexto dos três tipos, título/subtítulo, novo/abrir, filtros/URL, busca local explícita, paginação, estados/retry, retenção de dados, cancelamento de resposta obsoleta, menu/permissões/segmento, rotas canônicas, redirects reais, documentos/WhatsApp, conversão com proteção de submissão repetida e HTML real do editor com submit único.

A primeira execução de novos testes de listagem revelou ausência de registro do locale pt-BR no TestBed; o setup foi corrigido sem mudar a aplicação. Os testes do shell isolam corretamente o lifecycle no prototype antes da criação da view. A asserção de teclado identificou que uma expressão Angular retornando `false` cancelava Enter em botões; o handler foi corrigido para retornar void e impedir submit apenas em inputs dessas seções. Uma execução posterior do ChromeHeadless desconectou por timeout sem resultado conclusivo e foi repetida; esse resultado não foi contado como aprovação.

## Continuidade mobile

Nenhum redesign mobile ou componente desktop/mobile duplicado foi criado. A listagem continua com tabela/overflow e pode adotar futuramente `appDataTableItem`. A composição do editor mantém seus breakpoints; footer usa a responsividade compartilhada da #86. A futura iniciativa deve revisar densidade da tabela, acesso ao resumo/ações em telas estreitas e apresentação dos itens; cálculos e workflow devem continuar na feature.
