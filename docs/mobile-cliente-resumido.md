# Cliente compacto no Editor Comercial mobile

- O editor ativa `ClienteSelectorCard.mobileCompact` no breakpoint existente para
  Pedidos, Orçamentos e Rascunhos, sem alterar as outras seções.
- Após sucesso do fluxo atual de confirmação/associação/cadastro, a seção recolhe.
  Consultas pendentes, falhas e bloqueios de permissão não confirmam nem recolhem.
  O foco retorna ao cabeçalho sem scroll forçado e sem disputar com o próximo alvo
  de um tutorial ativo. Nenhuma navegação obrigatória entre grupos foi adicionada.
- O cabeçalho recolhido mostra nome e telefone formatado, quando disponível. Ao
  expandir, não repete o nome no cabeçalho: o corpo apresenta nome, telefone,
  documento e cidade/UF. Dados ausentes não geram linhas vazias.
- Ver mais dados / Ocultar detalhes controla uma região com `aria-expanded`,
  `aria-controls`, `hidden` e `inert`. Exibe e-mail e endereço complementar já
  carregados, sem consulta extra. Sem esses dados, a ação não aparece.
- Trocar cliente é um botão de texto no mobile, com o mesmo handler, permissão e
  cancelamento. Em somente leitura, detalhes seguem consultáveis e troca bloqueada.
- SectionCard, TelefonePipe, autocomplete e painel global de cadastro são reutilizados.
  O tutorial mantém seus alvos, checkpoint e retomada. A expansão do alvo Cliente
  reage à etapa do tutorial, sem reabrir por causa do próprio recolhimento enquanto
  o checkpoint ainda está em andamento.
- Desktop conserva cadastro completo, botões e estado expandido. Não houve mudança
  em APIs, modelos, regras cadastrais, itens, financeiro, salvamento ou rotas.

Validação funcional: seleção, confirmação assíncrona, associação em pedido existente,
falha, permissões, cadastro, troca/cancelamento, dados opcionais, detalhes acessíveis,
recolhimento/foco, três documentos, tutorial e desktop. Geometria de nome longo
verificada em 320px no Chrome Headless com CSS real. Sem teste visual ou screenshot;
a aparência e o comportamento em dispositivos reais serão validados manualmente.
