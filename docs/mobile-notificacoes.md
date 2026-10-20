# Notificações globais mobile

## Diagnóstico

- Início na branch `feature/mobile-comercial-adicionar-item-painel`, HEAD `8e52022`,
  árvore limpa. Commits mobile anteriores preservados.
- As telas comerciais usam `ToastrService` de `ngx-toastr` diretamente: métodos
  `success`, `error`, `warning`, `info` e `show`. A apresentação original é `Toast`
  da biblioteca. O app registra `provideToastr()` e `ToastrModule.forRoot()` com os
  padrões: posição superior direita a 12px, duração 5000ms, sem limite de abertos,
  sem deduplicação e sem botão Fechar por padrão. Clique no toast fecha a mensagem.
- `src/assets/scss/pages/_toast.scss` já utiliza as cores da skin. Sucesso/aviso
  vêm de `$success`/`$warning`, erro de `$error` e informação de `$primary`.
- O shell tem `.mobile-topbar` sticky, mas não publica altura global. O mínimo e
  padding CSS não representam necessariamente sua borda real. Painéis compartilham
  `.mobile-side-panel__header`; diálogos usam títulos Material; sheets do shell têm
  `.mobile-sheet__top`. O CDK já cuida de foco, empilhamento e scroll lock.
- Há `MatSnackBar` em telas de exemplo sob `pages/apps` e `pages/ui-components`.
  Não foram migrados. Notificações persistentes em `pages/notificacoes` são outro
  recurso, não toasts transitórios. Confirmações, validações e erros de página ficam
  intactos. Não foram identificados componentes customizados de toast nos consumidores.

## Implementação

- O provider raiz continua sendo **ToastrService**. `ResponsiveToastrService` herda
  o serviço existente e aplica políticas apenas no `MOBILE_FOUNDATION_QUERY`
  (`max-width: 760px`). Nenhuma tela precisa mudar sua injeção ou chamada.
- Mobile usa `MobileToastComponent`, derivado de `Toast`. A biblioteca mantém
  criação/ativação, referências `ActiveToast`, eventos, temporizadores e destruição.
  Não há segundo temporizador, biblioteca ou serviço público específico por página.
- Apresentação: superfície e texto da skin, ícone SVG distinto por tipo, borda
  semântica, raio 12px, fonte herdada da skin, texto 14/20px e Fechar de 44px com nome
  acessível. Acentos derivam das cores existentes, misturadas ao on-surface para
  legibilidade. Mensagens longas não são truncadas; seu corpo permite rolagem.
- Sucesso/informação usam `role=status`; erros usam `role=alert`. O wrapper da
  biblioteca fica `aria-live=off` no mobile para evitar anúncio duplicado. O toast
  não recebe foco automaticamente, não captura teclado e não fecha ao tocar no texto.
- Transição de opacidade em 160ms; movimento reduzido configura duração zero.
  Eventos de hover sintetizados pelo toque não suspendem o temporizador mobile.

## Posicionamento, overlays e teclado

- `MobileToastPositionService` mede `getBoundingClientRect().bottom` do cabeçalho
  ativo e publica `--mobile-toast-top` no container de notificações. A distância é
  8px, com safe-area mínima e margens laterais de 12px/safe-area. Não altera o
  cabeçalho, não inventa altura de topbar e não mantém offsets por rota.
- Prioridade da superfície: último diálogo CDK, sheet aberto, cabeçalho global.
  Dentro de diálogo/painel, o host fica no próprio container Material, fora de sua
  superfície interna animada. Assim permanece na fronteira de acessibilidade/foco
  do modal e usa seu contexto de empilhamento. Ao fechar, volta à superfície anterior.
  O nível mobile é o mesmo dos panes CDK (1000), sem aumentar o z-index global.
- ResizeObserver, MutationObserver e eventos de viewport/foco acompanham as medidas,
  com atualizações agrupadas em animation frames. Eventos e observadores são removidos
  quando não há mais toasts mobile ou na destruição do serviço.
- `visualViewport` limita o corpo à área visível; não há scrollIntoView, alteração de
  formulário ou fechamento do teclado. Se o campo focado cruza o espaço da mensagem,
  usa o espaço antes/depois dele quando suficiente, sempre abaixo do cabeçalho ativo.

