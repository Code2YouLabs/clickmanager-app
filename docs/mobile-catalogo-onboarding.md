# Catálogo do onboarding — usabilidade mobile

Branch: `fix/mobile-catalogo-onboarding`, criada da `origin/develop` atualizada (`b558ccc`). Referência: épico #135 e auditoria #136. A alteração trata somente da seleção de produtos no passo 2.

## Causa

O seletor renderizava todos os produtos em um grid sem limite de altura. A árvore também crescia conforme a expansão. O shell semântico do onboarding definia seu rodapé como `position: static`, após o conteúdo completo. Assim, a lista empurrava as ações para milhares de pixels abaixo da viewport.

Na prévia com 216 produtos sintéticos, em 390 × 844, a página chegava a aproximadamente 57.586px e o rodapé começava em 57.383px. [Captura anterior](screenshots/mobile-catalogo-onboarding/antes-detalhada-390x844.jpg).

## Solução

- O passo 2, apenas enquanto está selecionando produtos, ocupa a viewport dinâmica com uma cadeia Flexbox de `min-height: 0`. Cabeçalho e rodapé têm espaço próprio; o conteúdo restante contém filtros e uma região de resultados com rolagem.
- Na altura normal, contexto, filtros, alternância de visualização e seleção em lote permanecem acima da lista. Árvore e Detalhada compartilham a mesma região limitada e acessível por teclado.
- Até 840px de altura, contexto e filtros rolam junto com os produtos em uma única área central. Isso evita rolagens verticais aninhadas quando não há espaço para manter todos os controles fixos. O indicador de etapas e o rodapé continuam fora dessa rolagem. As duas ações ficam lado a lado nesse modo.
- O rodapé permanece no fluxo Flexbox, sem sobrepor a lista e sem depender de uma posição fixa sobre a página. Mostra o total de selecionados, “Preparar meu catálogo” e “Pular por enquanto”; o contêiner respeita safe-area.
- No mobile, o cabeçalho prioriza os indicadores de etapa. O logo permanece no desktop. Os passos 1 e 3 e as telas de preparação/conclusão mantêm seu layout anterior.
- A visualização Detalhada preserva nome, categoria, configuração, descrição, preço e acabamentos, com espaçamentos menores e maior área clicável no label do checkbox. O desktop mantém o grid com múltiplas colunas.
- A árvore permanece montada ao alternar para Detalhada no onboarding, preservando categorias expandidas. A seleção não reconstrói a lista/árvore nem reinicializa a região de rolagem.

O comportamento compacto do seletor é ativado pelo `onboarding` já existente. O shell e a árvore compartilhados não foram editados. Não foram adicionadas dependências ou virtualização; a solução reutiliza o rastreamento por chave e os índices de seleção existentes.

## Selecionar todos

A regra existente foi mantida: a ação atua **somente nos resultados da pesquisa e da categoria atuais**. Sem filtros, atua na biblioteca completa. Desmarcar resultados não remove a seleção de itens fora do filtro.

O botão continua fora da lista, nas duas visualizações, com texto explícito de quantidade/escopo, contador imediato e nova ajuda visível: “A ação vale para os resultados da pesquisa e da categoria.” Estados de seleção completa, parcial ou vazia também são anunciados. O rodapé usa o total geral, enquanto o contador próximo da ação usa os resultados filtrados.

Na verificação interativa, a pesquisa “A5” retornou 36 itens; combinada com “Adesivos”, retornou 6. Desmarcar esses 6 preservou 209 seleções externas ao filtro (havia 215 antes da ação).

## Arquivos modificados

- `src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.html`: ativação do layout limitado durante a seleção.
- `src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.scss`: estrutura, rodapé, safe-area e adaptação por altura/largura, restritos ao passo 2.
- `src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.ts`: classe de apresentação vinculada ao input `onboarding`.
- `src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.html`: região de resultados, preservação da árvore, ajuda da seleção em lote e apresentação curta de “Todas” no seletor de categoria.
- `src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.scss`: estilos compactos e rolagem optativa para onboarding.
- `src/app/pages/onboarding-v2/onboarding-flow.spec.ts`: testes de expansão/seleção/alternância e sete cenários de viewport.
- Este relatório e a pasta de capturas/medições abaixo.

Endpoints, importação, criação da empresa, persistência, seleção por categoria/individual, filtros, ordenação, configuração do SmartCalc e conclusão/pulo não foram alterados. Não foi criada persistência adicional de seleção ao sair da rota; continuam valendo as regras anteriores de recuperação de preparação em andamento/concluída.

## Testes e build

