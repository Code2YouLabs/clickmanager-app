# Padronização Frontend - Suporte

Projeto: `clickmanager-app`

Branch: `feature/padronizar-suporte`

SHA base: `45c3814db0545926db47e4fffa54855132d0464e`

Épico: `#79`

## Escopo

Telas migradas:

- `/page/suporte`
- `/page/suporte/:id`

Componentes:

- `SuporteComponent`
- `ChamadoSuporteDialogComponent`

Serviço preservado:

- `SuporteService`

Contratos HTTP preservados:

- `GET api/suporte/chamados`
- `GET api/suporte/chamados/:id`
- `POST api/suporte/chamados`
- `POST api/suporte/chamados/:id/mensagens`
- `POST api/suporte/chamados/:id/fechar`

Não foram alterados:

- backend;
- rotas de Suporte;
- menu de Suporte;
- modelo de domínio;
- valores de status, categoria ou prioridade.

## Baseline

Antes das alterações, `develop` e `origin/develop` foram confirmados no mesmo SHA:

`45c3814db0545926db47e4fffa54855132d0464e`

Baseline executada antes da alteração:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `652 SUCCESS`.

Falhas preexistentes: nenhuma.

## Estrutura Final

A tela preserva o padrão master/detail:

- lista de chamados à esquerda;
- detalhe/conversa à direita;
- sem conversão para `DataTable`.

A tela usa:

- `PageCard` como shell;
- ação principal `Novo chamado` em `page-header-actions`;
- `InputPesquisa` para busca local;
- `InputOptions` para filtro de status;
- `StatusBadge` para status;
- estados explícitos independentes para lista e detalhe;
- `InputTextarea` para resposta;
- `ConfirmDialog` para fechar chamado.

Foram removidos wrappers `SectionCard` vazios que só criavam borda dentro de borda.

## Header

O header usa:

- título: `Suporte`;
- subtítulo: `Abra chamados e acompanhe o histórico de atendimento.`;
- ação principal: `Novo chamado`.

O botão de novo chamado não fica mais em uma seção dedicada.

## Novo Chamado

`ChamadoSuporteDialogComponent` continua sendo dialog.

Não usa:

- `PageCard`;
- `PageFormState`.

Foi padronizado com:

- `dialog-form-shell.scss`;
- `InputTextoRestrito` para assunto;
- `InputOptions` para categoria;
- `InputOptions` para prioridade;
- `InputTextarea` para mensagem.

Form:

`<form id="novo-chamado-form" [formGroup]="form" (ngSubmit)="salvar()">`

Botão principal:

- `type="submit"`;
- `form="novo-chamado-form"`.

Não há duplicação de `(click)` com submit.

Validators preservados:

- assunto: `required`, `maxlength(160)`;
- categoria: `required`;
- prioridade: `required`;
- mensagem: `required`, `maxlength(3000)`.

Defaults preservados:

- categoria: `DUVIDA`;
- prioridade: `MEDIA`.

## Lista

A lista preserva itens selecionáveis e continua mostrando:

- assunto;
- tempo/data da última atualização;
- status;
- prioridade;
- categoria;
- número do chamado.

Busca local preservada sobre:

- assunto;
- categoria;
- prioridade.

Status preservados:

- `TODOS`;
- `ABERTO`;
- `EM_ANALISE`;
- `AGUARDANDO_CLIENTE`;
- `RESPONDIDO`;
- `RESOLVIDO`;
- `FECHADO`.

Empty states:

- sem chamados: `Nenhum chamado aberto ainda. Use "Novo chamado" para falar com o suporte.`;
- filtros sem resultado: `Nenhum chamado corresponde aos filtros atuais.`

## Contadores

O total geral usa `totalItens` da resposta paginada.

O contador de chamados não fechados foi mantido somente como semântica local:

- `em andamento nesta lista`.

Ele não é apresentado como total global, porque o backend não fornece contagem global por status.

## Paginação

A tela deixou de depender permanentemente apenas da primeira página carregada.

Foi adicionado `Carregar mais` usando os campos já existentes:

- `pagina`;
- `tamanho`;
- `totalItens`;
- `totalPaginas`.

Comportamento:

- página inicial: `0`;
- carregar mais: próxima página;
- append;
- deduplicação por `id`;
- ordenação por `atualizadoEm` decrescente.

