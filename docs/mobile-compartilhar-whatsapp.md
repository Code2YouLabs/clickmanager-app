# Compartilhar Pedido pelo WhatsApp — mobile

## Diagnóstico

- Início na branch `feature/mobile-comercial-adicionar-item-painel`, HEAD `cd1ab3e`,
  árvore limpa. Commits anteriores preservados.
- PedidoComercialWhatsappPageComponent carrega o Pedido por buscarPedidoComercial.
  PageCard/SectionCard organizavam destinatário, InputTextarea e ações no fim.
  O FormControl é editável; o limite nativo de 4000 caracteres já existia.
- montarMensagemPedidoComercialWhatsApp gera o texto existente. copiar usa
  navigator.clipboard.writeText com mensagemControl.value e feedback atual.
  abrirWhatsApp normaliza o telefone por telefoneWhatsAppBR e atribui a URL wa.me
  existente a window.location.href, sincronamente no clique. Nada envia mensagem
  automaticamente; a revisão/envio externo continua com o usuário.
- Orçamentos possuem componente e gerador próprios, que não foram modificados.
- MobileTotalBar já gerencia barra fixa, âncora de navegação inferior, safe areas,
  visualViewport/teclado, scroll-padding e reserva que desconta o espaço inferior
  existente. Foi reutilizada, sem outro rodapé ou rotina de viewport na página.

## Apresentação e contratos

- PageCard utiliza o mesmo título e Voltar contextual à direita no mobile, sem
  duplicação no erro. Desktop conserva título, subtítulo, retorno e layout anteriores.
- O mobile substitui o SectionCard aninhado por duas seções leves: Destinatário e
  Mensagem. Nome é principal, telefone usa TelefonePipe apenas na apresentação e
  número do pedido é discreto; dados ausentes não recebem valores fictícios.
- O InputTextarea existente continua com o mesmo FormControl e maxlength=4000.
  O campo usa largura disponível, altura de 55dvh entre 12rem e 36rem e resize vertical.
  Sua rolagem própria atende textos longos; a página permanece com rolagem natural
  para cabeçalho/destinatário. Não há outra região central rolável ou cálculo manual
  da altura. Quebras, seleção, caracteres e sintaxe do WhatsApp permanecem texto.
- Nenhuma string gerada é cortada para caber: o limite nativo de edição anterior
  não trunca o valor carregado. Alternar mobile/desktop conserva o controle/texto.
- MobileTotalBar recebe `appearance=actions` opt-in: sem resumo de total, dois botões
  com largura igual, ícones opcionais e altura mínima de 44px compartilhada com a
  apresentação compacta (ver consolidação abaixo). As variantes default/compact
  continuam idênticas. Não há comportamento de WhatsApp dentro do componente global.
- A página configura expandable=false, actionType=button, reserveSpace=true,
  avoidKeyboard=true e bottomAnchorSelector=.mobile-bottom-nav. O form identificado
  permite reutilizar o tratamento de foco e rolagem da barra existente. A reserva
  desconta o padding inferior já fornecido pelo shell, sem um segundo padding fixo.
- Copiar é secundário; Abrir WhatsApp é primário. Ambos ficam acima da navegação ou
  do teclado conforme os mecanismos existentes. Ações ficam indisponíveis durante
  carregamento/erro; Copiar vazio é disabled, coerente com seu handler que já retorna.
  Telefone ausente continua passando pela mesma validação/feedback ao compartilhar,
  e Copiar permanece disponível quando há mensagem.
- Os handlers de carregamento, Copiar e Abrir WhatsApp, as URLs, o gerador, o template
  de mensagem e a navegação Voltar não foram modificados. Não há espera/Promise nova
  entre clique e abertura. Não há regeneração da mensagem em mudanças de viewport.
- O template/SCSS foram extraídos para arquivos próprios. O ramo desktop mantém
  o SectionCard, três blocos de contexto, 16 linhas e os botões originais no final.
- Loading/erro mobile têm mensagens acessíveis e retry existente, preservando Voltar.
  Nenhuma mudança no shell, navegação, painel Ações ou páginas PDF.

## Validação e limitações

- Rodada focada: **37 testes aprovados**, incluindo 10 cenários novos de apresentação,
  contrato genérico da barra, texto integral/editado, clipboard/sucesso/erro, abertura
  imediata pelo handler atual, destinatário, ausência de telefone, loading/retry,
  texto acima de 4000 caracteres, troca de viewport e desktop.
- Rodada de regressão: **136 testes aprovados**, incluindo Editor, barra compartilhada,
  PageCard/CardHeader, shell/navegação, calculadora de materiais e páginas PDF.
- Regressão adicional do SmartCalc: **36 testes aprovados**, preservando outro
  consumidor direto da barra e seus detalhes/ações anteriores.
