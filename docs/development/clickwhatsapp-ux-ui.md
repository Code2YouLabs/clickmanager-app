# ClickWhatsApp — quatro áreas de trabalho

A refatoração parte do commit `0371eca` do `clickmanager-app`, na branch `feature/clickwhatsapp-automacoes-pedidos-11`. A branch de entrega é `feature/clickwhatsapp-ux-ui`.

## Auditoria

A rota anterior concentrava o estado, as ações administrativas, as automações e as consultas em `ClickWhatsAppPage`. O sidebar em Presença Digital já oferece expansão para módulos com filhos. O menu Mais mobile é uma projeção da mesma configuração filtrada. As rotas da página mantêm o header compartilhado, e a posição do aviso de assinatura é definida pelo shell, antes do conteúdo da rota.

`PageCard`, `SectionCard`, `DataTable`, `MobileFabAction`, `ConfirmDialog`, formulários Material e o painel lateral compartilhado cobrem as necessidades da tela. O App já usa `ClickWhatsAppService` para configuração, conexão, QR, pausa, webhook, fila de envio, resumo, histórico, detalhe, tentativas e investigação. As automações consultam e salvam pelo contrato empresarial existente, com revisão, prévia demonstrativa e projeção de ativação. As ações de envio, manutenção, histórico e automação derivam das respostas do backend.

## Destinos

| Rota | Conteúdo |
| --- | --- |
| `/page/clickwhatsapp` | Situação do WhatsApp, preferência, resumo, ocorrências que exigem atenção e até cinco mensagens recentes. |
| `/page/clickwhatsapp/mensagens` | Histórico paginado, filtros, conteúdo, detalhe e tentativas. A alternância para Ocorrências usa a consulta e a investigação existentes. |
| `/page/clickwhatsapp/automacoes` | Lista compacta dos acontecimentos com total ativo calculado da resposta. Um único painel edita template, prévia e ativação. |
| `/page/clickwhatsapp/configuracoes` | Criação e provisionamento explícitos, QR, observação, pausa e retomada. Administração e webhook recolhível em seções distintas. |

A Visão geral usa os sete indicadores do backend, com período Hoje, 7 dias, 30 dias ou personalizado em horário de Brasília. O histórico recente consulta até cinco itens no limite de 93 dias permitido pela API, independentemente do período dos indicadores. Contagem de incidentes usa as mensagens incertas atuais. A lista completa de ocorrências inclui os registros resolvidos e pode ser aberta pelo link da Visão geral.

O status de configuração da conexão vem da observação do backend. O rótulo Preferência ativa descreve a preferência, enquanto o estado de processamento do dispatcher está fora do contrato de configuração. Os controles técnicos e as confirmações de desconexão e desabilitação continuam em Configurações.

A implementação reaproveita o componente de página e preserva o formulário de envio, o store de intenção da sessão e as validações de contexto. A divisão em rotas acrescenta a configuração de navegação e a proteção de saída do editor, sem novos componentes de transporte. A ação Salvar template conserva a ativação atual. Ativar e desativar usam o último texto salvo e pedem confirmação. Fechar, usar Escape ou navegar para outra rota com alterações no texto exige confirmar o descarte. A troca de Empresa ou usuário encerra o painel e limpa seu conteúdo.

O sidebar reutiliza o submenu e acompanha a rota ativa. No mobile as áreas aparecem no menu Mais, com o header existente. O botão Nova mensagem usa o FAB nas duas áreas operacionais e o cabeçalho no desktop. A tabela reutiliza o template de lista no mobile. Os indicadores ficam em duas colunas, e o editor lateral preenche a largura no mobile com largura limitada no desktop.

## Escopo de validação

Os contratos HTTP, controles do servidor, chave de idempotência e recuperação, QR transitório, política de INCERTA e mecanismo de automações são os do recorte anterior. As operações do provedor foram simuladas. O código do aviso de assinatura, seus estilos, seu serviço e a estrutura que o renderiza ficaram intactos.

- 137 testes focados passaram no Chrome Headless. A seleção abrange ClickWhatsApp, automações, compartilhamento de documentos, revisões comerciais, filtros e painel lateral, sidebar, navegação mobile e shell. A suíte completa do App ficou fora desta execução.
- O build Angular de produção e `git diff --check` passaram. Os avisos de Sass e dependências CommonJS permaneceram na saída do build. A primeira execução local de build e Karma encontrou restrições do sandbox. Os comandos foram repetidos com acesso à execução e portas locais.
- O Chrome usou APIs simuladas em 1440, 1024, 820, 390 e 360 px. Foram conferidos conexão aberta, ausência de conexão, resumo com dados e zerado, histórico, ocorrências, automações, painel de edição, configurações, QR demonstrativo, acesso restrito, carregamento e erro. As páginas não apresentaram overflow horizontal.
- A comparação do aviso na Visão geral usou o mesmo perfil e a mesma resposta de assinatura vencida na base e no build atualizado. Posição, tamanho e pixels da região do aviso coincidiram nas cinco larguras. As fontes externas ficaram bloqueadas nas duas versões durante a captura.
- Nenhum arquivo de assinatura, backend, configuração de ambiente ou contrato de API integra o diff.
- Na conferência do menu, Enter abriu Mensagens no desktop e o menu mobile destacou a Visão geral antes de navegar para Mensagens. No editor, uma alteração de texto bloqueou a ativação até o salvamento, e o fechamento apresentou a confirmação de descarte.
