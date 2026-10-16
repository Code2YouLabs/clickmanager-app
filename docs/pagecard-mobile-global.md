# PageCard: padrão global de cabeçalho mobile

## Diagnóstico e inventário

A inconsistência vinha do piloto: `mobileCompact`, `mobileTitleOnly` e `mobilePrimaryAction` eram habilitados somente quando `tipo === 'pedidos'`. Orçamentos e Rascunhos usavam o mesmo `ComercialListComponent`, mas recebiam os defaults antigos. O botão desktop também era declarado separadamente do FAB, repetindo a configuração por apresentação.

Foram encontrados **77 arquivos consumidores reais** com `<app-page-card>`, incluindo templates inline, sem contar imports ou testes. [Inventário completo e classificação](validation/pagecard-mobile-global/consumidores.md):

| Classe | Arquivos | Tratamento |
|---|---:|---|
| Sem ação principal no header | 19 | Cabeçalho mobile padrão; conteúdo e footer preservados; nenhum FAB artificial. |
| Ações legadas/especiais | 42 | Cabeçalho mínimo; voltar, ajuda e comandos projetados continuam acessíveis em área de ações após o divisor. Não são inferidos como FAB. |
| Estrutura mobile própria/ações existentes | 13 | Nenhuma nova ação flutuante é inferida. FABs e barras existentes permanecem com seus consumidores. |
| Ação principal explicitamente declarada | 1 | Template do Comercial, compartilhado por Pedidos, Orçamentos e Rascunhos. |
| Exceções explícitas | 2 | Dashboard e SmartCalc mantêm seus layouts mobile já aprovados. |

A classificação identifica a estrutura do cabeçalho, não uma migração funcional dos módulos. Tabelas, filtros, Kanban, regras comerciais e dados não foram modificados.

## Padrão e responsabilidades

Até o breakpoint já estabelecido de **760 px**, o PageCard aplica automaticamente o cabeçalho compacto, exibindo somente o título e mantendo o divisor conforme `mostrarDivisor`/`headerDivider`. O subtítulo permanece como descrição acessível, sem apresentação visual e sem ocupar altura. Acima desse breakpoint, o título, subtítulo, ações e espaçamentos desktop permanecem como antes.

O **PageCard** decide o modo responsivo e a apresentação da ação principal. O **CardHeader** renderiza o contexto, divisor e ações: no desktop, as ações ficam dentro do header; no mobile padrão, as ações secundárias e legadas ficam em uma área compartilhada abaixo do divisor. A projeção é instanciada uma única vez, preservando handlers, bindings, `disabled`, rotas e diretivas de permissão. O CardHeader usado isoladamente mantém seu comportamento anterior.

Essa separação evita que a simplificação esconda Voltar, Ajuda, Salvar PDF, Imprimir, uploads ou outros comandos ainda não declarados como principais. A fundação não identifica ações pelo texto, ícone ou rota. Não cria nem converte ações automaticamente.

## Ação principal única

O novo contrato é `primaryAction: PageCardPrimaryAction | null`, acompanhado do evento `primaryActionClick`:

```html
<app-page-card
  [titulo]="titulo"
  [subtitulo]="subtitulo"
  [primaryAction]="{ label: configuracao.novo }"
  (primaryActionClick)="novo()">
  <!-- conteúdo da página -->
</app-page-card>
```

A configuração aceita `label`, `icon`, `color`, `disabled`, `permission` (string ou array) e `tutorialTarget`. O consumidor fornece o comando e a autorização; não há navegação hardcoded no PageCard. `permission` utiliza a mesma `TemPermissaoDirective` existente, em ambas as apresentações. `saving`, `actionsDisabled`, `headerActionDisabled` e o bloqueio da ação impedem emissão.

No desktop, o CardHeader apresenta o botão primário. No mobile padrão, o PageCard o substitui pelo MobileFabAction já existente. Há uma única ação renderizada, com o mesmo evento e alvo do tutorial. Posição acima da navegação inferior, safe areas, área de toque de 56 px e reserva inferior sem duplicar o padding do shell são reaproveitados da implementação anterior.

