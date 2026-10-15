# Passo 2 — duas linhas compactas no mobile

Continuação do commit `49ac586`, na branch `fix/mobile-catalogo-onboarding`. Este ajuste substitui a apresentação mobile descrita no [relatório anterior](mobile-catalogo-onboarding.md), preservando sua lógica de seleção e importação.

## Implementação

Até 768px, a etapa apresenta duas linhas de controles:

1. Título “Quais produtos você oferece?” à esquerda e botão “Filtros” à direita. O título pode quebrar em duas linhas; o botão não encolhe e indica quantos filtros estão ativos.
2. Checkbox “Selecionar todos” à esquerda e alternância Árvore/Detalhada à direita. O checkbox preserva os estados marcado, desmarcado e indeterminado e a ação continua restrita aos resultados filtrados.

A descrição fica oculta apenas no mobile. Pesquisa e categoria usam `MatDialog`, com os mesmos campos/valores e o mesmo debounce de pesquisa já existentes. No código anterior não havia um modal de filtros; foi criado um template de diálogo reutilizando os campos, sem nova dependência. Os controles de seleção e visualização ficam fora do modal. “Concluir” fecha o diálogo; “Limpar filtros” limpa pesquisa e categoria, sem alterar a seleção. O Material mantém foco preso no diálogo e restaura o foco ao fechar.

A lista ocupa o restante do contêiner Flexbox e tem sua própria rolagem nos dois modos. No mobile, não há mais uma segunda rolagem englobando título e filtros em alturas menores. O rodapé tem somente os dois botões, lado a lado, sem reservar espaço para contador. A largura mínima herdada do botão principal foi anulada somente no mobile, permitindo que o texto quebre sem sobreposição.

Foram removidos da apresentação do Passo 2, em todas as larguras: resumo numérico de selecionados junto da ação, hint numérico do rodapé, contagens numéricas das categorias, ajuda “A ação vale para os resultados da pesquisa e da categoria.” e texto “Etapa X de X”. Os contadores internos, mapas de estado, habilitação dos botões e estados dos checkboxes continuam intactos. O indicador visual das três etapas permanece.

## Desktop

As novas regras de disposição são limitadas a `max-width: 768px`. O desktop mantém descrição, pesquisa/categoria visíveis na página, controle de visualização na toolbar, ação em lote, logo, grid de produtos e rodapé existentes. O botão de modal e a linha compacta ficam ocultos. Não foram alterados os estilos base do desktop; o espaço liberado pelas remoções textuais é absorvido naturalmente pela lista.

Comparação visual realizada em 1366 × 900, com os mesmos 216 produtos sintéticos e seleção completa:

- [Antes — commit 49ac586](screenshots/mobile-catalogo-onboarding/depois-detalhada-1366x900.jpg).
- [Depois](screenshots/mobile-catalogo-controles/detalhada-1366x900.jpg).

Também foram validados 1440 × 900 e ambos os modos. Os componentes, larguras e organização das linhas desktop foram preservados; as diferenças verticais decorrem das remoções textuais solicitadas. Etapas 1 e 3, endpoints, processo de importação, SmartCalc e persistência não foram modificados.

## Arquivos alterados

- `src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.html`: título/botão de filtros e remoção do hint do rodapé.
- `src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.scss`: duas linhas, rodapé compacto e altura restante da lista apenas no mobile; ocultação do texto de etapa no Passo 2.
- `src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.html`: templates de campos e visualização reutilizados, modal, checkbox compacto e remoção dos resumos textuais.
- `src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.scss`: separação mobile/desktop, toque nos controles, modal e ocultação dos contadores das categorias.
- `src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.ts`: abertura/fechamento do diálogo, limpeza de filtros e indicação de filtros ativos. Nenhuma alteração nos métodos de seleção/importação.
- `src/app/pages/onboarding-v2/onboarding-flow.spec.ts`: adaptação às remoções e novos testes de modal, estado indeterminado, 1440px, preservação do desktop e ausência de sobreposição dos botões.
- Este relatório e `docs/screenshots/mobile-catalogo-controles/`.

## Validação visual

