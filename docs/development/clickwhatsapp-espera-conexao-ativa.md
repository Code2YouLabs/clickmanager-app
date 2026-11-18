# ClickWhatsApp — disponibilidade para fila e espera por conexão

18/11/2026. Branch `fix/clickwhatsapp-espera-conexao-ativa`.

O compartilhamento de documento trata `disponivel` como autorização para aceitar na fila. O backend pode devolver `disponivel=true` com `AGUARDANDO_CONEXAO` quando a instância está provisionada, os envios ativos e a conexão técnica não confirmada. A tela mantém Enviar pelo ClickWhatsApp e explica que a solicitação aguardará reconexão apenas dentro da validade. Não promete envio imediato/entrega nem abre o WhatsApp automaticamente.

ENVIOS_PAUSADOS continua bloqueando novas solicitações. A mensagem orienta a ativar **Envio de mensagens** nas configurações; conectar WhatsApp e habilitar o recurso são controles diferentes. Não se retomam envios automaticamente. Os toggles já refletem confirmação do backend. A descrição da preferência esclarece espera/pausa.

Ao recuperar foco ou retornar a uma aba visível, o componente compartilhado atualiza disponibilidade, sem POST automático, respeitando contexto empresarial, operação em andamento e solicitação já persistida. Backend continua revalidando autorização, vínculo, preferência, validade e idempotência no aceite/despacho. A funcionalidade é compartilhada pelos documentos que já utilizam esse componente.

Validação: 144 testes Angular de compartilhamento/ClickWhatsApp aprovados; novas regressões verificam opção integrada durante espera e atualização após foco sem envio automático. Build development e git diff --check aprovados. Backend: 115 testes aprovados com PostgreSQL descartável/EvolutionFake, incluindo fila/estado/isolamento/INCERTA e proibição de recuperar eventos criados pausados/desativados. Detalhes no relatório backend de mesmo nome.

Sem nova variável ou migration. Atualizar App e reiniciar backend na IDE para carregar a correção. A preferência local continua pausada e precisa ser retomada explicitamente pelo usuário. Não houve envio real, mudança de preferência/sessão/configuração, logout, pareamento ou produção. A homologação de entrega real permanece pendente.
