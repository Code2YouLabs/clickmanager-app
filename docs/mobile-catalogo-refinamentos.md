# Passo 2 — cabeçalho restaurado e três linhas mobile

Continuação na branch `fix/mobile-catalogo-onboarding`. A inversão dos botões solicitada antes deste ajuste foi preservada: ação secundária à esquerda, principal à direita. Este relatório atualiza a apresentação descrita em [mobile-catalogo-controles.md](mobile-catalogo-controles.md).

## Desktop: restauração pelo histórico

Consultados os commits `2b96957` e `b558ccc`, anteriores aos ajustes mobile. O cabeçalho semântico original usa logo de 156px, marcadores de 28px, fonte de 14px, alinhamento central em linha, gap de 24px, padding superior de 16px e inferior de 24px e bloco de passos com máximo de 600px.

As regras do Passo 2 que compactavam o cabeçalho e escondiam o logo por altura de viewport foram removidas. Isso corrige também desktop com menos de 840px de altura, antes atingido pela adaptação mobile. Foram restauradas as proporções e a altura original do cabeçalho, mantendo o contêiner limitado e a rolagem já implementados no conteúdo.

“Etapa X de X” permanece invisível e fora da árvore de acessibilidade. No desktop, seu espaço original é preservado para manter a posição do logo e dos três passos; no mobile, esse espaço é inteiramente eliminado. Não foi realizado revert do conteúdo, filtros, seleção ou importação.

Uma prévia temporária da página histórica de `b558ccc`, com serviços mockados, permitiu comparar o cabeçalho original e o restaurado no mesmo navegador e com a mesma skin. As propriedades acima e a altura medida de aproximadamente 99,34px coincidiram em 1366 × 768 e 1440 × 900. O contêiner atual da página foi mantido, portanto a comparação trata do cabeçalho, não de um retorno integral da página histórica.

| Referência | Original | Restaurado |
| --- | --- | --- |
| 1366 × 768 | [Cabeçalho](screenshots/mobile-catalogo-refinamentos/cabecalho-original-1366x768.jpg) | [Cabeçalho](screenshots/mobile-catalogo-refinamentos/cabecalho-restaurado-1366x768.jpg) |
| 1440 × 900 | [Cabeçalho](screenshots/mobile-catalogo-refinamentos/cabecalho-original-1440x900.jpg) | [Cabeçalho](screenshots/mobile-catalogo-refinamentos/cabecalho-restaurado-1440x900.jpg) |

[Medições comparativas](screenshots/mobile-catalogo-refinamentos/comparacao-cabecalhos.json). As capturas históricas são referência do cabeçalho; o texto de etapa visível nelas não foi reintroduzido na interface atual.

## Mobile

Aplicação até 768px de largura e também em paisagem até 960px de largura quando a altura é de até 560px. Assim, 800 × 360 recebe a apresentação mobile sem afetar desktop em 1366/1440px.

- **Cabeçalho:** os três passos ficam em uma faixa, com marcadores de 20px, textos de 12px e espaçamentos reduzidos. A etapa atual mantém seu destaque. Em 360 × 800, a faixa mede cerca de 29px.
- **Linha 1:** apenas “Quais produtos você oferece?”, em 18px/28px e sem quebra. O título tem toda a largura disponível; o texto e o tamanho no desktop não foram alterados.
- **Linha 2:** Filtros à esquerda, com indicação de filtros ativos, e Árvore/Detalhada à direita. Os controles mantêm altura mínima de toque de 44px e ficam fora do modal.
- **Linha 3:** botão Selecionar todos, de largura total, altura mínima de 44px, peso 600 e fundo da variável `--mat-sys-primary-container`. Ícone e `aria-pressed` distinguem seleção vazia, parcial (`mixed`) e completa.
- **Lista:** usa o restante da altura e mantém rolagem própria nos dois modos. Nenhuma altura fixa foi imposta à lista.
- **Rodapé:** Pular à esquerda e Preparar meu catálogo à direita. A coluna secundária usa somente o espaço necessário, liberando largura para manter o CTA em uma linha. O rodapé mede cerca de 53px em 360 × 800. Em paisagem, foram reduzidos apenas padding e gaps, preservando os controles de 44px.

O shell recebeu apenas a opção de apresentação `mobileSkipLabel`, utilizada nesta página. O valor padrão preserva a apresentação dos demais consumidores, e o desktop desta página continua mostrando “Pular por enquanto”. As regras que alternam os textos são restritas ao Passo 2 mobile.

## Funcionalidades preservadas

Não foram modificados endpoints, métodos de seleção/importação, regras de onboarding, SmartCalc, persistência ou os outros passos. Pesquisa com debounce, categoria, expansão da árvore, alternância de visualização e seleção individual continuam usando a mesma implementação.

No navegador, o botão em lote foi testado com mouse e Enter: parcial → completa → vazia. A pesquisa A5 combinada com Adesivos retornou seis itens. Desmarcar esses resultados e limpar os filtros preservou os 210 itens selecionados fora do filtro, comprovados pelos checkboxes da lista completa. O botão principal continua habilitado pela seleção geral. Nenhum contador numérico foi reintroduzido na interface.

## Arquivos alterados

