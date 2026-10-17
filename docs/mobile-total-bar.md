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
| `reserveSpace` | Opt-in para reserva em fluxo, medida por ResizeObserver conforme a altura da barra. Padrão `false` para preservar reservas dos consumidores atuais. |
| `avoidKeyboard` | Opt-in para acompanhar visualViewport e manter barra/detalhes na área visível. Padrão `false`. |

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

## Validação

Testes direcionados: **121 aprovados**, cobrindo SmartCalc, barra global, editor e PageCard. Incluem a variante compartilhada, submit nativo único, tutorial, Detalhes/puxador, disabled, reserva e teclado.

Suíte completa: **1.149 aprovados e 1 falha conhecida**, em `onboarding-flow.spec.ts:333`, sobre largura em 360 px (`303 > 298`). Nenhum arquivo do onboarding foi alterado. Build de produção: **sucesso**, exit 0, com os mesmos **38 avisos existentes**. `git diff --check` sem problemas.
