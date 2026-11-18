# ClickWhatsApp — UX operacional do recorte 7.1

A tela em `/page/clickwhatsapp` usa `acoesPermitidas` do backend para exibir os comandos. Isso mantém a manutenção disponível aos operadores autorizados após revogação e bloqueia novo consumo. A matriz completa está em `docs/development/clickwhatsapp-recorte7-1.md` no repositório backend. O card de conexão usa `provisionamento.situacao` para distinguir registro local, preparação em curso, instância preparada e situação desconhecida. A conectividade continua usando o estado observado. Provisionamento, QR e reconciliação dependem de comando explícito.

## Recuperação do aceite HTTP

1. A confirmação gera uma chave e guarda conexão, número, texto e validade originais em memória antes da requisição.
2. HTTP 202 com identificador confirma o registro da intenção. Timeout ou resposta inconclusiva mantém a solicitação e permite repetir manualmente com a mesma chave, o mesmo corpo e a mesma validade. O histórico continua sendo a fonte dos estados da mensagem.
3. Ao fechar, o usuário pode continuar, fechar mantendo a solicitação ou confirmar o descarte. A opção **Ver solicitação** recupera o contexto enquanto a mesma empresa e o mesmo usuário permanecerem na sessão do App. Trocar empresa ou usuário e encerrar a sessão limpam esse contexto. Recarregar integralmente o navegador também perde esse estado em memória.
4. Conflito bloqueia nova repetição da chave na interface. A expiração impede repetir com a validade original. Uma rejeição definitiva da primeira tentativa encerra a operação local. Quando já houve resposta inconclusiva, uma rejeição posterior não prova que a primeira tentativa deixou de ser registrada. O descarte é explícito e avisa que o registro original pode existir.

A idempotência continua sendo aplicada pelo backend. O App apenas reapresenta a mesma intenção dentro do seu escopo original. O estado técnico `INCERTA` continua no histórico, sujeito à política existente do dispatcher, sem repetição pelo App. O aceite HTTP confirma entrada na fila, sem confirmar entrega.

## Verificação

- 58 testes focados passaram no Chrome Headless, incluindo as suítes de ClickWhatsApp, navegação mobile, menu lateral e tabela.
- `npm run build` passou.
- Chrome com API simulada e dados fictícios em 1440, 1024, 820, 390 e 360 px. Foram conferidos manutenção pós-revogação, estados de provisionamento, resposta de transporte perdida, painel de envio, fechamento com confirmação, recuperação e troca de contexto. Nas cinco larguras foi verificada ausência de overflow horizontal e igualdade do corpo e da chave da repetição. A troca de identidade com o App em memória também foi exercitada pelos testes Angular.
- A homologação integrada fica para o ambiente de teste preparado, com conta e destinatário de teste autorizados. A validação deste recorte não executou operações reais na Evolution ou no WhatsApp.

Na suíte Angular completa, o recorte teve 1.996 aprovações e 12 falhas. A base `28a8750`, reexecutada com a mesma configuração, teve 1.989 aprovações e 14 falhas. Onze falhas ocorreram nos mesmos testes. Nas duas execuções houve um `NG0205` (injetor já destruído), em EmailServidor na base e no resumo da Home no recorte. Os três testes do resumo da Home passaram ao rodar isoladamente. As duas falhas adicionais da base envolveram clipboard de Compartilhar Pedido.