`null` significa ausência de ação; ações de footer e ações secundárias não são transformadas em FAB. Páginas que já têm FAB próprio não recebem outro por inferência. Ao adotar `primaryAction`, o consumidor deve substituir a declaração antiga da mesma ação.

## Comercial e compatibilidade

O template comum das três listagens declara a ação uma vez, usando `configuracao.novo` e o mesmo `novo()`. Foram removidos os inputs de habilitação mobile do PageCard e o botão duplicado no header. Pedidos mantém seu alvo `primeiroPedidoTargets.novo`; as outras duas entidades não recebem alvos do tutorial de Pedidos.

- Pedidos: **Novo pedido**, mesmo destino `/page/grafica/comercial/pedidos/novo`.
- Orçamentos: **Novo orçamento**, mesmo destino `/page/grafica/comercial/orcamentos/novo`.
- Rascunhos: **Novo rascunho** já existia no cabeçalho, na configuração, no handler e na rota de criação. Sua apresentação foi transferida; não foi criada funcionalidade de cadastro nem alterado o editor.

A configuração mobile do DataTable e do toggle continua exclusiva do piloto anterior; não foi modificada nem estendida por esta tarefa. Nenhuma busca, filtro, tabela, card, paginação ou Kanban foi redesenhado.

## Exceções e APIs existentes

`mobileHeaderMode="legacy"` é a exceção explícita para páginas com composição mobile própria: preserva o header antigo e não move a ação declarada para FAB. Apenas Dashboard e SmartCalc receberam esse atributo. Nenhum handler, CSS, cálculo, regra ou conteúdo desses módulos foi alterado.

`mobileCompact` e `mobileTitleOnly` permanecem como overrides de compatibilidade, mas agora são opcionais: sem valor, seguem o modo compartilhado `standard`. Páginas comuns não precisam declará-los. `mobilePrimaryAction`/`mobilePrimaryActionClick` permanecem compatíveis para consumidores antigos; a nova ação comum tem precedência e deve ser preferida em novas adoções.

Os inputs de rota, ajuda, permissões e projeções existentes do PageCard/CardHeader permanecem disponíveis. O footer e PageFormState não mudaram, inclusive a construção direta do componente nos consumidores existentes. O shell global e a navegação inferior não foram modificados.

## Validação

- Testes focados em PageCard, CardHeader e Comercial: **158 passaram** na validação inicial do contrato global. Cobertura de defaults, exceção, ausência de ação, ações secundárias, permissões, disabled, troca de apresentação sem duplicação e destinos das três entidades.
- A primeira suíte completa mostrou três consumidores que verificam o conteúdo do subtítulo. A descrição foi mantida semanticamente, sem voltar a ocupar espaço visual no mobile; os testes desses consumidores não precisaram ser alterados.
- Suíte completa final: `npm test -- --watch=false --browsers=ChromeHeadless` — **1.072 passaram de 1.073**, exit 1 somente pela falha preexistente do onboarding em 360 px: “Narrativa do onboarding acomoda stepper, árvore e ações em 360px sem rolagem horizontal”, `Expected 303 to be less than or equal 298`. Nenhuma falha nova.
- `npm run build:prod`: **exit 0**, os mesmos 38 avisos existentes, nenhum erro. `git diff --check`: sem erros.
- Logs completos temporários: `/tmp/clickmanager-global-pagecard-focused.log`, `/tmp/clickmanager-global-pagecard-full.log`, `/tmp/clickmanager-global-pagecard-build.log`. [Registro dos resultados](validation/pagecard-mobile-global/resultados.md).
- Nenhum teste visual ou screenshot produzido. A aprovação visual de mobile e desktop continua com o responsável pelo projeto.

## Arquivos modificados

- `src/app/components/page-card/page-card-primary-action.ts`
- `src/app/components/page-card/page-card.component.{ts,html,spec.ts}`
- `src/app/components/card-header/card-header.component.{ts,html,scss}`
- `src/app/pages/grafica/comercial/comercial-list.component.{html,spec.ts}`
- `src/app/pages/dashboards/dashboard1/dashboard1.component.html`: somente exceção de contrato.
- `src/app/pages/apps/smart-calc/smart-calc.component.html`: somente exceção de contrato.
- Este relatório, inventário de consumidores e links de atualização na documentação anterior.
