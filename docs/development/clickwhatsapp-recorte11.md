# ClickWhatsApp — Recorte 11: configuração de automações de Pedidos

## Uso e escopo

Na página **ClickWhatsApp → Automações de Pedidos → Configurar automações**, cada Empresa pode revisar a mensagem e ativar individualmente os acontecimentos suportados. Todas começam desativadas. Alterar o switch/template não salva: a ação de salvar exige confirmação. A prévia usa dados demonstrativos produzidos pelo backend e não envia.

Os acontecimentos disponíveis são criação, produção, pronto, entrega, previsão alterada e cancelamento. A descrição informa limitações de origem: Depósito não tem produção e saída física não é entrega; previsão posterior à criação é suportada no Pedido transversal. Rascunhos/orçamentos legados cancelados não são tratados como Pedidos cancelados. Não foram implementadas campanhas, lembretes, marketing ou automações de Orçamento.

A configuração usa manutenção CONFIGURAR (com a regra existente de proprietário); ativação também exige direito e ENVIAR. A seção é oferecida pela projeção `configurarAutomacoes`, independente de a conexão estar ABERTA. `podeAtivar` vem do backend. Desconectada, a seção continua acessível e explica que configuração ativa não significa envio operacional. Nenhuma ação liga worker, conecta WhatsApp ou retoma envios.

## Componentes e contratos

`pages/clickwhatsapp/automacoes/automacoes-pedido.component` tem HTML/SCSS/TS separados e usa SectionCard, formulários Material, ConfirmDialog, toast e traduções existentes. É integrado à página atual, sem rota paralela. Desktop apresenta edição/prévia lado a lado; tablet/mobile empilham. Hints têm altura dinâmica e a ação flutuante mobile de nova mensagem fica recolhida durante a configuração. Troca de ator/Empresa cancela leituras e limpa dados; respostas antigas não salvam em outro contexto.

- GET `/api/clickwhatsapp/automacoes/pedidos`: configurações, variáveis, prévias, disponibilidade de ativação e até vinte registros recentes da Empresa.
- PUT `/api/clickwhatsapp/automacoes/pedidos/{tipo}`: `{ativa,modelo,revisao}`; sem IDs de Empresa/ator/conexão ou destinatário no payload. Conflito orienta atualizar; não há retry automático de configuração.
- POST `/api/clickwhatsapp/automacoes/pedidos/previa`: renderização demonstrativa, sem efeito comercial ou de envio.

Variáveis: `{cliente_nome}`, `{pedido_numero}`, `{previsao_entrega}`. Expressões, acesso a objetos e chaves arbitrárias são rejeitados no servidor. Valores ausentes têm fallback. Limite de 2000 caracteres no modelo e validação adicional em bytes no servidor/fila; não há truncamento de conteúdo final.

O telefone e a origem comercial vêm dos owners no backend, sem editor de destinatário para automações. O worker usa a conexão empresarial autorizada e a fila já existente. A validade de ocorrência é de cinco minutos; ocorrências ignoradas não são retomadas ao reconectar. Falha transacional ao preparar a fila pode repetir a mesma intenção dentro dessa validade. Mensagens INCERTAS continuam protegidas pelas regras anteriores.

## Rastreabilidade e estados

A seção mostra origem, Pedido, tipo, instante, motivo e estado da ocorrência. Quando há mensagem, fase e confirmação são as reais do ClickWhatsApp. “Na fila” e “Sem confirmação” não significam entregue; aceite da Evolution também não é prova de entrega. Se o estado estiver indisponível, não se rotula uma mensagem enfileirada como ignorada. O link ao detalhe só aparece quando o usuário pode consultar o histórico, e a API revalida a autorização.

Não há polling adicional, envio ao abrir a página ou alteração de status de Pedido conforme o resultado do WhatsApp. O compartilhamento manual do recorte 10 permanece independente.

## Validação

76 testes distintos focados aprovados, incluindo oito novos de configuração: modo desconectado, padrões desativados, confirmação/cancelamento, payload sem autoridade empresarial, preview inválido, falta de permissão para ativar, troca de Empresa, conflito de revisão e estados de fila. A suíte de oito foi repetida após o último ajuste de rótulo. Regressões de compartilhamento canônico/legado e mobile permaneceram aprovadas.

Build de produção aprovado (`npm run build -- --output-path=/private/tmp/cw-r11-prod`, Node com memória 6144 MB e dois workers); warnings preexistentes de Sass, CommonJS e bundle permanecem. Diff-check aprovado.

Chrome com APIs estritamente simuladas em 1440, 1024, 820, 390 e 360 px: edição/prévia, desconexão, falta de autorização de envio, erro, seção ausente sem configuração e registros. Sem overflow, sem hint sobre a prévia e sem ação flutuante cobrindo os controles de configuração. Dez requests fictícios de prévia/configuração e nenhuma rota de envio.

Backend: 215 testes distintos selecionados aprovados e build aprovado. As três falhas das suítes arquiteturais globais foram reproduzidas sem diferenças na base f0e37ad9; não foram relaxadas. A migration 151 foi validada apenas em PostgreSQL descartável, sobre a cadeia anterior, incluindo reexecução/checksum. Bootstrap pelo master completo conserva a limitação histórica da 088.

## Homologação e limites

Requer backend compatível e migration `151-clickwhatsapp-pedido-automacao.yaml`. Não há variável nova; processamento depende das flags/revisão de despacho e worker existentes, sem alterações nesta entrega. A autorização do configurador é um grant persistido e revalidado; não há identidade fictícia de serviço. Salvar nova revisão ou desativar pode impedir despachos automáticos pendentes da revisão anterior, preservando resultados de chamadas já iniciadas.

Homologar posteriormente somente com Empresa, documentos e destinatários de teste explícitos. Revisar os contatos de cada Pedido antes de ativar: não existe redirecionamento global de destinatário. Começar com todas desativadas; ativar um evento; efetivar uma mudança comercial; conferir ocorrência única, mensagem e confirmação real. Verificar no-op, duas mudanças de previsão, falha/pausa e permissão revogada. Não reenviar INCERTA por tentativa.

Não foram alterados ambiente operacional, produção, sessões ou webhooks. Nenhuma mensagem real foi enviada. O relatório completo de auditoria, eventos, persistência, segurança, backup e roteiro está em `clickmanager-backend/docs/development/clickwhatsapp-recorte11.md`.

## Arquivos alterados neste repositório

```text
docs/development/clickwhatsapp-recorte11.md
src/app/pages/clickwhatsapp/automacoes/automacoes-pedido.component.html
src/app/pages/clickwhatsapp/automacoes/automacoes-pedido.component.scss
src/app/pages/clickwhatsapp/automacoes/automacoes-pedido.component.spec.ts
src/app/pages/clickwhatsapp/automacoes/automacoes-pedido.component.ts
src/app/pages/clickwhatsapp/clickwhatsapp.models.ts
src/app/pages/clickwhatsapp/clickwhatsapp.page.html
src/app/pages/clickwhatsapp/clickwhatsapp.page.ts
```
