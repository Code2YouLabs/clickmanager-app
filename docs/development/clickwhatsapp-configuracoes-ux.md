# Configurações do ClickWhatsApp

## Base auditada

Branch do app `feature/clickwhatsapp-configuracoes-ux`, criada com árvore limpa a partir de `12baa2c`, da branch `feature/clickwhatsapp-automacoes-ux`. Backend auditado em `feature/clickwhatsapp-conversas-ux`, HEAD `6346a1f0`, com árvore limpa. O trabalho desta revisão está restrito ao frontend. Sem push ou merge.

A auditoria localizou `clickwhatsapp.routes.ts`, `ClickWhatsAppPage`, `ClickWhatsAppService`, os DTOs em `clickwhatsapp.models.ts`, o template anterior de QR, `openMobileSidePanel`, ConfirmDialog, o store de intenção de envio, ConversasComponent e AutomacoesPedidoComponent. As rotas existentes permitem consulta sem exigir uma concessão empresarial ativa no frontend. As ações são projetadas pelo backend.

Foram lidos, no backend, ClickWhatsAppService, AcessoClickWhatsApp, EmpresaClickWhatsAppAdapter, AutoativacaoClickWhatsApp, ModuloBootstrapService, SegmentoModuloService e os testes empresariais existentes. Os contratos atuais atendem à orquestração solicitada, dispensando evolução do backend ou migration.

## Estado inicial e autoridade

EmpresaClickWhatsAppAdapter consulta a concessão com `coalesce(e.ativo,false)` e retorna direito inativo quando não encontra registro. SegmentoModuloService não inclui CLICKWHATSAPP nos módulos padrão de Gráfica ou Depósito. O onboarding usa esse bootstrap. A criação de empresa não concede o recurso por segmento.

AutoativacaoClickWhatsApp, apesar do nome, valida uma alteração explícita. Exige a identidade autenticada, a mesma empresa/ator, proprietário atual, usuário ativo, empresa ativa e acesso operacional. A projeção de ações habilitarDireito/desabilitarDireito reflete essa política. A interface usa essas ações efetivas, sem derivar concessão de role ou TipoEmpresa.

O teste empresarial existente `proprietarioAutoativaSemModuloAnteriorENaoConcedeOutrosModulos` verifica a situação inicialmente inativa, ativação explícita, recusa a operador e ausência de chamadas ao provedor. `desabilitarPausaSemLogoutReativarNaoRessuscita` cobre a preservação da sessão e preferência pausada ao reativar. Esses testes foram auditados, não executados nesta revisão de frontend. Não foram criadas empresas ou modificadas concessões reais.

## Componentes e apresentação

ClickWhatsAppPage agora apresenta três blocos diretamente no PageCard, nesta ordem:

1. Ativar ClickWhatsApp, com switch confirmado pelo backend.
2. Seu WhatsApp, com estado, conexão, verificação e desconexão na mesma região.
3. Envio de mensagens, com preferência separada e versionada.

Removidos da interface comum os controles de instância, webhook, configurações avançadas e Administração do módulo. Os endpoints técnicos e contratos HTTP continuam disponíveis. A consulta de webhook não recebe URL, header ou segredo e sua configuração não aceita dados técnicos do navegador.

Estados apresentados pela conexão: Não configurado, Desconectado, Conectando, Conectado e Estado desconhecido. Instância preparada não é evidência de sessão aberta. Uma falha de consulta mostra estado desconhecido, preservando a observação anterior e sem convertê-la em desconexão. A data da última verificação aparece uma única vez na região da conexão.

AvisoDesativadoComponent é compartilhado dentro de ClickWhatsApp e aparece em Visão geral, Mensagens e Automações. O link para configurações depende da ação efetiva de habilitação. O histórico e as investigações mantêm seus contratos de consulta. Os consumos seguem as ações efetivas, e a página também exige direito e aplicação autorizada para iniciar envios ou o fluxo de conexão. Templates anteriores permanecem disponíveis conforme a manutenção autorizada.

Reutilizados PageCard, painel lateral global, BreakpointObserver com breakpoint de 760 px, ConfirmDialog, Material slide-toggle, botões, progress-bar, tooltip, Toastr e tratamentos de erro existentes. Os novos estilos têm encapsulamento local. Navegação inferior, estilos globais e aviso de assinatura não foram modificados.

## Contratos consumidos

