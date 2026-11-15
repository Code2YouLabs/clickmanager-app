# ClickWhatsApp — Ocorrências de envio incerto

A seção **Ocorrências** da tela `/page/clickwhatsapp` consulta tentativas que passaram por resultado incerto, inclusive depois de resolvidas. O painel exibe resultado, motivo, primeira chamada, evidência mais forte e decisões. **Investigar evidências** executa a reconciliação segura do backend e atualiza os dados da tela. Uma resposta 200 pode conservar `PERMANECE_INCERTA`.

A consulta usa CONSULTAR ou proprietário. Investigar exige proprietário, ou CONSULTAR e CONFIGURAR juntos. O backend confere aplicação, empresa, ator e conexão a cada chamada. O App usa `podeInvestigar` retornado pelo backend para a ação. As APIs complementam o histórico existente.

- GET `/api/clickwhatsapp/ocorrencias?pagina=0` lista metadados em páginas de 20.
- GET `/api/clickwhatsapp/conexoes/{id}/mensagens/{mensagem}/ocorrencia` consulta decisão, evidência e histórico.
- POST `/api/clickwhatsapp/conexoes/{id}/mensagens/{mensagem}/investigar`, sem body, solicita nova verificação.

A interface mantém a quarentena visível quando a mensagem segue INCERTA. O resultado usa um dos estados RESOLVIDA_COM_EVIDENCIA, PERMANECE_INCERTA, EVIDENCIA_CONTRADITORIA, SEM_TRANSMISSAO ou INVESTIGACAO_INDISPONIVEL. O painel não oferece ações para forçar confirmação ou reenviar.

62 testes focados passaram com HTTP simulado. O build de produção passou. Revisão no Chrome em 1440, 1024, 820, 390 e 360 px cobriu lista, ocorrência indeterminada e resultado resolvido, sem overflow horizontal. Foram reutilizados os componentes e o painel mobile existentes. A base do App é `2520aec` e a base do backend é `c37de7a3`. O backend atualizado e a migration 149 são necessários para as novas APIs. O relatório completo está em `docs/development/clickwhatsapp-recorte9.md` no repositório backend.
