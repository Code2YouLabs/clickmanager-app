# ClickWhatsApp no ClickManager

O recorte 7 foi desenvolvido no App a partir de `fddcb65` da branch
`feature/dashboard-previsao-entrega-pedido`. A referência de backend é o commit
`34e4d59b` do recorte 6, com a migration 148. A rota autenticada
`/page/clickwhatsapp` entra no menu compartilhado entre desktop e mobile. O
atalho leva à consulta de configuração, inclusive quando a empresa ainda
precisa habilitar o recurso.

`ClickWhatsAppPage` usa PageCard e SectionCard para situação da empresa,
conexão, resumo e histórico. O histórico usa DataTable no desktop e seu
template de itens no mobile. Filtros, envio e detalhe abrem no painel lateral
padrão em telas de até 760 px. O envio fica disponível pelo botão da página ou
pelo FAB mobile. O detalhe inclui a lista de tentativas em uma seção expansível.

A página projeta os quatro indicadores de permissão retornados por
`GET /configuracao`. Os interceptadores existentes cuidam da autenticação e do
acesso operacional, incluindo respostas 401 e 402. A página apresenta mensagens
sanitizadas para os demais erros. Após mudanças de direito ou conexão, recarrega a
configuração. Um `PREFERENCIA_CONFLITO` atualiza os dados e informa a alteração em
outra sessão. O PUT nunca é repetido automaticamente.

## Chamadas da página

Todas as rotas abaixo usam o prefixo `/api/clickwhatsapp` e o JWT empresarial.

| Método | Caminho | Uso |
| --- | --- | --- |
| GET | `/configuracao` | Direito, permissões, conexão, preferência e estado |
| PUT | `/direito` | Habilitar ou desabilitar. Desabilitar pede confirmação |
| POST | `/conexoes` | Registrar ou obter a conexão |
| POST | `/conexoes/{id}/provisionar` | Provisionar explicitamente |
| POST | `/conexoes/{id}/reconciliar` | Atualizar o estado no provedor |
| POST | `/conexoes/{id}/qr` | Abrir o QR por ação explícita |
| PUT | `/conexoes/{id}/preferencia` | Pausar ou retomar usando a versão recebida |
| POST | `/conexoes/{id}/desconectar` | Encerrar a sessão após confirmação |
| GET / POST | `/conexoes/{id}/webhook` | Consultar ou configurar. Endereço definido pelo backend |
| POST | `/conexoes/{id}/mensagens` | Registrar uma intenção por chave idempotente |
| GET | `/mensagens` | Consultar histórico paginado |
| GET | `/conexoes/{id}/mensagens/{mensagem}` | Consultar detalhe |
| GET | `/conexoes/{id}/mensagens/{mensagem}/tentativas` | Consultar tentativas |
| GET | `/resumo` | Consultar contagens no período e situação atual da fila |

O estado local vem na configuração. O service também tipa o endpoint separado
`GET /conexoes/{id}/estado`. Preferência, reconciliação e encerramento são ações
distintas. Em estado desconhecido, a tela oferece atualização explícita quando
`configurar` está ativo. O resumo mantém aceitas, entregues e lidas como contagens
cumulativas. Os filtros do histórico usam [início, fim) de até 93 dias, horário
de Brasília e página com até 20 itens.

## Envio, QR e dados transitórios

Antes da primeira solicitação de texto, a interface cria um UUID e calcula uma
validade de uma hora. Guarda chave, destinatário, texto e validade no diálogo
durante a operação. A repetição explícita após perda de resposta reutiliza os
quatro valores. O 202 exibe “Mensagem adicionada à fila”. Uma nova composição
aberta conscientemente inicia outra operação. Em caso de resposta incerta,
fechar o diálogo descarta a operação local. Abrir outra composição não recupera
essa chave. O histórico pode ser consultado para verificar a solicitação anterior
quando o usuário tiver essa permissão.

O QR PNG fica apenas no diálogo, que limpa a imagem e cancela a leitura ao fechar
ou trocar de usuário/empresa. Havendo validade, a imagem sai da tela ao expirar.
Um novo QR exige clique. O detalhe segue o mesmo ciclo de vida e mostra conteúdo
indisponível quando indicado pelo backend. A lista usa o destinatário mascarado
recebido da API. A interface de resultado INCERTA explica a situação e a
quarentena. A resolução operacional fica para uma entrega posterior.

## Lacunas do contrato para a interface

- `permissoes.configurar` cobre o consumo ativo. O backend permite certas ações
  de manutenção após revogação, mas a configuração não informa a permissão
  específica para pausar, reconciliar, consultar o webhook ou desconectar nesse
  caso. A tela usa o indicador disponível e oculta essas ações quando ele está
  desativado. O histórico usa `consultar` e segue disponível quando autorizado.
- O estado local não inclui a fase de registro da instância. A tela mantém
  “Provisionar conexão” como ação explícita e idempotente fora de ABERTA, sem
  inferir provisionamento a partir de DESCONHECIDO.
- Histórico não retorna total ou cursor. A navegação usa o tamanho da página
  recebida para disponibilizar a próxima consulta.

O trabalho ficou no App. A validação usa respostas fictícias para toda a API e
para o QR. A configuração de dispatcher e scheduler continua desligada
conforme a entrega do backend. A homologação real segue pendente.

## Validação

- Seleção final em Chrome Headless com 53 testes aprovados, incluindo ClickWhatsApp,
  projeção mobile, menu e DataTable. A seção de envio verifica a igualdade de
  chave, corpo e validade após perda de resposta e uma nova chave em nova
  composição.
- Build de produção com `npm run build` aprovado. Permanecem avisos do App
  sobre templates existentes, Sass e dependências CommonJS.
- Suíte ampla com 1.988 aprovações e 15 falhas em 2.003 testes. No snapshot
  `fddcb65`, 1.980 aprovações e 15 falhas em 1.995 testes. Quatorze casos
  coincidiram. O restante variou entre observações e cliente no editor mobile,
  ambos com NG0205 (injector já descartado). A diferença está registrada sem
  atribuir a falha ao recorte nem declarar equivalência completa entre as rodadas.
- Revisão do build em Chrome com API simulada em 1440, 1024, 820, 390 e 360 px.
  Foram exercitados histórico, filtros, envio, QR fictício, detalhe e tentativas.
  As telas de vazio e carregamento foram verificadas em 360 px. As medidas
  confirmaram que página e modais cabem na largura em todas as larguras testadas.
  A revisão foi feita com emulação de viewport e não em aparelhos físicos.

```bash
npm test -- --watch=false --browsers=ChromeHeadless \
  --include='src/app/pages/clickwhatsapp/*.spec.ts' \
  --include='src/app/layouts/full/mobile-navigation.spec.ts' \
  --include='src/app/layouts/full/vertical/sidebar/sidebar-menu.spec.ts' \
  --include='src/app/components/data-table/data-table.component.spec.ts'
npm run build
git diff --check
```