| Operação | Contrato |
| --- | --- |
| Ler configuração e ações | GET `/api/clickwhatsapp/configuracao` |
| Habilitar/desabilitar | PUT `/api/clickwhatsapp/direito` com `habilitado` |
| Criar ou obter vínculo | POST `/api/clickwhatsapp/conexoes` sem IDs empresariais no body |
| Provisionar | POST `/api/clickwhatsapp/conexoes/{id}/provisionar` |
| Consultar preparação técnica | GET `/api/clickwhatsapp/conexoes/{id}/webhook` |
| Configurar preparação técnica | POST `/api/clickwhatsapp/conexoes/{id}/webhook` |
| Solicitar QR | POST `/api/clickwhatsapp/conexoes/{id}/qr` |
| Reconciliar estado | POST `/api/clickwhatsapp/conexoes/{id}/reconciliar` |
| Desconectar | POST `/api/clickwhatsapp/conexoes/{id}/desconectar` |
| Pausar/retomar | PUT `/api/clickwhatsapp/conexoes/{id}/preferencia` com `ativa` e `versao` |

O backend continua responsável pelo vínculo privado Empresa↔conexão, identidade, geração vigente, posse, permissões e locks remotos. O frontend usa exclusivamente o vínculo retornado pela configuração autenticada.

## Habilitação e preferência

Os switches usam `disableToggleValue` em provider local da página. Só refletem o estado confirmado após a mutação e a recarga de configuração. Carregamento bloqueia cliques repetidos. Erros preservam os valores anteriores.

Desabilitar usa confirmação compartilhada, explicando que novos envios serão interrompidos e que uma chamada iniciada pode concluir. Essa ação não chama logout, criação, provisionamento, QR ou preferência pelo frontend. O backend existente suspende pendências e pausa a preferência ao alterar o direito, inclusive na reativação. Ativar não encadeia conexão nem retoma envios.

Pausar/retomar usa a versão retornada pela configuração. Um 409 mostra erro amigável, recarrega o estado e não repete a mutação. Preferência ativa não equivale à disponibilidade operacional do dispatcher. Com concessão inativa, a página informa essa distinção.

## Conexão guiada

Conectar WhatsApp abre `openMobileSidePanel`, com 560 px no desktop e largura total no mobile. A abertura normal da rota faz apenas consultas. A preparação exige clique explícito.

O fluxo consulta novamente a configuração, valida direito/aplicação e usa as ações efetivas para cada passo. Se não houver vínculo, solicita criação e compara o ID retornado com o vínculo vigente da nova consulta. Provisiona somente se a situação confirmada for NAO_PROVISIONADA e a ação estiver autorizada. EM_ANDAMENTO e DESCONHECIDA exigem verificação, sem reprovisionamento automático. Após provisionar, consulta novamente antes de continuar.

Consulta o webhook antes de configurar. CONFIRMADO evita outra mutação. INCERTO interrompe a preparação. Se houver ausência/divergência conhecida, usa a configuração técnica somente quando autorizada, exigindo retorno CONFIRMADO. Nenhum QR é mostrado como integração pronta quando essa confirmação falha. Tentar novamente começa com consultas, preservando a avaliação do resultado incerto. Diagnóstico de preparação registra somente etapa categórica e status HTTP, sem body, IDs, URL, segredo ou QR.

O QR é solicitado somente após preparação confirmada. Pareamento é acompanhado por reconciliação real, com primeira consulta após pelo menos 5 segundos, demais após pelo menos 10 segundos e limite de 30 consultas automáticas. Não há sobreposição. Ao atingir o limite, a interface oferece verificação manual e não declara falha do provedor por duração de espera. Fechar painel, trocar identidade/empresa, sucesso e falhas impeditivas interrompem a reconciliação desse fluxo. A leitura geral de configuração, já existente na página, pode continuar a cada 30 segundos, sem reconciliação remota automática fora do painel.

ABERTA remove o QR, atualiza a configuração e mostra confirmação. JA_CONECTADA exige também configuração com observação ABERTA antes de apresentar sucesso. O rodapé permite concluir. A preparação não retoma preferência nem envia mensagens.

## QR, recuperação e desconexão

QR somente em memória da página e em imagem PNG data URI validada. Fechar, trocar identidade ou confirmar conexão limpa a imagem. Nenhum armazenamento, URL, log ou analytics recebe o QR.

A validade usa exclusivamente expiraEm, quando parseável. A presunção anterior de 90 segundos foi removida. Ao expirar, limpa a imagem e oferece Gerar novo QR por ação explícita. Sem validade informada não inventa expiração, e a reconciliação continua limitada. Gerar novo QR permanece disponível por ação explícita também enquanto o código é exibido, preservando a recuperação sem fechar o painel. Falhas recuperáveis mostram recuperação. Falhas de acesso ou preparação impeditiva interrompem o fluxo e orientam fechar/verificar.

