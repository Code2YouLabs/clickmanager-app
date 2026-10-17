# Financeiro e pagamentos mobile

- O resumo usa `resumoFinanceiroView`, sem nova fórmula. O painel inferior aprovado
  continua lendo o mesmo resumo e conserva sua reserva de espaço, safe area e
  adaptação ao teclado. Nenhuma mudança no componente MobileTotalBar.
- Valores do documento / Ajustes / Situação financeira organizam os campos existentes.
  Ajustes têm uma coluna para acomodar labels e valores monetários em 320/360px.
  Pago é secundário e Saldo ganha hierarquia, preservando cores e valores reais.
- Forma de pagamento e Valor ocupam toda a largura; o botão permanece abaixo.
  Loading usa o estado existente e impede novos cliques e cancelamentos no mobile.
  Erros preservam o preenchimento e as mensagens atuais.
- O histórico usa linhas com forma, valor, status e data quando disponível, além da
  ação de cancelamento já permitida pelo fluxo. O vazio permanece curto.
- SectionCard, InputMoeda, InputOptions, StatusBadge e MobileTotalBar são reutilizados.
  InputMoeda ganhou `showControlErrors`, falso por padrão, para refletir a validação
  do FormControl externo no Material e acompanhar touched/valor em OnPush. O editor
  ativa o contrato só no mobile. Máscaras, limites e validadores não mudaram.
  Campos de moeda e opções receberam nomes acessíveis, sem mudança visual.
- Somente Pedidos oferece recebimentos, conforme o contexto atual. Orçamentos e
  Rascunhos mantêm ajustes e seus próprios fluxos sem pagamentos novos. A seção
  recolhível existente no novo Pedido preserva instâncias e estado ao fechar.
- Desktop conserva layout, colunas, labels, sticky e comportamento padrão dos campos.

Validação: testes funcionais de ajustes, pagamentos parciais/integrais/múltiplos,
limites, loading, erro, cancelamento, permissões, sincronização, recolhimento,
compatibilidade de documentos, campos compartilhados e desktop. Geometria e foco
verificados em Chrome Headless com CSS real em 320/360/390px e altura reduzida.
Sem testes visuais nem screenshots; aparência, teclado nativo e dispositivos reais
ficam para validação manual do responsável.
