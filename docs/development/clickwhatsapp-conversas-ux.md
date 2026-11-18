# Experiência de conversas do ClickWhatsApp

## Base e auditoria

Branch feature/clickwhatsapp-conversas-ux, criada a partir de 7aa951c. O commit 60dedfc preserva os ajustes locais anteriores de mensagens, clientes, painel lateral e Visão geral.

A auditoria cobriu as rotas existentes de ClickWhatsApp, ClickWhatsAppPage, service HTTP, store de intenção pendente, envio, permissões, histórico, componentes de lista e detalhe e os consumidores de cadastro rápido.

O cadastro rápido existente é ClienteCreateDialogComponent com ClienteCreateFormComponent. O formulário preserva campos, validações, serviços e evento de criação. Nome e telefone continuam obrigatórios e os dados adicionais permanecem disponíveis. Pedidos da Gráfica e Orçamentos reutilizam esse formulário. O seletor de clientes existente usa a API Clientes. O cadastro legado de pedidos mantém seu fluxo próprio.

## Componentes e apresentação

ConversasComponent concentra a experiência da rota atual de Mensagens. Reutiliza MessageWorkspaceComponent, PageCard, Material, InputTelefoneComponent, MobileFabAction, o painel lateral global, ConfirmDialog, Toastr e o serviço de envio existente.

O cabeçalho da página contém apenas a atualização por ícone com tooltip e nome acessível. A região esquerda reúne pesquisa, filtros por ícone e Nova mensagem. A ação Nova mensagem usa um FAB Material circular verde, localizado na região da lista em desktop e acima da navegação inferior em mobile. A consulta cancela respostas anteriores e aplica debounce de 350 ms. Pesquisa e filtros reiniciam a paginação. Ver mais acrescenta até 15 grupos, remove duplicatas pelo ID e conserva a seleção. Atualização manual preserva a conversa selecionada e mostra carregamento.

A região direita contém os envios reais do destinatário, alinhados à direita, e o compositor. As mensagens anteriores são carregadas em lotes de 30. A rolagem mantém a posição de leitura ao carregar anteriores e ao atualizar. Conteúdo expurgado usa Conteúdo indisponível. Dados e tentativas continuam acessíveis pelo menu de cada mensagem, no painel lateral. As ocorrências e investigações permanecem no card da Visão geral.

A aplicação apresenta os estados reais e suas confirmações. Não há bolhas de entrada ou nomes de interlocutores fictícios.

## Nova mensagem e cadastro

Nova mensagem troca temporariamente a região da lista pela escolha do destinatário, com pesquisa de clientes e telefone avulso. A seleção de cliente fica marcada e aguarda confirmação. Continuar abre o compositor somente com cliente de telefone válido ou número avulso válido. A máscara é a brasileira existente e a normalização acrescenta 55 internamente.

O atalho Novo cliente abre o próprio ClienteCreateDialogComponent pelo launcher compartilhado abrirCadastroRapido. A seleção está na lista, portanto há apenas um painel lateral de cadastro. Cancelar preserva a pesquisa. Concluir retorna o cliente criado à lista, já selecionado, para confirmar em Continuar.

O launcher também é usado por ComercialEditorComponent e pelos formulários de Orçamento que já consumiam o cadastro rápido. O retorno, a aplicação do cliente e as regras comerciais dos consumidores permanecem os existentes. A apresentação desktop agora usa o mesmo painel lateral.

O modelo atual tem um único telefone por cliente. Cadastros sem telefone válido são recusados com indicação de atualização no fluxo existente de Clientes. Não há associação automática por telefone parcial.

## Envio e sessão

O compositor emite a intenção para ClickWhatsAppPage, que executa o mesmo método enviar usado pelo envio avulso anterior. Idempotency-Key, validade, corpo congelado, recuperação após perda de resposta, store em memória e verificações empresariais permanecem nesse método e no backend.

Depois de HTTP 202, o feedback é Mensagem adicionada à fila. A entrega depende das confirmações reais. Enter mantém a nova linha do textarea. O botão envia a mensagem e evita a convenção de Enter que poderia provocar envio acidental.

Trocar usuário ou empresa cancela as consultas e destrói o conteúdo da página através do contexto autenticado existente. Uma intenção pendente conserva corpo e chave e só pode ser repetida conforme as regras originais. Descartar a intenção local exige confirmação, com aviso de possível duplicidade. O rascunho não é escrito em localStorage.

## Desktop e mobile

Desktop tem duas regiões, com rolagem independente. Mobile alterna lista, conversa e escolha do destinatário. Abrir a conversa posiciona a região de mensagens abaixo do header mobile, deixando o compositor acessível. A altura usa dvh e o rodapé respeita safe area. O cadastro usa o painel lateral existente.

A redução de viewport simula o espaço disponível com teclado, mas não substitui teste físico de teclado Android e iOS.

## Aviso de assinatura

Nenhum componente, serviço, estilo, integração ou regra do aviso de validade foi alterado. O layout da página usa seu espaço existente abaixo do aviso. A conferência visual compara texto, posição, dimensões e estilo do aviso antes e depois de navegar dentro da experiência.

## Validação

A regressão com os consumidores compartilhados passou em 213 testes de frontend. A seleção final focada em ClickWhatsApp passou em 42 testes após os ajustes de rolagem. A compilação de produção passou, com os avisos preexistentes de dependências, imports e Sass.

Os cenários cobrem pesquisa, debounce, cancelamento de respostas antigas, filtros, Ver mais, preservação de seleção, destinatário, máscara, validação, cadastro lateral, cancelamento, retorno do cadastro, corpo e chave idempotentes após perda de resposta, estados, expurgo e os fluxos compartilhados de Pedidos e Orçamentos.

