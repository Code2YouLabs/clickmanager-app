# DataTable progressivo mobile e piloto Pedidos

## Auditoria e responsabilidades

DataTable recebe `data` e `pagination` (`pageIndex`, `pageSize`, `totalItems`, opções), renderiza a coleção e emite `pageChange: PageEvent`. As páginas consumidoras fazem as consultas. `appDataTableItem` continua fornecendo a apresentação por item, ações e expansão. A API de Pedidos permanece `listarPedidosComerciais(page, size, status)`, sem busca textual, novo endpoint, mudança de ordenação ou alteração dos limites. O lote do piloto continua em 10 registros por padrão, preservando um tamanho selecionado anteriormente no desktop.

**A página acumula e reinicia.** A única coleção é `ComercialListComponent.itens`; `itensFiltrados` é uma projeção para pesquisa local, não um segundo armazenamento. DataTable não copia resultados, não acumula páginas e não conhece serviços do Comercial. Outros consumidores de DataTable permanecem paginados porque a adoção é opt-in. Orçamentos, Rascunhos, Clientes e Produtos não foram migrados.

## Contrato compartilhado

| Entrada / evento | Contrato |
|---|---|
| `mobileLoadMode` | `paged` por padrão; `progressive` ativa somente no mobile, até 760 px. |
| `pagination` | Continua representando **a última página confirmada**, tamanho e total da API. Não avançar ao iniciar a requisição. |
| `progressiveState` | `{ loadedCount, loading?, error?, restartRequired? }`; quantidade bruta acumulada, inclusive quando a pesquisa local esconde itens. |
| `loadMoreLabel` / `itemsLabel` | Rótulos configuráveis, padrão “Carregar mais” / “registros”. Piloto: “Carregar mais pedidos” / “pedidos”. |
| `pageChange` | Mesmo `PageEvent`, com índice atual + 1 e mesmo tamanho. Consumidor busca e acrescenta ao confirmar sucesso. |
| `retry` | Usado pelo retry inicial/refresh existente e por **Atualizar lista**, quando o consumidor exige reinício. |
| `search.mobileHint` | Aviso opcional só no mobile, para esclarecer o alcance da pesquisa sem alterar sua consulta. |

Exemplo de integração equivalente ao piloto:

```html
<app-data-table mobileLoadMode="progressive"
  [data]="visibleItems" [pagination]="pagination"
  [progressiveState]="{ loadedCount: items.length, loading: loadingMore,
    error: loadMoreError, restartRequired: restartRequired }"
  loadMoreLabel="Carregar mais pedidos" itemsLabel="pedidos"
  (pageChange)="onPage($event)" (retry)="reloadFirstPage()">
</app-data-table>
```

`loadNextBatch()` é a entrada pública protegida contra duplicação, loading, erro global, fim, desktop, conteúdo oculto e 403. Um observador futuro poderá chamar essa mesma entrada. **Não foi implementado IntersectionObserver nem carregamento automático.** A trava local guarda apenas a página solicitada, não outra paginação; é liberada ao confirmar o índice, ao receber erro, reiniciar filtros/coleção ou sair do modo mobile. O consumidor também bloqueia consultas concorrentes.

## Estados e consistência

- Primeiro lote usa o loading inicial compartilhado. Um refresh mantém dados existentes até chegar a resposta; o sucesso da primeira página substitui a coleção.
- Carregar mais solicita a próxima página real, mantém registros/ações/expansões visíveis e mostra spinner no botão desabilitado. O índice é confirmado somente no sucesso. Não há scroll programático, navegação de rota ou recriação dos itens anteriores; objetos antigos e `trackBy` são preservados.
- O rodapé informa **Carregados X de Y pedidos**. A quantidade usa `itens.length`, não a quantidade de resultados da busca local. No último lote o botão desaparece. Coleção realmente vazia não recebe resumo, paginação nem Carregar mais.
- Falha adicional mostra aviso local e **Tentar novamente**, pedindo a mesma próxima página. Não muda o índice nem remove registros. HTTP 403 bloqueia a apresentação e remove os dados mobile; não é tratado como vazio comum.
- A primeira página verifica identidade e duplicação: conserva os únicos na ordem recebida e, se houver inconsistência, informa o problema e bloqueia avanço até atualização explícita. Não há descarte silencioso de duplicações.
- Antes de acrescentar, o piloto verifica total, índice retornado, quantidade esperada, completude das páginas anteriores e IDs únicos (entre lotes e dentro do lote). Se total/posição/identidade mudaram, **não concatena**: mantém a coleção aceita e oferece **Atualizar lista** para consultar a primeira página novamente. O total exibido permanece o do conjunto aceito até a atualização.
- Filtro remoto diferente esvazia a coleção, cancela o request anterior e inicia página zero com o novo status. Uma versão de consulta impede reaproveitar respostas obsoletas. Destroy e troca de viewport também cancelam a consulta em voo.

A pesquisa textual continua exclusivamente local, agora sobre todos os pedidos carregados. Ela não dispara consultas, não zera a coleção nem carrega páginas por conta própria. O aviso e o placeholder dizem “pedidos carregados”. Uma busca sem resultado mantém Carregar mais disponível se houver lotes restantes; sua mensagem distingue ausência local de ausência na base. Um status remoto sem registros tem mensagem própria. Painel lateral e seus estados de rascunho permanecem iguais.

## Viewport e desktop