Desconectar WhatsApp usa a confirmação compartilhada na região Seu WhatsApp. A mensagem informa a necessidade de conectar novamente. O backend existente encerra a sessão, e o frontend recarrega o estado real antes de apresentá-lo. Erro não antecipa sucesso. Direito, histórico, templates e preferência não são alterados pela interface. A ação fica oculta nos estados conhecidos FECHADA/AUSENTE.

401, 402, 403, 404, 409 e 503 continuam usando o mapeamento sanitizado existente. Reler a mesma observação antiga depois de uma falha não restaura o estado conectado. Uma nova observação ou reconciliação bem-sucedida pode confirmar novamente o estado. Timeout não vira confirmação de desconexão e não dispara retry automático de mutação.

## Verificação executada

Com Node 22.22.3, na raiz do app:

```sh
NODE_OPTIONS=--max-old-space-size=4096 NG_BUILD_MAX_WORKERS=1 node node_modules/@angular/cli/bin/ng.js test --watch=false --browsers=ChromeHeadless --include='src/app/pages/clickwhatsapp/**/*.spec.ts'
NODE_OPTIONS=--max-old-space-size=4096 NG_BUILD_MAX_WORKERS=1 node node_modules/@angular/cli/bin/ng.js build --configuration production --output-path=/private/tmp/cw-configuracoes-build-verificado
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
git diff --check
```

Resultado final da suíte focada e regressão do domínio: **89 testes aprovados**, incluindo 26 casos novos e os 63 existentes. Cobrem os três blocos e ausência de mutação na entrada, ações do proprietário/operador, falha e confirmação de direito, preservação da preferência, avisos nas três áreas, histórico autorizado e templates após desativar, criação/provisionamento encadeados, instância existente, preparação desconhecida, webhook confirmado/ausente/incerto/falha, QR válido/incompatível/expirado/sem validade, novo QR explícito, ABERTA, fechamento e troca de identidade, cancelamento e limite do acompanhamento, timeout sem falsa desconexão, erro de logout e conflito 409 de preferência.

Build de produção aprovado. Avisos de compilação permanecem em arquivos fora do escopo, incluindo imports/templates, Sass e dependências CommonJS. TypeScript e `git diff --check` aprovados.

As verificações usam HttpTestingController e painel Material real, sem Evolution ou backend reais. Os testes anteriores foram mantidos, atualizando expectativas de apresentação, pré-condições do fluxo guiado e o intervalo moderado de reconciliação.

## Evidências e limitações

A conferência visual usa Chromium, servidor estático temporário e APIs inteiramente simuladas. QR é gerado a partir de uma frase demonstrativa. Nenhuma imagem permite pareamento real.

Evidências em `/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-configuracoes-ux/`.

Conferidos 1440, 1024, 820, 390 e 360 px, incluindo página desativada, habilitada sem conexão, conectada, conectando, painel com QR fictício, expiração, sucesso, falha de preparação, estado desconhecido, pausa/retomada e operador. O teste de navegador compara texto, posição, dimensões, fonte, padding e fundo do aviso de assinatura antes e depois do fluxo em cada largura. Sem diferença e sem overflow horizontal. O painel ocupa 560 px no desktop e toda a largura em mobile. Avisos nas demais páginas também foram conferidos. `verificacoes.json` registra as chamadas simuladas e a ausência de rotas inesperadas.

- [Configurações desktop](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-configuracoes-ux/desativado-1440.png).
- [Configurações conectadas no mobile](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-configuracoes-ux/conectado-390.png).
- [Confirmação no painel lateral](/Users/leonardo.barros/.codex/visualizations/2026/11/13/01a1d560-ecfa-7a73-88ba-690ea8e9ba4e/clickwhatsapp-configuracoes-ux/sucesso-1440.png).

O teste físico de teclado e leitura de QR em Android/iOS e a homologação contra backend/provedor reais permanecem fora desta validação com mocks. Não houve alteração de infraestrutura, `.env` operacional, migrations ou concessões existentes.

## Preservação expressa

Aviso de assinatura intacto. Nenhum envio real. Nenhuma chamada remota à Evolution. Nenhum QR real. Nenhum logout real. Nenhuma alteração de segredo. Nenhuma ativação de worker. Nenhuma alteração de regras comerciais, motor de envio, política de INCERTA, automações, templates ou cobrança.
