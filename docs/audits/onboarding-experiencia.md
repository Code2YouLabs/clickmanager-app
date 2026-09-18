# Experiência de onboarding — 17/09/2026

## Auditoria

O fluxo existente já tinha três rotas (`empresa`, `produtos`, `resumo`), determinadas pelo progresso persistido do onboarding. As três páginas reutilizavam `OnboardingShellComponent`, mas com ações principais no cabeçalho e progresso numérico fixo. A página de produtos mantinha o passo 2 e o título da Biblioteca durante a preparação e na conclusão.

`BibliotecaProdutosSelectorComponent` já compartilhava seleção entre árvore e detalhes, recuperava a última importação e acompanhava seu progresso. `SetupProgressComponent` já exibia os dados reais. `HierarchyTreeComponent` expandia todos os níveis quando usado pela Biblioteca; desligar `expandAll` ainda expandia as raízes.

## Estrutura final

- O shell ganhou apresentação semântica opcional: Sua empresa → Seu catálogo → Preparando. A etapa ativa tem `aria-current="step"`; as anteriores têm marca de conclusão. Ao terminar, todas ficam concluídas, com 100% secundário. O onboarding antigo mantém sua apresentação.
- Empresa preserva os campos e o salvamento existentes. Título e introdução ficam no conteúdo; Continuar fica no rodapé da etapa. A confirmação do salvamento agora menciona o catálogo.
- Catálogo usa título orientado à escolha, explica a seleção por categoria/item e sua natureza opcional. O rodapé contém quantidade selecionada, Pular por enquanto e Preparar meu catálogo. Não há Voltar sem uma navegação anterior suportada pelo progresso atual.
- A árvore inicia com raízes recolhidas somente no onboarding. Selecionar uma categoria seleciona os descendentes sem expandir. Pesquisa/filtro expandem os caminhos dos resultados; detalhes continuam usando o mesmo conjunto de seleção.
- A página de produtos tem um estado explícito de apresentação, calculado em `onboarding-presentation.ts`: CATALOGO, PREPARANDO ou CONCLUIDO. A definição também contempla EMPRESA. Preparar muda imediatamente para a terceira etapa, antes da resposta da criação. Uma reconexão que confirme ausência de importação retorna à seleção preservada.
- O seletor permanece montado para manter o acompanhamento. Seu evento de preparação atualiza a página. O título e o rodapé da seleção desaparecem durante o processamento; o componente de progresso ocupa o conteúdo principal sem outro card da Biblioteca ao redor.
- Preparação usa apenas as fases e contagens já existentes. A espera usa mensagens amigáveis. Barra e estimativa continuam baseadas na resposta do backend.
- Conclusão mantém o terceiro passo, mostra totais e detalhes dos erros e oferece Entrar no ClickManager dentro do conteúdo. Pular usa o endpoint existente e chega à rota de conclusão, sem criar importação.
- Refresh recupera a última importação, ativa ou concluída, sem novo POST. A rota de conclusão também recupera os totais, inclusive se concluir a etapa tiver funcionado mas finalizar o onboarding precisar de nova tentativa.
- O cabeçalho é informativo; os botões ficam no conteúdo/rodapé. Em mobile, o stepper permanece legível e as ações empilham. A largura principal e os espaços são compartilhados.

## Componentes

Reaproveitados e ajustados: OnboardingShell, as três páginas v2, BibliotecaProdutosSelector, HierarchyTree e SetupProgress. SectionCard e os inputs existentes continuam em uso. Não foi criado outro componente de onboarding, serviço de importação ou mecanismo de polling. O único novo módulo de produção é a pequena definição de estado de apresentação.

Backend, regras de duplicidade, materialização de produtos e arquitetura da importação não foram alterados.

## Validação

Testes focados cobrem navegação Empresa → Catálogo, localização das ações, árvore recolhida, seleção de categoria, expansão por busca, alternância de visualização, pular, início imediato do passo 3, espera, progresso real, conclusão, reconexão ativa/concluída, resposta perdida sem importação e layout em viewport de 360 px. Incluem os testes existentes de seleção, polling e redirecionamento legado.

Validação de integração com backend real/produção e revisão visual em aparelhos físicos não fazem parte desses testes de componentes. A árvore compartilhada já emite aviso do Angular Material sobre mistura de tipos flat/nested; não houve refatoração dessa estrutura nesta tarefa.

Resultado: 28 testes focados aprovados no ChromeHeadless; build completo de produção aprovado. O build mantém avisos de dependências CommonJS já utilizadas pelo projeto. `git diff --check` passou.
