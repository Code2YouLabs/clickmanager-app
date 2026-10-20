# MobileTotalBar — barra global de total, detalhes e ação

`src/app/components/mobile-total-bar/mobile-total-bar.component.ts` já era um componente compartilhado, utilizado pelo SmartCalc e outros consumidores. A aparência compacta aprovada ainda estava em CSS local do SmartCalc. Agora pertence ao próprio componente e é selecionada por `appearance="compact"`, sem dependência de regras comerciais.

SmartCalc e a criação mobile de Pedidos usam essa mesma aparência, incluindo puxador, Detalhes, total, botão e detalhes expansíveis. O CSS local duplicado do SmartCalc foi removido, preservando suas medições de altura e comportamento. Outros consumidores continuam compatíveis com a aparência padrão até sua adoção explícita. Novas telas que precisarem desse padrão devem reutilizar a barra, sem criar outro rodapé.

## Contrato

| Opção | Uso |
|---|---|
| `appearance` | `default` preserva consumidores existentes; `compact` usa a aparência compartilhada do SmartCalc. |
| `label`, `valueText` | Rótulo e valor preparados pelo consumidor. A barra não calcula valores. |
| `inlineDetails`, `expanded`, `detailText`, `detailsPanelId` | Detalhes projetados na barra; ID único por instância. Reutiliza expansão, recolhimento, teclado e gestos existentes. |
| `total-bar-details-header` / `total-bar-details` | Slots de cabeçalho e conteúdo consultivo dos detalhes. |
| `actionText`, `actionDisabled` | Texto e estado real da ação, fornecidos pela tela. |
| `actionType`, `actionForm` | Por padrão `button`, sem formulário. Para submit nativo, informar `submit` e o ID do formulário existente. |
| `actionTutorialTarget` | Registra o botão principal como alvo usando a diretiva de tutorial existente. |
| `bottomOffset`, `attachedToBottomNav` | Posicionamento junto à navegação inferior já existente. |
| `bottomAnchorSelector` | Opcional: elemento fixo abaixo da barra. Sua borda medida substitui o offset nominal, incluindo safe area. Pedidos aponta para `.mobile-bottom-nav`, sem alterar o shell. |
| `reserveSpace` | Opt-in para reserva medida do painel recolhido. Detecta o contêiner real de rolagem do `actionForm`, desconta o espaço já existente depois do formulário e ajusta temporariamente seu `scroll-padding-bottom`. Padrão `false`. |
| `avoidKeyboard` | Opt-in para acompanhar visualViewport, limitar a superfície à área visível e revelar controles focados por rolagem nativa quando necessário. Padrão `false`. |

Os eventos `expand`, `collapse`, `action` e `secondaryAction` permanecem disponíveis. Textos de cálculo/carregamento do SmartCalc e seus estados existentes não foram alterados.

Exemplo para formulário:

```html
<app-mobile-total-bar appearance="compact" label="Total"
  [valueText]="formattedTotal" [inlineDetails]="true"
  [expanded]="detailsOpen" detailsPanelId="entity-total-details"
  [detailText]="detailsOpen ? 'Ocultar detalhes' : 'Detalhes'"
  [actionText]="saving ? 'Salvando...' : 'Salvar'"
  [actionDisabled]="cannotSave || saving"
  actionType="submit" actionForm="entity-form"
  bottomOffset="var(--mobile-bottom-nav-height, 0px)"
  [attachedToBottomNav]="true" [reserveSpace]="true" [avoidKeyboard]="true"
  (expand)="detailsOpen = !detailsOpen" (collapse)="detailsOpen = false">
  <h2 total-bar-details-header>Detalhes</h2>
  <div total-bar-details>Resumo fornecido pela tela</div>
</app-mobile-total-bar>
```

Com submit nativo, não chamar o mesmo salvamento também pelo evento `action`: o formulário mantém seu `(ngSubmit)` como entrada única. Para ações sem formulário, manter o tipo padrão `button` e tratar `(action)`.

## Pedidos e preservação

Na criação mobile de Pedidos, o rodapé fixo experimental do PageCard foi removido, incluindo observadores, CSS e contrato `mobileStickyFooter`. O PageCard retorna ao contrato anterior; o restante da organização do editor permanece igual. A barra exibe os valores reais e revisão consultiva; edição financeira continua no grupo existente. Salvar mantém o mesmo formulário, disabled, loading e alvo do Primeiro Pedido. Cancelar continua na revisão; Voltar, no cabeçalho. Desktop e outros fluxos comerciais não recebem essa barra.

Não foram alterados cálculos, serviços comerciais, permissões, navegação inferior ou progresso do tutorial. Sem testes visuais nem screenshots; validação manual em dispositivos permanece com o responsável pelo projeto.

## Correção de posicionamento e rolagem do editor