| Verificação | Resultado |
| --- | --- |
| Baseline — `npm test -- --watch=false --browsers=ChromeHeadless` | 895 testes: 894 aprovados e 1 falha anterior |
| Baseline — `npm run build:prod` | Aprovado |
| Testes focados de fluxo do onboarding e seletor | 32 aprovados |
| Suíte completa final | 903 testes: 902 aprovados e a mesma falha anterior |
| Build final — `npm run build:prod` | Aprovado |
| `git diff --check` | Aprovado |

A falha preexistente é `AppStatusGridComponent mantém navegação com filtro de status`: o teste espera `/page/grafica/comercial-beta/orcamentos`, enquanto a navegação atual usa `/page/grafica/comercial/orcamentos`. Não foi alterada nesta tarefa.

Os testes existentes continuam cobrindo debounce e combinação de filtros, seleção em lote limitada aos resultados, seleção por categoria e individual, importação com a seleção real, envio único, pular sem importar, retorno à seleção após falha de conexão e recuperação de preparação após recriação da página. Os novos testes verificam preservação da instância/expansão da árvore ao alternar modos, checkbox selecionado, contador/CTA, posição da rolagem após seleção e layout com 216 produtos e com poucos produtos. Os testes de layout usam limites relativos da viewport e relações entre lista/rodapé, sem fixar coordenadas específicas.

## Validação visual no Chrome

Usados os componentes reais e a skin completa em uma prévia local com serviços mockados e 216 produtos sintéticos. Nenhum produto foi importado numa empresa real. Arquivos e configuração temporários da prévia foram removidos antes da suíte/build finais.

Nas 14 combinações abaixo, a largura do conteúdo não ultrapassou a viewport; a página manteve a altura da viewport e o rodapé permaneceu visível sem rolar até o fim dos produtos. [Medições em JSON](screenshots/mobile-catalogo-onboarding/validacao-viewports.json).

| Viewport | Detalhada | Árvore expandida |
| --- | --- | --- |
| 360 × 800 | [Captura](screenshots/mobile-catalogo-onboarding/depois-detalhada-360x800.jpg) | [Captura](screenshots/mobile-catalogo-onboarding/depois-arvore-360x800.jpg) |
| 390 × 844 | [Captura](screenshots/mobile-catalogo-onboarding/depois-detalhada-390x844.jpg) | [Captura](screenshots/mobile-catalogo-onboarding/depois-arvore-390x844.jpg) |
| 430 × 932 | [Captura](screenshots/mobile-catalogo-onboarding/depois-detalhada-430x932.jpg) | [Captura](screenshots/mobile-catalogo-onboarding/depois-arvore-430x932.jpg) |
| 768 × 1024 | [Captura](screenshots/mobile-catalogo-onboarding/depois-detalhada-768x1024.jpg) | [Captura](screenshots/mobile-catalogo-onboarding/depois-arvore-768x1024.jpg) |
| 1366 × 900 | [Captura](screenshots/mobile-catalogo-onboarding/depois-detalhada-1366x900.jpg) | [Captura](screenshots/mobile-catalogo-onboarding/depois-arvore-1366x900.jpg) |
| 800 × 360 | [Captura](screenshots/mobile-catalogo-onboarding/depois-detalhada-800x360.jpg) | [Captura](screenshots/mobile-catalogo-onboarding/depois-arvore-800x360.jpg) |
| 390 × 420 | [Captura](screenshots/mobile-catalogo-onboarding/depois-detalhada-390x420.jpg) | [Captura](screenshots/mobile-catalogo-onboarding/depois-arvore-390x420.jpg) |

Verificações adicionais no navegador:

- [Último produto](screenshots/mobile-catalogo-onboarding/ultimo-produto-430x932.jpg) e [fim da lista em paisagem](screenshots/mobile-catalogo-onboarding/paisagem-final-lista.jpg), alcançáveis pela região de rolagem sem sobreposição do rodapé.
- [Pesquisa e categoria combinadas](screenshots/mobile-catalogo-onboarding/filtro-categoria-pesquisa.jpg), seleção em lote e preservação de itens fora do filtro.
- [Pesquisa sem resultados](screenshots/mobile-catalogo-onboarding/pesquisa-sem-resultados.jpg).
- [Lista com três produtos](screenshots/mobile-catalogo-onboarding/poucos-produtos.jpg).

## Limitações

As verificações visuais usam Chrome com viewport emulada e entrada por teclado/mouse. Não havia dispositivo iOS/Android com teclado virtual disponível; altura reduzida e paisagem foram testadas, mas não comprovam o comportamento do teclado real. A skin e os controles continuam sendo os do projeto. Importação e navegação posterior foram verificadas em testes com mocks, sem envio real ao backend. A validação de volume no navegador usou 216 produtos; não se afirma benchmark para quantidades muito superiores.

Entrega em commit local, sem push, PR ou merge automático.
