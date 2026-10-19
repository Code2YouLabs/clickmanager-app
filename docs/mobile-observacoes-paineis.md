# Observações mobile: resumo e edição em painel lateral

## Comportamento e contratos

- O Editor Comercial mobile apresenta uma única seção recolhível: mensagem vazia
  discreta ou resumos separados Para o cliente / Observação interna, seguidos de
  dois botões outline de mesma largura. O cabeçalho recolhido conta os controles
  reais. Não há recolhimento automático nem textareas permanentes na página.
- Os resumos usam interpolação Angular e limite CSS de três linhas. O texto
  armazenado não é truncado, interpretado como HTML ou normalizado. Quebras de
  linha são preservadas; os botões permitem consultar o texto completo.
- Um único template configura ObservacoesCardComponent com `panelEditor=true`.
  O contrato opt-in adiciona `aplicarTexto` / `fecharEditor`; os inputs e eventos
  anteriores continuam funcionando no modo padrão do desktop.
- InputTextareaComponent continua sendo o campo compartilhado, com os mesmos
  limites e mensagens; recebe apenas suporte opt-in a readonly e nome acessível.
  O limite nativo existente de 255 caracteres não passa a truncar valores carregados.
- O painel utiliza openMobileSidePanel, sem alterações na infraestrutura global.
  Herda abertura pela direita, fechamento, focus trap, scroll lock, safe areas e
  ajuste à visualViewport. O foco vai ao textarea após a entrada e retorna ao botão.
  Cabeçalho e rodapé fixos envolvem o corpo rolável. O textarea pode ser redimensionado.
- Ao abrir, um FormControl temporário recebe o texto aplicado e os validadores
  síncronos/assíncronos originais. Digitação não altera os controles do documento.
  Aplicar valida e chama os handlers existentes, atualizando somente o tipo escolhido.
  Cancelar, X, Escape e backdrop descartam o rascunho, inclusive ao reabrir.
- A limpeza usa os campos opcionais e o contrato existente `texto || null` na API;
  não adiciona obrigatoriedade. A apresentação deixa de mostrar o texto anterior.
  O botão desktop continua com seu comportamento anterior para conteúdo vazio.
- Pedidos e Rascunhos (novos ou carregados) e Orçamentos novos mantêm confirmação
  local; Aplicar não salva o documento inteiro. O salvamento original lê os mesmos
  controles e continua enviando os campos corretos no payload existente.
- Orçamentos já salvos continuam usando suas operações imediatas distintas para
  observação do cliente e interna. Somente o sucesso atualiza o documento via
  aplicarOrcamento e fecha o painel. Loading bloqueia edição/fechamento/duplicidade;
  erro mantém texto temporário para tentar novamente. Não há endpoint novo.
- Permissões e modo somente leitura são respeitados. Texto existente pode ser
  consultado integralmente em painel readonly, sem botão Aplicar; campo vazio fica
  indisponível quando não há permissão para editar.
- Cliente, itens, financeiro, pagamentos, ajustes, tutorial, navegação e desktop
  preservam seus fluxos. O helper global de painel lateral permanece intacto.

## Verificação

- Suíte específica: **19/19 aprovados**, usando ChromeHeadless e a configuração
  `application-theme` (CSS real). Cobre vazio, texto longo/literal, quebras, edição
  separada, limpeza, quatro formas de descarte, foco, validação, permissões,
  erro/retry/loading, contagem, recolhimento, desktop e payload dos três documentos.
- Rodada ampliada: **333 aprovados e 1 falha NG0205** em
  “Wizard: faixa de quantidade mobile mantém validação fora da lista recolhida e
  respeita erro de API e faixa inexistente”. A stack aponta para MatAutocompleteTrigger
  / _CdkPrivateStyleLoader e injector destruído. É a instabilidade de teardown/foco
  já reproduzida no commit anterior durante Pagamentos (ver
  [registro anterior](mobile-painel-pagamentos.md)); não houve falha nos testes novos.
  A rodada anterior restrita ao editor também a apresentou em um teste de Ajustes.
- A rodada ampliada cobre Editor Comercial, Primeiro Pedido, cadastro de cliente,
  Adicionar Item, etapas do configurador, ListFilterBar e boas-vindas.
- `npm run build:prod`: concluído com **38 avisos existentes**.
- `git diff --check`: aprovado.

Comandos de testes:

```sh
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/pages/grafica/comercial/comercial-editor-observacoes-panel-mobile.spec.ts'
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/pages/grafica/comercial/comercial-editor*.spec.ts' --include='src/app/pages/grafica/comercial/primeiro-pedido/*.spec.ts' --include='src/app/pages/cliente/cliente-create-dialog/*.spec.ts' --include='src/app/pages/grafica/comercial/adicionar-item-mobile.spec.ts' --include='src/app/pages/grafica/comercial/grafica-produto-wizard-*.spec.ts' --include='src/app/components/list-filter-bar/*.spec.ts' --include='src/app/shared/boas-vindas-primeiro-pedido/*.spec.ts'
```

Sem testes visuais ou screenshots. A aparência e o comportamento do teclado nativo
continuam sujeitos à validação manual pelo responsável pelo projeto.

## Arquivos modificados

- `src/app/pages/grafica/comercial/comercial-editor.component.ts`
- `src/app/pages/grafica/comercial/comercial-editor.component.html`
- `src/app/pages/grafica/comercial/comercial-editor.component.scss`
- `src/app/pages/grafica/comercial/comercial-editor-mobile.spec.ts`
- `src/app/pages/grafica/comercial/comercial-editor-observacoes-panel-mobile.spec.ts` (novo)
- `src/app/components/observacoes-card/observacoes-card.component.ts`
- `src/app/components/observacoes-card/observacoes-card.component.html`
- `src/app/components/observacoes-card/observacoes-card.component.scss`
- `src/app/components/inputs/input-textarea/input-textarea.component.ts`
- `src/app/components/inputs/input-textarea/input-textarea.component.html`
- `docs/mobile-observacoes-paineis.md` (novo)
