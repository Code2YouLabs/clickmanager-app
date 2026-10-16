# Orçamentos e Rascunhos no DataTable mobile

## Base e rotas

Migração na branch `feature/mobile-fundacao-listagem-pedidos`, sobre `fa4dbca`. Permanecem os commits aprovados de PageCard, filtros, FAB, cards e carregamento progressivo de Pedidos. Baseline direcionado antes das alterações: **103 testes aprovados**.

`src/app/pages/pages.routes.ts` confirma `/page/grafica/comercial/orcamentos` e `/page/grafica/comercial/rascunhos`, ambas usando `ComercialListComponent`. Os aliases `/page/grafica/comercial-beta/orcamentos` e `/page/grafica/comercial-beta/rascunhos` redirecionam às rotas atuais. Guards e permissões não foram alterados.

## Apresentação e diferenças de domínio

As três listas usam **um único `appDataTableItem`**, reaproveitando os estilos aprovados de `.pedido-mobile-item`. A apresentação por item e o modo progressivo são ativados pelo DataTable somente no breakpoint existente de **760 px**. Não há novas páginas ou componentes de card.

| Tipo | Informações mobile | Ações |
|---|---|---|
| Orçamentos | Protocolo original, status, cliente, criação, total; validade apenas se `validoAte` vier na resposta. Fallback `totalEstimado` é identificado como “Estimado”. | Ver orçamento, abrindo o mesmo editor/detalhe. |
| Rascunhos | Referência real disponível ou `#id`, status se presente, cliente se informado e total “Em composição”. Data só aparece quando disponível; nenhum número/data é fabricado. | Ver rascunho, abrindo a mesma edição. |
| Pedidos | Composição aprovada, inclusive status abreviado, ações e expansão financeira. | Ver pedido e Financeiro, sem alteração. |

Ausência de cliente nas novas apresentações é informada como “Sem cliente informado”; ausência de valor aparece como travessão, sem simular total zero. A referência completa pode quebrar dentro de sua coluna. O status permanece em uma linha, com texto completo em `title` e `aria-label`.

A única ação de negócio da listagem existente é `abrir`. Não foram adicionadas ações de conversão ou edição direta. Esses fluxos continuam nos detalhes. Não se apresenta “Financeiro” nos novos cards: os contratos de resumo dessas entidades não fornecem recebimentos/saldo. O template de expansão e as tabelas desktop existentes permanecem iguais.

## Fundação e consultas

- **PageCard/CardHeader/FAB:** nenhum arquivo alterado. Mesmos `primaryAction`, handlers, filtros no cabeçalho, título e divisor. Criação mantém as rotas e os tutorial targets existentes.
- **Pesquisa e filtros:** InputPesquisa, debounce de 250 ms e painel lateral globais preservados. Cada tipo conserva suas próprias opções de status de `COMERCIAL_LISTA`. Aplicar/limpar mantém a navegação com `queryParamsHandling: 'merge'`. A busca continua local e informa que considera apenas os registros carregados; não há endpoint de busca nem consultas extras por digitação.
- **Progressivo:** `listarPagina` escolhe o serviço já existente por tipo. A mesma rotina de acumulação de Pedidos agora atende os três tipos, sem duplicar paginação. Total e índice são confirmados no sucesso; mantém objetos e nós anteriores, bloqueia cliques concorrentes, preserva dados em erro adicional e repete a mesma página no retry. Detecta IDs repetidos, lacunas e mudança de total/índice, exigindo atualização explícita quando necessário.
- **Reinício:** mudar status/tipo ou viewport cancela a consulta anterior e reinicia na página zero. Versão de consulta protege contra respostas obsoletas. A inicialização espera o tipo efetivo da rota para não fazer uma consulta antecipada de Rascunhos. Notificações repetidas da viewport não recarregam.
- **Estados:** loading inicial, atualização, erro/retry, 403 e rodapé progressivo são os mesmos do DataTable. Vazio, filtro remoto sem resultado e pesquisa local sem resultado recebem textos contextuais por tipo.

Única evolução global: `DataTableProgressiveState.contextKey?: string`. Uma fonte nova libera a trava pendente e limpa a expansão da coleção anterior, mesmo quando filtros, índice e quantidade são iguais. É opcional, genérica e não muda estilos, rótulos ou consultas dos consumidores existentes. Pedidos recebe chave constante; append e expansão continuam preservados. Sem alterar contratos de API/DTOs.

## Preservação e limitações

Não foram alterados PageCard, CardHeader, filtros globais, FAB, shell, navegação inferior, reserva de espaço, Kanban, serviços, backend ou regras comerciais. Desktop mantém colunas, ações, expansão, paginação por página, filtros e busca local na página atual.

Permanecem as limitações da fundação: busca local; API por offset sem snapshot transacional; retorno do detalhe recria o primeiro lote, sem cache dos lotes anteriores. Rascunhos não garantem número/data no DTO atual. Validação visual e de rolagem real fica com o responsável pelo projeto; não foram realizados testes visuais nem screenshots. A issue #153 permanece fora desta migração.

## Validação

Baseline: 103/103 testes direcionados aprovados. Migração: 121/121 testes direcionados aprovados, incluindo cards/dados, ações, FAB, filtros, busca, último lote, erro/retry, 403, reinício, troca de fonte e preservação desktop/Pedidos.

Suíte completa: **1.135 aprovados e 1 falha**. Reproduziu a falha conhecida em `onboarding-flow.spec.ts:333` (“acomoda stepper, árvore e ações em 360px sem rolagem horizontal”: 303 > 298), já registrada na documentação anterior da fundação. Nenhum arquivo do onboarding foi alterado. Todos os testes das listas e contratos migrados passaram também na suíte completa.

Build de produção (`npm run build:prod`): **sucesso, exit 0**, com 38 avisos existentes. Não foram criados screenshots nem executados testes visuais.

Arquivos de implementação: `comercial-list.component.{ts,html,scss}`, `comercial.models.ts`, `data-table.component.ts` e `data-table.models.ts`. Testes: `comercial-list.component.spec.ts` e `data-table.component.spec.ts`. Nenhum componente global foi redesenhado.