## Duração e simultaneidade

- Padrões para mensagens curtas: sucesso 3s, informação 4s, aviso 5s, erro 6s.
  `timeOut`, `disableTimeOut` e `timeOut=0` explícitos continuam funcionando para
  notificações individuais. Textos longos sem duração explícita recebem tempo de
  leitura maior (45ms por caractere, respeitando o mínimo do tipo).
- Uma notificação ativa, mais no máximo quatro grupos pendentes (um por tipo).
  Ordem dos pendentes: erro, aviso, informação, sucesso. A notificação ativa não é
  substituída por mensagens novas. Identidade usa tipo, título e mensagem; duplicatas
  ainda ativas/pendentes reutilizam a referência sem reiniciar o tempo.
- Mensagens distintas do mesmo tipo, quando já pendentes, são reunidas integralmente
  no grupo. Não há descarte silencioso de erros nem crescimento no número de toasts.
  HTML agrupado é sanitizado e convertido em texto. Lotes de erro/aviso exigem
  fechamento manual para permitir consulta; sucesso/info continuam temporários com
  tempo suficiente para leitura. Fechamento manual explícito é preservado em lotes.
  Grupos compartilham uma referência/ciclo de vida; não têm duração individual por
  mensagem agregada. Seus textos podem crescer para preservar o conteúdo recebido.
- Ao redimensionar para desktop, os pendentes mobile não ficam abandonados. Novas
  notificações desktop continuam usando o componente/configuração originais.

## Preservação e limites

- Desktop puro segue por `super.show` com componente, opções, posição, estilos,
  duração, duplicatas e empilhamento originais. O CSS novo é restrito ao breakpoint
  mobile. Não foram alterados consumidores, mensagens, operações ou regras comerciais.
- Notificações abertas no mobile mantêm sua referência até fechar, inclusive durante
  uma mudança de viewport. Não se recria uma mensagem já aberta para trocar a skin.
- As evidências de teclado/posicionamento usam métricas simuladas e eventos DOM.
  Não houve teste visual, screenshot, comparação de imagem ou validação em aparelhos
  físicos. Teclados nativos, leitores de tela e viewports extremamente baixos ainda
  precisam de validação manual; sem espaço físico suficiente, não é possível garantir
  separação completa de um campo alto e uma notificação sobreposta.

## Arquivos modificados

- `src/app/app.config.ts`
- `src/assets/scss/pages/_toast.scss`
- `src/app/shared/notifications/responsive-toastr.service.ts`
- `src/app/shared/notifications/responsive-toastr.service.spec.ts`
- `src/app/shared/notifications/mobile-toast-position.service.ts`
- `src/app/shared/notifications/mobile-toast-position.service.spec.ts`
- `src/app/shared/notifications/mobile-toast.component.ts`
- `src/app/shared/notifications/mobile-toast.component.html`
- `src/app/shared/notifications/mobile-toast.component.scss`
- `docs/mobile-notificacoes.md`

## Validação

- **87 testes aprovados**, incluindo 19 cenários novos da fundação.
- Build de produção aprovado (exit 0), com os mesmos **38 avisos existentes**.
- `git diff --check` aprovado. Nenhuma falha preexistente apareceu na regressão final.
- Durante o desenvolvimento foram corrigidos problemas dos novos testes (mock de
  matchMedia, tipagem de elemento e comparação de ponto flutuante); não são falhas
  remanescentes nem foram atribuídos ao baseline.

```sh
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/shared/notifications/*.spec.ts' --include='src/app/pages/grafica/comercial/pedido-comercial-whatsapp*.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor-mobile.spec.ts' --include='src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component.spec.ts' --include='src/app/layouts/full/full.component.spec.ts'
npm run build:prod
git diff --check
```

Os testes cobrem os quatro tipos, duração padrão/explicita, texto longo, fechamento
automático/manual, deduplicação, prioridade, fila limitada, lotes, HTML sanitizado,
desktop, troca de viewport, movimento reduzido, foco, WhatsApp real, painel Material,
geometria do shell/diálogo, teclado simulado e limpeza dos observadores. A regressão
exercita também WhatsApp, Editor Comercial, cadastro de cliente e shell existentes.