- `npm run build:prod`: aprovado com os mesmos **38 avisos existentes**.
- `git diff --check`: aprovado. Nenhuma falha preexistente foi observada nessas rodadas.
- Não houve testes visuais, screenshots ou comparação de imagens. Teclado nativo,
  aparência e abertura real do aplicativo/WhatsApp Web continuam para validação manual.
  A abertura válida foi interceptada no teste para não navegar externamente; foram
  verificados chamada síncrona, controle editado e destinatário usados pelo handler.
- Limitação preexistente, mantida por escopo: telefoneWhatsAppBR normaliza dígitos,
  mas não faz validação estrita de comprimento/formato. O handler rejeita telefone
  ausente, sem que esta tarefa acrescente uma regra comercial/validação diferente.

## Arquivos

- `src/app/pages/grafica/comercial/pedido-comercial-whatsapp-page.component.ts`
- `src/app/pages/grafica/comercial/pedido-comercial-whatsapp-page.component.html` (extraído)
- `src/app/pages/grafica/comercial/pedido-comercial-whatsapp-page.component.scss` (extraído)
- `src/app/pages/grafica/comercial/pedido-comercial-whatsapp-mobile.spec.ts` (novo)
- `src/app/components/mobile-total-bar/mobile-total-bar.component.ts`
- `src/app/components/mobile-total-bar/mobile-total-bar.component.html`
- `src/app/components/mobile-total-bar/mobile-total-bar.component.scss`
- `src/app/components/mobile-total-bar/mobile-total-bar.component.spec.ts`
- `docs/mobile-compartilhar-whatsapp.md` (novo)

## Comandos executados

```sh
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/pages/grafica/comercial/pedido-comercial-whatsapp*.spec.ts' --include='src/app/components/mobile-total-bar/*.spec.ts'
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/pages/grafica/comercial/pedido-comercial-whatsapp*.spec.ts' --include='src/app/components/mobile-total-bar/*.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor-mobile.spec.ts' --include='src/app/pages/calculadora-materiais/calculadora-materiais.component.spec.ts' --include='src/app/components/pdf-document-page/*.spec.ts' --include='src/app/pages/grafica/comercial/pedido-comercial-impressao-page.component.spec.ts' --include='src/app/components/page-card/*.spec.ts' --include='src/app/components/card-header/*.spec.ts' --include='src/app/layouts/full/full.component.spec.ts'
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/pages/apps/smart-calc/smart-calc-mobile.component.spec.ts'
npm run build:prod
```

## Consolidação do rodapé compartilhado — 19/10/2026

- A investigação confirmou que WhatsApp já usava `MobileTotalBarComponent`, também
  usado em `smart-calc.component.html` e `comercial-editor.component.html`. Não havia
  uma segunda implementação de posicionamento fixo na página.
- A diferença vinha das medidas próprias de `appearance="actions"`. Os botões agora
  compartilham a mesma regra de altura mínima (44px), padding (8px 12px), raio (8px),
  tipografia e ausência de sombra do botão compacto do SmartCalc/Editor. Os valores
  desses consumidores foram preservados; somente a variante de ações muda.
- As duas ações usam flex com larguras iguais, `min-width: 0` e intervalo de 12px.
  Textos podem quebrar em telas estreitas, sem exigir rolagem horizontal.
- A superfície compacta existente conserva padding lateral com safe-area, reserva
  medida, acompanhamento do teclado e âncora `.mobile-bottom-nav`. O fallback de
  `bottomOffset` do WhatsApp passa a ser o mesmo do Editor (60px + safe-area); o shell
  continua prevalecendo pela variável CSS e pela medição da navegação real.
- Não foi necessário ampliar o contrato TypeScript nem criar componentes. Handlers,
  mensagem, validações, feedback e ramo desktop não foram alterados.
- Testes da página reforçam instância/reserva únicas, integração com o shell e
  ausência de duplicação ao alternar entre mobile e desktop.
- Validação desta consolidação: **116 testes aprovados** (WhatsApp, barra global,
  Editor Comercial, SmartCalc e shell); build de produção aprovado, com 38 avisos.
  `git diff --check` aprovado. Sem testes visuais ou screenshots.

```sh
npm test -- --configuration=application-theme --watch=false --browsers=ChromeHeadless --include='src/app/pages/grafica/comercial/pedido-comercial-whatsapp*.spec.ts' --include='src/app/components/mobile-total-bar/*.spec.ts' --include='src/app/pages/grafica/comercial/comercial-editor-mobile.spec.ts' --include='src/app/pages/apps/smart-calc/smart-calc-mobile.component.spec.ts' --include='src/app/layouts/full/full.component.spec.ts'
npm run build:prod
```
