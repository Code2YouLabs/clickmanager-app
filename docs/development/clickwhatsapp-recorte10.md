# ClickWhatsApp — Recorte 10: revisão e compartilhamento comercial

## Comportamento

O compartilhamento de Pedido/Orçamento mantém revisão, geradores atuais, cópia e navegação. Com o direito empresarial desativado, a ação antiga de abrir WhatsApp é mantida. Com direito ativo e envio disponível, o botão **Enviar pelo ClickWhatsApp** usa a fila existente somente após clique final. Nenhuma abertura de tela envia.

Pausa, desconexão, quarentena e ausência de permissão integrada exibem motivo e escolha manual explícita quando autorizada comercialmente. Falha ao consultar disponibilidade continua desconhecida. Configurações e link ao histórico respeitam a projeção de permissão do backend. O telefone pode ser corrigido para o envio sem modificar Cliente. Texto longo recebe validação por bytes, sem truncamento. O status canônico do Pedido usa a tradução compartilhada.

## Componentes e caminhos

`components/compartilhamento-clickwhatsapp` centraliza escolha de canal, validação, resultado, aviso de duplicidade e recuperação. Usa o store de envio já existente, ConfirmDialog e MobileTotalBar. HTML, SCSS e TS estão separados.

| Caminho utilizado | Integração |
| --- | --- |
| Pedido canônico: revisão WhatsApp desktop/mobile | Componente na revisão existente, mesma edição/cópia |
| Orçamento canônico: revisão WhatsApp | Mesmo componente e gerador atual |
| Pedido legado: impressão WhatsApp e painel mobile do detalhe | Mesmas ações/preview; edição local no integrado |
| Orçamento legado: lista e detalhe | Desativado executa ação original; habilitado abre revisão pequena com componente comum |

Os endpoints vêm do owner: `/api/comercial/pedidos/{id}/clickwhatsapp`, `/api/orcamentos/{id}/clickwhatsapp` e `/api/pedidos/{id}/clickwhatsapp`. GET consulta disponibilidade; POST envia intenção; GET `/solicitacoes/{chave}` recupera; GET `/{mensagem}` acompanha. A identidade, autorização, vínculo e origem comercial são resolvidos no backend. A conexão retornada à tela é apenas precondição para evitar troca durante retry.

A revisão legado usa uma projeção antecipada em memória por 30 segundos, limitada à sessão, para preservar a abertura manual síncrona quando desativado. A tentativa integrada consulta novamente e o servidor revalida. Troca de documento/contexto cancela leituras pendentes. FormControls dos pais mantêm readonly após tentativa; mudanças responsivas não restauram indevidamente um editor vazio ou editável.

## Intenção e resultado

O store separa por documento dentro do ator/empresa e é limpo ao trocar identidade. A operação guarda chave, número, conteúdo, conexão e validade absoluta. Duplo clique é protegido. Perda de resposta mantém snapshot somente leitura; recuperar busca a mesma mensagem e retry repete o mesmo corpo. Conflito nunca renova a chave sozinho. Nova intenção ou manual após possível aceite exige confirmação com alerta de duplicidade; a anterior continua preservada.

Após 202: **Mensagem adicionada à fila**, fase real e confirmação. Atualização explícita consulta o owner. O link ao detalhe usa mensagem/conexão e só aparece para quem pode consultar o histórico existente, cuja API revalida o acesso. Não há polling novo, envio direto, retomada automática ou resolução artificial de INCERTA. Aceite não significa entrega nem muda status comercial.

O store é memória de sessão: reload completo perde a recuperação local, mas não os registros persistidos. Consultar histórico antes de reenviar. O app atualizado requer backend deste recorte e migration 150.

## Testes e revisão visual

68 testes focados aprovados: componente/revisão, ClickWhatsApp, revisões canônicas desktop/mobile, rotas e Orçamento legado. Cobrem estados desativado/disponível/indisponível, permissão, erro de consulta, duplo clique, perda de resposta, isolamento, recuperação, aviso após aceite, texto longo, número inválido e restauração responsiva da intenção. Fixtures HTTP e dependências dos testes anteriores foram adaptadas preservando as expectativas comerciais existentes.

Build de produção aprovado com `npm run build -- --output-path=/private/tmp/cw-r10-prod`. Na execução final, limite de memória Node 6144 MB e `NG_BUILD_MAX_WORKERS=2`; uma execução anterior encerrou abruptamente. Warnings preexistentes de Sass, CommonJS e tamanho de bundle permanecem. `git diff --check` aprovado.

Chrome com APIs interceptadas e dados fictícios em 1440, 1024, 820, 390 e 360 px: Pedido desativado/disponível/pausado/erro/enfileirado e Orçamento, sem overflow horizontal. Foram 5 POSTs falsos. A revisão visual cobriu os caminhos canônicos; a homologação real dos caminhos canônicos e legados permanece para rodada autorizada.

Backend: 127 testes distintos aprovados com PostgreSQL 14 descartável/fakes, build aprovado, migration 150 incremental aplicada apenas na fixture, reexecução e checksum verificados. O relatório detalhado de contratos, integridade, seleção de testes e limitações está em `clickmanager-backend/docs/development/clickwhatsapp-recorte10.md`. O master completo continua com a limitação histórica da 088; não foi homologado em banco vazio nesta entrega.

## Próxima rodada

Nenhum envio real, sessão/webhook, ambiente operacional, configuração de worker ou produção foi alterado. Homologar depois com Empresa, documentos e destinatário explicitamente de teste: modos manual/integrado, aceite único, recuperação, acompanhamento e confirmação real por ACK, verificando que Cliente e status comerciais permanecem intactos.

Próximo recorte: **automações de Pedidos**. Não foram implementados gatilhos comerciais neste recorte.

## Refinamento de apresentação — 18/11/2026

No compartilhamento de documentos, quando o botão integrado está presente, a ação Abrir no WhatsApp fica oculta (desktop/mobile). O compartilhamento manual continua como alternativa quando o integrado não está disponível; proteções de duplicidade e recuperação permanecem.

Telefone brasileiro reutiliza InputTelefoneComponent, mostrando DDD e máscara sem o DDI 55. O destino internacional é preservado/recomposto para o envio; editar o campo não altera o cadastro. Números de outro país já informados mantêm o campo internacional. O resumo do Pedido usa TelefonePipe com remoção de DDI brasileiro opcional; os demais consumidores mantêm o comportamento padrão. DDD 55 não é confundido com DDI e fixo/celular continuam aceitos.

Validação: 40 testes focados de compartilhamento/Pedido/Orçamento/pipe aprovados; TypeScript e build de desenvolvimento aprovados, com avisos Sass preexistentes. Navegador com APIs simuladas em 1440 e 390 px confirmou máscara, exclusividade dos botões e fallback manual, sem POST/PUT ou envio real. Evidências locais em clickwhatsapp-compartilhamento-telefone. git diff --check aprovado. Backend, cadastro, sessão, aviso de assinatura e produção não foram alterados.
