# Resumo financeiro mobile e painéis de operações

- O mobile exibe linhas somente leitura com os valores de `resumoFinanceiroView`.
  Pedidos mostram Subtotal, Acréscimos, Frete, Descontos, Total, Pago e Saldo.
  Orçamentos/Rascunhos mantêm as informações e ações próprias, sem recebimentos.
  Total tem destaque moderado; o painel inferior Total/Salvar continua intacto.
- SectionCard conserva expansão/recolhimento e atualiza o resumo do cabeçalho.
  Os acionadores Ajustes/Pagamentos têm dimensões iguais; uma ação ocupa a largura
  disponível quando o contexto só permite ajustes. Não há inputs na seção mobile.
- Ajustes financeiros usa o mesmo `openMobileSidePanel` de Pagamentos, cadastro,
  configurador e filtros. Templates e controles continuam no Editor Comercial.
  InputMoeda mantém máscara, teclado, precisão, min/max e mensagens existentes.
- `ajustesMobileForm` é apenas um rascunho dos três campos. Copia valores atuais,
  validadores e disabled ao abrir. Digitar não altera o resumo nem Total/Pago/Saldo.
  Cancelar/X/Escape/backdrop descartam o rascunho; não há aplicação parcial.
- Aplicar valida o rascunho inteiro. Em novos documentos, utiliza o normalizador
  existente para atualizar `ajustesFinanceirosForm`, marcando-o dirty. O mecanismo
  financeiro atual atualiza os resumos, sem uma segunda fórmula.
- Em Pedido/Orçamento já salvos, Aplicar reutiliza a operação explícita que antes
  era acionada por Salvar ajustes, com os mesmos endpoints, permissões e atualização
  de resposta. O handler aceita um formulário e callback opcionais, preservando seu
  comportamento desktop padrão. O editor só recebe os valores após sucesso.
  Loading bloqueia edição/fechamento e múltiplos toques; erro mantém o painel e o
  rascunho para correção, sem substituir valores aplicados.
- Rascunhos preservam ajustes locais estimativos e nunca acionam um endpoint de
  Pedido pelo painel. Salvamento/conversão continuam nos handlers originais.
- Pagamentos abre exatamente o painel existente, com o mesmo FormGroup, registros,
  handlers, persistência temporária/persistida e cálculo de Pago/Saldo. O acionador
  passa a ter o rótulo fixo Pagamentos. Não é possível abrir os dois painéis juntos,
  inclusive durante o fechamento. O foco retorna ao respectivo acionador.
- Desktop mantém inputs inline e operação explícita de Salvar ajustes. Não foram
  alterados APIs, DTOs, fórmulas, permissões, tutorial ou outros consumidores globais.

Verificação: 315 testes aprovados na rodada final, cobrindo aplicação/cancelamento,
rascunho, inválidos, erro/loading, contextos novos/salvos, pagamentos, sincronização,
foco, 320/360px, desktop e consumidores compartilhados. Uma rodada anterior exibiu
NG0205 em autocomplete/injector destruído, instabilidade preexistente já reproduzida
no commit anterior durante a tarefa de Pagamentos (ver mobile-painel-pagamentos.md).
Sem testes visuais nem screenshots; aparência e teclado nativo serão validados
manualmente pelo responsável. Build de produção concluído com os mesmos 38 avisos existentes.
