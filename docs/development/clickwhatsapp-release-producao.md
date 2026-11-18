# ClickWhatsApp — branch de entrega

18/11/2026. Branch `release/clickwhatsapp-producao`, também criada no backend. São dois repositórios Git; uma branch de mesmo nome em cada um reúne toda a sequência sem misturar históricos entre repositórios.

App reúne 26 commits locais sobre develop, com origem funcional `de522dd`, incluindo ClickWhatsApp completo, compartilhamento e filtros de Pedidos. Todas as branches locais dessa sequência estão contidas no HEAD. Incorporados origin/develop `45c25c4` e origin/main `b852d3b` sem conflitos ou alteração das fontes Angular em relação à última branch. Históricos e branches antigos preservados.

CI: push automático do build continua restrito a main (mais workflow_dispatch já existente). Deploy agora exige sucesso e head_branch main; não basta executar manualmente o build de outra branch. Publicar a release não executa deploy. Não foi feito merge em develop/main nem alterado servidor.

Validação funcional preservada: 146 testes ClickWhatsApp/compartilhamento aprovados na última alteração, além dos relatórios anteriores dos componentes compartilhados/Pedidos. A consolidação não mudou código da aplicação. Executado build production real: `NG_BUILD_MAX_WORKERS=2 npm run build -- --configuration production`, aprovado com avisos existentes; diff --check aprovado. Não se afirma execução de todos os testes globais ou de pipelines remotos.

Sem .env local, credenciais, QR ou sessões adicionados. Outros trabalhos e worktrees do workspace preservados. Infraestrutura produtiva ainda precisa ser preparada a partir do Compose/Nginx reais do servidor; backend documenta a sequência em `docs/development/clickwhatsapp-release-producao.md`. Promover a main pode acionar build/deploy e migrations: aguardar a preparação de infra e backups antes disso.