A superfície fixa é `.mobile-total-bar`, pertencente ao `MobileTotalBarComponent`; o editor apenas fornece dados, ação e formulário. O PageCard não controla a rolagem. No shell, o formulário está em `.pageContent--mobile`, dentro de `mat-sidenav-content.contentWrapper`; dependendo da altura efetiva dos ancestrais, rola esse contêiner ou `document.scrollingElement`. O painel identifica o ancestral com `overflow-y` rolável e conteúdo excedente, com fallback para o documento.

Antes, a reserva repetia toda a altura do painel, inclusive a parte expandida, e somava espaço a um shell que já possui padding inferior. Essa reserva não ajustava a área considerada visível pelo contêiner real ao focar campos ou usar `scrollIntoView`. A altura dos detalhes também dependia de estimativas de handle/controles, sem limitar a superfície inteira. A variável nominal da navegação (60 px + safe area) não necessariamente equivale à altura final de seus botões, bordas e conteúdo.

A correção mantém o painel fixo e sua aparência recolhida. Uma sobreposição temporária durante a rolagem continua possível por projeto; os controles podem ser trazidos inteiramente para cima dele:

- **Alturas reais:** a altura recolhida é a altura medida da superfície menos a altura visível dos detalhes. A navegação é medida pelo anchor opcional; não há novo offset de negócio ou alteração no menu.
- **Reserva necessária:** o espaço a acrescentar corresponde à obstrução inferior da superfície de rolagem, mais o pequeno respiro de 8 px, menos a área que já existe depois do formulário. O cálculo desconta a própria reserva para permanecer estável. A expansão não aumenta essa reserva nem move programaticamente o scroll do formulário.
- **Rolagem nativa:** o proprietário recebe `scroll-padding-bottom` compatível com a área ocupada. Seu valor anterior é preservado e restaurado ao sair da tela/desativar a integração. Não se cria outro contêiner rolável para o formulário.
- **Expandido:** a altura máxima é a área visível menos o offset inferior efetivo (compensando o trecho coberto pelo teclado). Handle, cabeçalho dos detalhes e Total/Salvar não encolhem; só o corpo dos detalhes rola. O título projetado permanece fora desse corpo. Não há modal, bloqueio do documento ou `overflow: hidden` no formulário.
- **Foco e teclado:** mantém o `visualViewport` existente e usa `scrollIntoView({block: 'nearest'})` somente para um controle focado encoberto ou fora da área visível. Focar um controle do formulário recolhe detalhes sem destruir campos. A rolagem manual não é redirecionada ao campo. A rolagem do formulário/documento, inclusive a usada pelo tutorial, recolhe detalhes para liberar o alvo; a rolagem interna dos detalhes não o faz.

Observadores de altura, frames pendentes e listeners são removidos ao destruir o painel. A integração usa somente contratos genéricos de formulário/anchor, sem regras de Pedido na fundação. No editor, a única alteração de integração é `bottomAnchorSelector=".mobile-bottom-nav"`; Voltar, PageCard, campos, grupos recolhíveis, ações e permissões permanecem iguais. Orçamentos, Rascunhos e desktop continuam fora do piloto, conforme os testes de regressão existentes.

Testes de cálculo usam métricas DOM simuladas, por exemplo painel recolhido de 112 px e navegação de 72 px; esses números são fixtures, não alturas fixadas no produto. A altura efetiva em produção é sempre medida. Não foram executados testes visuais ou screenshots; dispositivos reais e particularidades de teclado/safe area ficam para validação manual.

## Validação

Os números abaixo registram a adoção inicial da barra global. A correção posterior de rolagem teve baseline de **117 testes aprovados** e **121 testes direcionados aprovados**, incluindo reserva sem duplicação, expansão sem salto, proprietário correto, teclado/foco e limpeza dos estilos. A primeira regressão completa passou com **1.154/1.154**. Após incluir a proteção para foco de botões e rolagem nativa do tutorial, a execução final teve **1.153 aprovados e uma falha conhecida do onboarding**, em `onboarding-flow.spec.ts:333` (`303 > 298`), sem falhas nas funcionalidades alteradas. Nenhum arquivo do onboarding foi modificado. Build final: **exit 0, 38 avisos existentes**. A validação utilizou testes automatizados; não houve teste visual nem screenshot.

Testes direcionados: **121 aprovados**, cobrindo SmartCalc, barra global, editor e PageCard. Incluem a variante compartilhada, submit nativo único, tutorial, Detalhes/puxador, disabled, reserva e teclado.

Suíte completa: **1.149 aprovados e 1 falha conhecida**, em `onboarding-flow.spec.ts:333`, sobre largura em 360 px (`303 > 298`). Nenhum arquivo do onboarding foi alterado. Build de produção: **sucesso**, exit 0, com os mesmos **38 avisos existentes**. `git diff --check` sem problemas.
