# Documentos PDF mobile — apresentação compartilhada

## Diagnóstico

- Início na branch `feature/mobile-comercial-adicionar-item-painel`, HEAD `a2558ab`,
  árvore limpa. Commits mobile anteriores preservados.
- As três rotas de Impressão, Duas vias e Etiqueta já usam
  PedidoComercialImpressaoPageComponent. A configuração de rota fornece `formato`
  completo / duas-vias / etiqueta; guards e permissões permanecem em pages.routes.ts.
- A página carrega o Pedido e chama gerarImpressaoPedidoComercial(id, formato).
  Recebe Blob, cria object URL e SafeResourceUrl. Salvar PDF usa o mesmo Blob,
  nomeArquivo e download por anchor; Imprimir usa contentWindow.focus/print do iframe.
- Não havia um componente compartilhado de apresentação de PDF. O visualizador é
  um iframe com implementação nativa do navegador, sem biblioteca PDF no frontend.
  O código anterior não diferencia Android/iOS nem informa suporte inline.

## Composição

- Novo PdfDocumentPageComponent, genérico e sem regras comerciais: recebe título,
  subtítulo, backLink, loading/erro, disponibilidade de PDF/ações, label do viewer e
  possibilidade de retry; emite Salvar, Imprimir e Tentar novamente.
- PageCard/CardHeader continuam responsáveis pela superfície/cabeçalho. O proprietário
  projeta o iframe com a URL segura e conserva ViewChild, handlers, serviços, nomes,
  parâmetros e liberação de URLs. Nenhum template de PDF ou serviço foi alterado.
- As três rotas utilizam a mesma composição com seus títulos/documentos reais.
  Orçamentos, WhatsApp e outras páginas não foram migrados.
- Mobile até 760px: título e um Voltar contextual à direita. As duas ações saem do
  cabeçalho e ficam lado a lado no conteúdo; Salvar PDF outline e Imprimir primário,
  larguras equilibradas, texto sem quebra e área de toque mínima de 44px.
- Desktop conserva títulos/subtítulos, ações e Voltar no header, variantes dos
  botões, estilos e altura anteriores. Os estilos antigos foram movidos para a
  composição; o iframe projetado conserva dimensões e parâmetros. A mudança mobile
  não altera os contratos globais de PageCard ou do shell.
- A área do PDF utiliza a posição real do viewer, altura da visualViewport/viewport,
  a variável herdada de altura da navegação inferior e safe area. ResizeObserver e
  resize atualizam as variáveis CSS por requestAnimationFrame; não há medidas de
  telefone nem manipulação do shell. Listeners/observer/frame pendente são removidos
  na destruição. Não há polling, listener de scroll ou acesso ao DOM interno do PDF.
- Sai o mínimo mobile fixo de 560px. O viewer aproveita o espaço restante e mantém
  piso relativo de 40dvh para pouca altura; nesse caso a página pode rolar naturalmente
  com a reserva inferior existente do shell. Estados longos têm rolagem acessível.
  O iframe mobile deixa de impor `scrolling=no`; desktop mantém o atributo anterior.

## Visualizador nativo, fallback e estados

- Barra nativa preservada. HTML iframe não oferece um contrato comum para controlar
  a barra de diferentes viewers. Não há CSS sobre conteúdo interno, ocultação por
  hacks, alteração dos parâmetros existentes da URL ou dependência nova.
- Segundo [MDN — iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe),
  PDFs podem ser apresentados pelo viewer integrado do navegador. A documentação
  não fornece uma API universal de toolbar; a decisão é manter os controles nativos.
- [Navigator.pdfViewerEnabled](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/pdfViewerEnabled)
  informa suporte declarado à navegação inline de PDFs; não comprova que um iframe
  específico funcionará. Quando retorna false no mobile, a composição mostra mensagem
  e mantém Salvar PDF disponível; Imprimir fica desabilitado sem frame. Quando a API
  está ausente, tenta o viewer. Uma orientação curta mantém o download visível como
  alternativa mesmo em navegadores que declaram suporte, mas falham no embedding.
- Não se conclui sucesso de renderização com iframe.load nem se mantém spinner
  indefinido aguardando o viewer. Loading representa a obtenção/geração do Blob,
  encerrada pelos handlers atuais. Erro usa role=alert e retry existentes; loading e
  indisponibilidade usam role=status, e a região do viewer tem nome acessível.
- Resposta sem Blob ou com Blob vazio não cria iframe aparentemente carregado.
  Voltar permanece no cabeçalho mobile, sem repetição no erro. Download e impressão
  só executam por ação explícita; não são disparados ao carregar.
- ChromeHeadless não equivale a Android/iPhone, tampouco comprova impressão física,
  download/abertura nativos ou o comportamento de viewers de cada plataforma.
  Esses pontos permanecem para validação manual. Sem testes visuais, screenshots ou
  comparação de imagens. O PDF gerado não foi modificado.

## Verificação

- **18 testes novos aprovados** na rodada focada: composição/ações/estados, fallback,
  identificação do viewer, cálculo do offset externo, limpeza dos listeners,
  três formatos/nomes/bytes, URL segura, impressão por handler sem imprimir de fato,
  download sem iniciar transferência real, retry, autorização, Blob ausente/vazio,
  ID inválido, liberação de URL e desktop.
- **95 testes aprovados na regressão final**, incluindo os 18 novos, PageCard,
  CardHeader, formulário, integração com filtros, shell global/navegação e ações
  do pedido. Nenhuma falha preexistente foi observada nesta rodada.
- `npm run build:prod`: aprovado, com os mesmos **38 avisos existentes**.
- `git diff --check`: aprovado.

Comandos:

```sh
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/components/pdf-document-page/*.spec.ts' --include='src/app/pages/grafica/comercial/pedido-comercial-impressao-page.component.spec.ts'
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/components/pdf-document-page/*.spec.ts' --include='src/app/pages/grafica/comercial/pedido-comercial-impressao-page.component.spec.ts' --include='src/app/components/page-card/*.spec.ts' --include='src/app/components/card-header/*.spec.ts' --include='src/app/layouts/full/full.component.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor-acoes-painel-mobile.spec.ts'
npm run build:prod
```

## Arquivos

- `src/app/components/pdf-document-page/pdf-document-page.component.ts` (novo)
- `src/app/components/pdf-document-page/pdf-document-page.component.html` (novo)
- `src/app/components/pdf-document-page/pdf-document-page.component.scss` (novo)
- `src/app/components/pdf-document-page/pdf-document-page.component.spec.ts` (novo)
- `src/app/pages/grafica/comercial/pedido-comercial-impressao-page.component.ts`
- `src/app/pages/grafica/comercial/pedido-comercial-impressao-page.component.html` (extraído)
- `src/app/pages/grafica/comercial/pedido-comercial-impressao-page.component.scss` (extraído)
- `src/app/pages/grafica/comercial/pedido-comercial-impressao-page.component.spec.ts` (novo)
- `docs/mobile-documentos-pdf.md` (novo)