Ao alternar Lista entre mobile e desktop, Pedidos reinicia na página zero, mantendo busca, status e tamanho de lote. O desktop recebe apenas uma página, com MatPaginator e eventos anteriores. Retornar ao mobile reconstrói o primeiro lote; notificações repetidas da mesma viewport não fazem nova consulta. A restauração anterior do modo Kanban/ampliação desktop é preservada. Não houve mudança em drag-and-drop, movimentação de status, permissões ou regras de transição.

## Cards e financeiro

Somente os estilos de `.pedido-mobile-item` mudaram: cabeçalho flexível permite que o status quebre para outra linha sem comprimir a referência, que continua completa. Cliente quebra nomes longos; data tem menor peso; valor recebe destaque moderado e pode quebrar sem overflow. Ações Ver pedido/Financeiro conservam seus handlers e toque mínimo de 44 px, com menor espaçamento vertical.

Financeiro continua com responsável, total pago e saldo reais, pelas mesmas funções/fontes. A expansão usa linhas compactas com separadores, sem uma nova caixa dentro do item. Desktop e cards Kanban não receberam esses estilos.

## Reserva do FAB compartilhado

Antes, PageCard subtraía `--mobile-safe-bottom-space` do ancestral para calcular padding externo. Essa conta podia zerar a reserva do card mesmo que o conteúdo utilizasse outra superfície de rolagem. Agora há um elemento de fluxo **no fim do próprio PageCard, depois de conteúdo e footer**, condicionado à mesma ação mobile e permissão do FAB.

`--mobile-page-fab-size` (56 px) e `--mobile-page-fab-gap` (16 px) são compartilhados pelo posicionamento do FAB e pela reserva (tamanho + dois espaçamentos). O FAB permanece acima de `--mobile-bottom-nav-height`, que já considera safe area, com fallback equivalente e um mínimo explícito de safe area mesmo quando não existe navegação inferior. Não se desconta padding de outro contêiner. Isso permite rolar o último registro, footer progressivo, erro/retry e ações até uma posição acima do botão. A reserva não aparece no desktop, sem ação autorizada ou no modo legacy. Nenhum padding específico foi colocado em Pedidos e nenhum arquivo do shell/navegação foi alterado.

## Limitações e validação manual

- A API utiliza paginação por offset, sem revisão de snapshot. Total, sobreposição e lacunas observáveis são detectados; mudanças concorrentes com mesmo total e sem sobreposição entre os lotes podem não ser detectáveis sem suporte do backend. Não se promete uma visão transacional da base.
- O roteador usa `scrollPositionRestoration: 'enabled'`, mas não há RouteReuseStrategy/cache da coleção. Ao sair para um pedido e voltar, a página é recriada e busca o primeiro lote: a posição nativa pode não ser recuperável se dependia dos lotes antigos. Não foi adicionado armazenamento global complexo.
- O FAB fixo pode atravessar visualmente conteúdo durante a rolagem; a reserva garante que os controles finais possam ser rolados para uma área acessível. Não é uma faixa permanentemente vazia em toda a viewport.
- Não foram executados testes visuais nem screenshots. Validar manualmente 360/390/430 px, paisagem, nomes/valores longos, safe areas, final da lista, posição real ao acrescentar e retorno do detalhe.

## Arquivos

Relativos a `src/app/`:

- `components/data-table/data-table.component.{ts,html,scss,spec.ts}` e `data-table.models.ts`: contrato, rodapé progressivo, estados e testes.
- `components/list-filter-bar/list-filter-bar.component.{html,scss}`: texto opcional do alcance da busca, só mobile.
- `pages/grafica/comercial/comercial-list.component.{ts,html,spec.ts}`: acumulação, reinício, consistência, mensagens, viewport e testes do piloto.
- `pages/grafica/comercial/comercial-list.component.scss`: hierarquia dos cards e financeiro mobile.
- `components/page-card/page-card.component.{html,scss,spec.ts}`: reserva estrutural e testes.
- `components/mobile-fab-action/mobile-fab-action.component.scss`: geometria compartilhada.
- Este relatório e referências nos relatórios anteriores da fundação.

Sem alterações em APIs, serviços, dependências, shell, Dashboard, SmartCalc, onboarding ou regras financeiras.

## Testes

Cobertura direcionada: primeiro lote, próximos lotes, última página, vazio, filtro/busca, concorrência, loading adicional, erro/retry, 403, IDs repetidos, total/índice/quantidade alterados, resposta obsoleta, viewport, identidade e expansão do primeiro item após append, valores grandes/referências longas, Ver pedido, tutorial e estrutura/permissão do FAB. Os testes existentes de desktop e Kanban permanecem ativos.

```sh
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/components/data-table/data-table.component.spec.ts' --include='src/app/components/page-card/*.spec.ts' --include='src/app/components/mobile-fab-action/*.spec.ts' --include='src/app/pages/grafica/comercial/comercial-list.component.spec.ts' --include='src/app/pages/grafica/comercial/comercial-beta-list.component.spec.ts'
npm test -- --watch=false --browsers=ChromeHeadless
npm run build:prod
```

Resultados: rodada direcionada intermediária **118/118 aprovada**; suíte completa final **1.117/1.117 aprovada** (exit 0), incluindo os casos finais de referências/valores longos e lacuna entre lotes. A falha conhecida do onboarding em 360 px não se reproduziu nesta execução e não foi corrigida como parte desta tarefa. Build de produção final: **exit 0**, 38 avisos existentes, nenhum erro. O CSS final de safe area e de quebra da referência foi recompilado após os testes, sem alterações posteriores na lógica.