- `src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.html`: título isolado e rótulo mobile da ação secundária.
- `src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.scss`: restauração do cabeçalho desktop, regras mobile consolidadas, título, rodapé e paisagem.
- `src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.html`: Filtros na linha da visualização e botão em lote na terceira linha.
- `src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.scss`: destaque do botão, alinhamento dos controles e espaçamento em pouca altura.
- `src/app/components/onboarding/onboarding-shell.component.{ts,html,scss}`: opção de rótulo mobile, sem mudar os eventos ou os valores padrão.
- `src/app/pages/onboarding-v2/onboarding-flow.spec.ts`: estados do botão em lote, linhas mobile, título/CTA sem quebra, cabeçalho desktop e novas alturas de validação.
- Este relatório e `docs/screenshots/mobile-catalogo-refinamentos/`.

## Validação visual

Componentes reais, skin completa e biblioteca sintética de 216 produtos, com serviços mockados. Sem importação ou navegação real ao backend. Os arquivos temporários da prévia e da referência histórica foram removidos antes da suíte e do build finais. O override de viewport foi restaurado.

| Viewport | Detalhada | Árvore expandida |
| --- | --- | --- |
| 360 × 800 | [Captura](screenshots/mobile-catalogo-refinamentos/detalhada-360x800.jpg) | [Captura](screenshots/mobile-catalogo-refinamentos/arvore-360x800.jpg) |
| 390 × 844 | [Captura](screenshots/mobile-catalogo-refinamentos/detalhada-390x844.jpg) | [Captura](screenshots/mobile-catalogo-refinamentos/arvore-390x844.jpg) |
| 430 × 932 | [Captura](screenshots/mobile-catalogo-refinamentos/detalhada-430x932.jpg) | [Captura](screenshots/mobile-catalogo-refinamentos/arvore-430x932.jpg) |
| 800 × 360 | [Captura](screenshots/mobile-catalogo-refinamentos/detalhada-800x360.jpg) | [Captura](screenshots/mobile-catalogo-refinamentos/arvore-800x360.jpg) |
| 768 × 1024 | [Captura](screenshots/mobile-catalogo-refinamentos/detalhada-768x1024.jpg) | [Captura](screenshots/mobile-catalogo-refinamentos/arvore-768x1024.jpg) |
| 1366 × 768 | [Captura](screenshots/mobile-catalogo-refinamentos/detalhada-1366x768.jpg) | [Captura](screenshots/mobile-catalogo-refinamentos/arvore-1366x768.jpg) |
| 1366 × 900 | [Captura](screenshots/mobile-catalogo-refinamentos/detalhada-1366x900.jpg) | [Captura](screenshots/mobile-catalogo-refinamentos/arvore-1366x900.jpg) |
| 1440 × 800 | [Captura](screenshots/mobile-catalogo-refinamentos/detalhada-1440x800.jpg) | [Captura](screenshots/mobile-catalogo-refinamentos/arvore-1440x800.jpg) |
| 1440 × 900 | [Captura](screenshots/mobile-catalogo-refinamentos/detalhada-1440x900.jpg) | [Captura](screenshots/mobile-catalogo-refinamentos/arvore-1440x900.jpg) |

Nas 18 combinações, não houve overflow horizontal. Título e CTA couberam em uma linha, e o rodapé permaneceu visível sem sobreposição. Em 360 × 800, a lista tem aproximadamente 504px de altura, contra cerca de 429px na versão anterior. Em paisagem, a lista recebe aproximadamente 116px dos 360px disponíveis, mantendo todos os controles visíveis e permitindo rolagem até o fim.

[Medições das viewports](screenshots/mobile-catalogo-refinamentos/validacao-viewports.json). Também registrados [seleção parcial](screenshots/mobile-catalogo-refinamentos/selecao-parcial-360x800.jpg), [modal de filtros](screenshots/mobile-catalogo-refinamentos/modal-filtros-360x800.jpg), [filtros ativos](screenshots/mobile-catalogo-refinamentos/filtros-ativos-360x800.jpg) e [último produto sem sobreposição do rodapé](screenshots/mobile-catalogo-refinamentos/fim-lista-360x800.jpg).

## Testes e build

- Testes focados de fluxo e seletor: **37 aprovados**.
- Suíte final: `npm test -- --watch=false --browsers=ChromeHeadless` — **908 testes, 907 aprovados e a mesma falha preexistente**.
- `npm run build:prod` — **aprovado**, com avisos de dependências CommonJS existentes.
- `git diff --check` — **aprovado**.

A falha anterior e atual é `AppStatusGridComponent mantém navegação com filtro de status`: o teste espera `/page/grafica/comercial-beta/orcamentos`, enquanto a aplicação navega para `/page/grafica/comercial/orcamentos`. Não houve novas falhas.

Os testes responsivos verificam relações entre título, filtros, visualização, ação em lote, lista e rodapé; também confirmam o cabeçalho desktop nas alturas inferiores a 840px. Os testes existentes de importação, pulo, recuperação do fluxo, modal, seleção e expansão continuam passando.

Limitações: Chrome com viewport emulada e entrada por mouse/teclado; sem teclado virtual real de iOS/Android. Autenticação, importação e destinos posteriores foram cobertos por mocks, sem alteração de dados reais.

Entrega em commit local, sem push, PR ou merge.