Prévia isolada dos componentes reais, com skin completa e serviços mockados. Nenhuma importação real foi executada. Os arquivos e a configuração temporária da prévia foram removidos antes da suíte/build finais. A emulação de viewport foi restaurada ao terminar.

| Viewport | Detalhada | Árvore expandida |
| --- | --- | --- |
| 360 × 800 | [Captura](screenshots/mobile-catalogo-controles/detalhada-360x800.jpg) | [Captura](screenshots/mobile-catalogo-controles/arvore-360x800.jpg) |
| 390 × 844 | [Captura](screenshots/mobile-catalogo-controles/detalhada-390x844.jpg) | [Captura](screenshots/mobile-catalogo-controles/arvore-390x844.jpg) |
| 430 × 932 | [Captura](screenshots/mobile-catalogo-controles/detalhada-430x932.jpg) | [Captura](screenshots/mobile-catalogo-controles/arvore-430x932.jpg) |
| 768 × 1024 | [Captura](screenshots/mobile-catalogo-controles/detalhada-768x1024.jpg) | [Captura](screenshots/mobile-catalogo-controles/arvore-768x1024.jpg) |
| 1366 × 900 | [Captura](screenshots/mobile-catalogo-controles/detalhada-1366x900.jpg) | [Captura](screenshots/mobile-catalogo-controles/arvore-1366x900.jpg) |
| 1440 × 900 | [Captura](screenshots/mobile-catalogo-controles/detalhada-1440x900.jpg) | [Captura](screenshots/mobile-catalogo-controles/arvore-1440x900.jpg) |
| 390 × 420, altura reduzida | [Captura](screenshots/mobile-catalogo-controles/detalhada-390x420.jpg) | [Captura](screenshots/mobile-catalogo-controles/arvore-390x420.jpg) |

Não houve overflow horizontal ou sobreposição dos botões nas 14 combinações. O rodapé permaneceu na viewport e separado da lista. Em 360 × 800, a lista tem aproximadamente 429px de altura (antes, 499px incluíam contexto e filtros na mesma área de rolagem); em 390 × 844, a lista passou de aproximadamente 163px para 473px. O rodapé em 360px passou de cerca de 150px para 77px. Os valores são evidências do layout observado, não dimensões fixas da implementação. [Medições](screenshots/mobile-catalogo-controles/validacao-viewports.json).

Também conferidos no navegador: [modal com labels sem corte](screenshots/mobile-catalogo-controles/modal-filtros-360x800.jpg), [dois filtros ativos](screenshots/mobile-catalogo-controles/filtros-ativos-360x800.jpg), combinação de pesquisa A5 + categoria Adesivos retornando seis itens e limpeza dos filtros. Árvore e Detalhada continuam compartilhando seleção e a expansão das categorias é preservada ao alternar modos.

## Testes e build

- Testes focados do fluxo e seletor: **35 aprovados**.
- Suíte final, `npm test -- --watch=false --browsers=ChromeHeadless`: **906 testes, 905 aprovados e uma falha preexistente**.
- `npm run build:prod`: **aprovado**, com avisos de dependências CommonJS já existentes.
- `git diff --check`: **aprovado**.

A falha já existente é `AppStatusGridComponent mantém navegação com filtro de status`: espera `/page/grafica/comercial-beta/orcamentos`, mas a aplicação usa `/page/grafica/comercial/orcamentos`. O commit anterior já apresentava essa mesma falha, com 902 testes aprovados de 903.

Os novos testes verificam o modal real do Material, pesquisa com debounce, combinação com categoria, indicador ativo, limpeza sem perder seleção, fechamento do diálogo, checkbox indeterminado e seleção/desmarcação completa. Os cenários responsivos verificam relações entre limites dos controles, viewport e rodapé; no desktop confirmam que toolbar/descrição permanecem visíveis e que os controles mobile ficam ocultos. Os testes anteriores de importação, pulo e recuperação do fluxo continuam passando.

Limitações: navegador Chrome com viewport emulada, sem teclado virtual físico de iOS/Android. Altura reduzida foi validada, mas não substitui esse teste. Importação e destinos posteriores foram cobertos com mocks nos testes; não houve envio ao backend.

Entrega em commit local, sem push, PR ou merge.
