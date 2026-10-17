# Cadastro rápido de cliente no mobile

O Editor Comercial abre `ClienteCreateDialogComponent` no painel lateral existente
com `data.mobileMode: 'quick'`. O modo usa o breakpoint compartilhado (até 760px).
Sem essa opção, ou em desktop, permanece o cadastro completo.

- Cabeçalho com título e Fechar.
- Nome, Telefone e E-mail diretamente na superfície principal.
- Documento e Endereço em Informações adicionais, inicialmente recolhida.
- Recolher mantém controles, máscaras, validações e valores. Erros nos adicionais
  abrem a seção ao salvar e recebem foco; mensagens já expostas não são ocultadas.
- Busca de CEP e preenchimento manual continuam nos componentes existentes.
- Rodapé fixo com Cancelar e Salvar cliente, sem quebra do texto.
- Os inputs recebem associação local entre labels e campos no modo rápido.
- O serviço, payload e retorno pelo `afterClosed` permanecem os mesmos.
  Pedido novo confirma a seleção sem gravar o pedido antecipadamente;
  pedido existente continua exigindo confirmação real da associação pelo serviço.
- O painel global mantém foco, animações, safe area e ajuste à visualViewport.

Aparência e comportamento com teclado virtual no dispositivo devem ser conferidos
manualmente; não foram realizados testes visuais ou screenshots.
