# ClickWhatsApp — renovação da confirmação de conexão

A consulta técnica de conexão tem validade de 60 segundos no backend. Apenas ler configuração não renova essa observação. A tela passa a reconciliar pelo endpoint autenticado existente em intervalos de 30 segundos, quando a observação já tem 30 segundos ou é desconhecida. Requer direito ativo, ação reconciliar autorizada, instância provisionada, página visível e ausência de operação/modal concorrente.

A atualização usa a leitura do estado no provedor, sem provisionar, gerar QR, configurar webhook ou desconectar. O primeiro carregamento continua consultivo. O acompanhamento QR mantém limite próprio; ao fechar, só a observação técnica periódica pode continuar. Ao sair da página, o timer é encerrado. Não há sucesso presumido nem credenciais no navegador.

O backend também foi corrigido na mesma branch: automações podem renovar uma confirmação vencida antes do aceite sem depender da tela aberta. Pendências válidas aguardam confirmação; ocorrências já ignoradas não são reenviadas. A mensagem histórica de conexão não aberta usa descrição neutra; pendência de confirmação tem descrição específica.

Validação: 111 testes ClickWhatsApp aprovados com `npm test -- --watch=false --browsers=ChromeHeadless '--include=src/app/pages/clickwhatsapp/**/*.spec.ts'`, incluindo confirmação expirada, desconexão observada, limite de QR e ausência de provisionamento/QR/logout no acompanhamento. `git diff --check` aprovado. Nenhuma sessão real alterada ou mensagem enviada. Recarregar o frontend e reiniciar o backend pela IDE para usar a correção; homologação real permanece pendente.

Build de desenvolvimento aprovado: `NG_BUILD_MAX_WORKERS=2 npm run build -- --configuration development`. Avisos Sass nos estilos globais existentes; esses arquivos não foram alterados. A primeira execução restrita foi encerrada com código 134 sem diagnóstico; repetição com dois workers concluiu com sucesso.
