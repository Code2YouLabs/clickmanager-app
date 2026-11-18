# ClickWhatsApp — ações explícitas de pausa e retomada

18/11/2026. Branch `fix/clickwhatsapp-preferencia-independente`.

O bloco Envio de mensagens substitui o toggle por Pausar envios (ícone pause) ou Retomar envios (play_arrow), conforme a preferência confirmada no servidor. Apresenta Envios pausados/liberados e estados específicos de recurso desativado ou quarentena. Texto explica que pausar não desconecta e que a escolha é preservada ao desativar/reativar o recurso. O compartilhamento utiliza a mesma nomenclatura.

Permissões do backend controlam a habilitação; ação em andamento desabilita o botão e o resultado só muda após confirmação/recarga. Mantém CAS, tratamento de conflito, isolamento e ausência de PUT automático na entrada da tela.

Backend passa a preservar a preferência, mas mantém cancelamento de pendências sem transmissão e invalidação da versão. Não há replay de mensagens antigas. Nova conexão começa pausada; preferências já pausadas no banco não são alteradas por esta entrega, pois não é possível distinguir uma pausa anterior automática de uma voluntária. Para essas instalações, escolher Retomar envios uma vez; os próximos ciclos preservarão a escolha.

Sem novas variáveis ou migration, mudança de identidade visual, sessão WhatsApp, dados reais ou produção. Relatório backend de mesmo nome detalha regra e compatibilidade.

Validação: 146 testes Angular aprovados (ClickWhatsApp/compartilhamento), 75 testes backend (empresariais PostgreSQL/arquitetura), builds development/package aprovados e git diff --check sem erros. Layout verificado com APIs simuladas em 1440/390 px, estados liberado/pausado; no mobile a ação fica abaixo da descrição para preservar o rótulo inteiro. Sem mutação real.