Não foi criado endpoint novo.

## Deep Link E Requests

`/page/suporte/:id` continua carregando o detalhe mesmo quando o chamado não está na primeira página da lista, por meio de `buscarPorId$(id)`.

O fluxo foi separado em:

- carga inicial da lista;
- seleção do detalhe pela URL;
- sincronização da URL.

Ao clicar em um chamado:

- a URL é atualizada;
- o detalhe é carregado pela reação da rota;
- a lista não é recarregada;
- não há chamada duplicada para o detalhe.

Ao criar chamado:

- o item é inserido/atualizado na lista local;
- o detalhe criado vira a seleção atual;
- a URL é atualizada;
- a lista não é recarregada automaticamente.

## Concorrência

O detalhe protege contra resposta obsoleta com geração de request.

Cenário coberto:

- usuário solicita chamado 5;
- antes da resposta, solicita chamado 6;
- resposta do 6 chega;
- resposta atrasada do 5 é ignorada.

## Estados Independentes

Lista:

- loading;
- error com retry;
- empty;
- filtered empty;
- content;
- loading more.

Detalhe:

- no selection;
- loading;
- error com retry;
- not found;
- content.

Erro ao carregar detalhe não apaga a lista.

Retry do detalhe chama somente `GET api/suporte/chamados/:id`.

## Segurança Das Mensagens

Mensagens internas são filtradas no frontend:

`mensagens.filter(m => m.interna !== true)`

A timeline renderiza somente `mensagensVisiveis`.

Isso adiciona defesa no portal mesmo que o backend já omita mensagens internas.

## Timeline

A timeline preserva:

- autor;
- distinção textual `Você` / `Suporte`;
- data/hora;
- conteúdo;
- estilos diferentes por autor.

As mensagens visíveis são ordenadas por `criadaEm` crescente em cópia local, sem mutar o objeto recebido.

## Responder Chamado

Resposta passou a usar form nativo:

`<form id="resposta-chamado-form" [formGroup]="respostaForm" (ngSubmit)="responderChamado()">`

Botão:

- `type="submit"`;
- `form="resposta-chamado-form"`.

Input:

- `InputTextarea`.

Validator:

- `required`;
- `maxlength(3000)`;
- validação local para bloquear mensagem vazia após `trim`.

Em sucesso:

- atualiza detalhe com response;
- limpa resposta;
- atualiza item da lista;
- exibe feedback.

Em erro:

- preserva texto digitado;
- libera nova tentativa.

Double submit é bloqueado enquanto o `POST /mensagens` está pendente.

## Fechar Chamado

`ConfirmDialogComponent` foi preservado.

O fechamento mantém:

- mensagem de confirmação;
- `POST api/suporte/chamados/:id/fechar`;
- atualização do detalhe;
- atualização do item da lista;
- feedback de sucesso/erro.

Foi adicionado bloqueio contra duplo fechamento enquanto o request está pendente.

## Cobertura

Foram cobertos por testes:

- rotas `/page/suporte` e `/page/suporte/:id`;
- item de menu de Suporte;
- deep link sem requests duplicados;
- clique em chamado sem recarregar lista;
- criação de chamado sem reload duplicado;
- concorrência de detalhe com resposta obsoleta;
- mensagens internas não renderizadas;
- busca e filtro com componentes compartilhados;
- empty states distintos;
- semântica de contadores;
- carregar mais com append, deduplicação e ordenação;
- retry do detalhe sem recarregar lista;
- resposta com form nativo, trim, double submit e erro preservando texto;
- dialog com inputs compartilhados, defaults, validators, submit nativo, double submit, erro e cancelamento.

## Validações

`npm test -- --watch=false --browsers=ChromeHeadless`

Baseline: `652 SUCCESS`.

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/suporte/suporte.component.spec.ts' --include='src/app/pages/suporte/components/chamado-suporte-dialog.component.spec.ts'`

Resultado: `19 SUCCESS`.

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `671 SUCCESS`.

`npm run build`

Resultado: sucesso, com warnings preexistentes fora do escopo da tela.

`git diff --check`

Resultado: sucesso.

Novas falhas: `0`.

Validação visual: pendente de revisão manual pelo responsável do produto.