As evidências visuais locais usam dados fictícios nas larguras 1440, 1024, 820, 390 e 360, com lista, conversa, compositor, telefone e cadastro. A API é interceptada no navegador. Nenhuma mensagem real foi enviada e nenhuma chamada remota à Evolution foi executada.

## Limites

A experiência contém somente envios. Mensagens recebidas, mídias, grupos, atendimento e novas automações continuam fora do recorte. A navegação não declara entrega a partir do aceite.

O backend acrescenta os endpoints de conversas e as migrations 153 e 154. A 154 corrige a projeção anterior por telefone, preservando o histórico original. O custo da primeira indexação retroativa deve ser medido em bases grandes. O histórico anterior permanece compatível e a pesquisa não persiste telefones em claro.

A conferência final também exercitou pesquisa sem resultados, filtros em painel lateral, permissões restritas e salvamento do cadastro pela API simulada, com retorno ao compositor em desktop e mobile. A validação estática TypeScript passou após a remoção dos imports e controles que ficaram sem uso.

As imagens estão em /Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-conversas. Os nomes lista, conversa, filtros, pesquisa-vazia, destinatario, compositor, cadastro e retorno-cadastro identificam os cenários. O número no final do arquivo é a largura do viewport. As imagens de teclado-reduzido usam viewport reduzido, sem alegar teste físico de teclado.


## Correção de clientes com telefone compartilhado

A seleção e a atualização de conversas usam clienteId quando o destinatário foi escolhido no cadastro. A busca de conversa específica envia clienteId ao backend e restringe ao cliente autenticado. Para telefone avulso, avulsa=true impede abrir a conversa de um cliente que usa aquele número.

A regressão do compositor verifica dois clientes no mesmo telefone e a abertura de uma nova conversa avulsa separada. O índice anterior é reconstruído pelo backend após aplicar a migration 154. Histórico antigo sem cliente registrado continua associado ao telefone até existir uma identificação confiável.

A correção passou em 43 testes de ClickWhatsApp e no build de produção. A validação visual em 1440 e 390 px reproduziu dois clientes fictícios com o mesmo telefone e comprovou que a lista e a área de mensagens permanecem separadas, inclusive ao selecionar o cliente por Nova mensagem. As evidências cliente-a-mesmo-telefone e cliente-b-mesmo-telefone estão na pasta visual já indicada.


## Refinamento da seleção de destinatário

O cabeçalho da lista fica dedicado à pesquisa e ao filtro. A ação textual Nova mensagem foi substituída por um único FAB verde circular com nome acessível e tooltip. O componente de FAB compartilhado dos demais módulos permanece com seu comportamento existente.

A seleção apresenta busca no topo, ações secundárias Novo cliente e Informar número, lista de clientes e um rodapé de confirmação. Clicar em um cliente marca a linha e mostra nome e telefone associados no resumo, sem abrir o compositor. Alterar a pesquisa limpa a seleção anterior imediatamente.

O campo de telefone aparece somente no modo manual ou se o cliente escolhido não tem telefone válido. Para cliente já cadastrado nessa situação, a ação explícita Salvar telefone e continuar usa a API de edição existente após consultar os dados atuais, preservando nome, e-mail, documento e endereço. A opção exige CLIENTE_EDITAR. Sem essa permissão, a interface informa o motivo e mantém disponível a opção de número avulso. As regras de autorização do backend permanecem as existentes.

A confirmação fica desabilitada enquanto falta um destinatário válido ou durante o salvamento. O cadastro rápido retorna o cliente ao mesmo passo de confirmação. No mobile, a região é posicionada abaixo do header e o rodapé com a ação permanece acessível, com rolagem na lista. O agrupamento por cliente, a idempotência e o registro de envio continuam nos contratos anteriores.

O refinamento passou em 46 testes focados de ClickWhatsApp e no build de produção. A conferência visual usou 1440, 1024, 820, 390 e 360 px, verificando FAB único, seleção marcada, ausência inicial do input de telefone, modo manual, edição autorizada de telefone ausente e confirmação antes de abrir o compositor. No mobile, foi verificada a posição do CTA acima da navegação inferior. Todas as requisições dessas conferências usaram respostas fictícias interceptadas, inclusive a edição do cliente.

As prévias estão em /Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-destinatario-ux. Nenhuma mensagem real foi enviada e nenhum cadastro real foi alterado durante a validação.

## Confirmações por ícone — 18/11/2026

Lista de conversas e rodapé dos balões usam MessageStatusComponent, reutilizável. Remove os rótulos visíveis Aceita/Entregue/Lida dessas duas posições, mantendo data, tooltip focável, descrição acessível e detalhes completos no menu Dados da mensagem.

Mapeamento: relógio para pendência ou aceite apenas do provedor; um check cinza para confirmação do servidor; dois checks cinza para ENTREGUE; dois checks azuis para LIDA. Não confunde aceite HTTP/Evolution com confirmação do servidor WhatsApp. Falha, expiração, cancelamento e resultado incerto conservam ícones próprios, sem apresentar check de sucesso artificial. Sem mudanças nos contratos, correlação, estados do backend ou histórico operacional.

Verificação: suíte ClickWhatsApp e componente de ícones aprovada (131 testes antes do cenário adicional de integração); teste adicional cobre lista/balão sem texto visível, mantendo aria-label. TypeScript e build de desenvolvimento conferidos. Sem alteração de assinatura, estilos globais, sessão ou produção; nenhum envio real.

Resultado final: 131 testes da suíte completa aprovados; rodada adicional de Conversas + MessageStatus com o cenário novo aprovada (25 testes). Total de 132 cenários distintos aprovados. Build e TypeScript aprovados; git diff --check aprovado.
