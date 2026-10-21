# Pagamentos no painel lateral mobile

## Contratos preservados

- `ComercialEditorComponent` permanece a única fonte de pagamentos e valores.
  `pagamentoForm` contém o rascunho de Forma/Valor; a coleção adicionada é separada.
- Sem `pedidoId`, adicionar apenas altera `pagamentosPretendidos` e limpa o form.
  A coleção integra o payload do salvamento explícito do pedido. Não há recebimento
  no backend ao abrir, adicionar ou fechar o painel de um pedido novo.
- Com `pedidoId`, adicionar usa `registrarRecebimentoPedido`; cancelar usa
  `cancelarRecebimento`. O sucesso recarrega resumo, recebimentos e permissões pelos
  três endpoints existentes. Erro preserva preenchimento e mensagem atuais.
- `resumoFinanceiroView` continua fornecendo Total/Pago/Saldo; nenhuma fórmula nova.
  `mostrarPagamentos` e `permissoesFluxo.pagamentos` continuam regendo disponibilidade.
  Orçamentos e Rascunhos não recebem um novo fluxo de pagamentos.

## Apresentação e ciclo de vida

- Mobile deixa ajustes e valores na seção financeira e oferece uma única ação:
  Adicionar pagamento / Gerenciar pagamentos, conforme a coleção existente.
- `openMobileSidePanel` recebe um TemplateRef do próprio editor e seu ViewContainerRef.
  Reutiliza foco, backdrop, bloqueio de scroll, safe area, animações, viewport/teclado
  e fechamento do painel global, sem alterar essa infraestrutura.
- Templates compartilhados preservam controles, formulário, lista e handler do desktop.
  No painel, Pago/Saldo ficam no topo, campos em largura total, histórico abaixo e
  Adicionar pagamento no rodapé. InputOptions, InputMoeda, SectionCard e StatusBadge
  continuam sendo os componentes existentes.
- O X, Escape e backdrop fecham sem adicionar ou salvar. Campos ainda não adicionados
  permanecem no FormGroup do editor; reabrir recupera o rascunho. Pagamentos incluídos,
  ajustes, cliente, itens e observações são preservados.
- Abrir recolhe apenas os detalhes do painel inferior para evitar dois painéis
  expandidos. O Total/Salvar não é redesenhado. O foco retorna ao acionador.
  Instâncias duplicadas são bloqueadas; transição para desktop e destruição fecham
  o painel. Loading/permissões mantêm os bloqueios existentes dos botões.
- Uma mensagem no pedido novo esclarece que pagamentos serão incluídos ao salvar.
  Não foram criados enums/status, APIs, coleções, cálculos ou persistência paralela.

## Verificação

Testes funcionais: painel único, X/Escape/foco, rascunho preservado, múltiplos e parciais,
limites, remoção/cancelamento, loading/erro, inclusão temporária versus persistida,
sincronização dos resumos, payload ao salvar, permissões, outros documentos e desktop.
Geometria/foco com CSS real no Chrome Headless em 320/360/390px; regressão dos demais
consumidores do painel global. Sem testes visuais nem screenshots. Teclado nativo e
aparência em dispositivos reais permanecem para validação manual do responsável.

Resultado da verificação:
- 92 testes do editor aprovados, incluindo os 8 novos testes do painel.
- Rodada ampliada: 298 aprovados e 1 falha de ciclo de vida/foco (`NG0205`,
  autocomplete tentando acessar um injector já destruído). O teste atingido varia
  entre execuções. A mesma falha foi reproduzida na cópia do commit anterior
  `eafe496`: 290 aprovados e 1 falha, confirmando condição preexistente.
- Build de produção concluído com os mesmos 38 avisos existentes.
