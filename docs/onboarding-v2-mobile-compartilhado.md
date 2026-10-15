# Onboarding V2 — estrutura mobile compartilhada

## Escopo e preparação

Implementação em `fix/mobile-catalogo-onboarding`, continuando os ajustes locais do catálogo a partir de `e21f6c8`. A `develop` local foi atualizada por fast-forward para `b558ccc`, igual à `origin/develop`; não havia commits remotos de develop ausentes da branch atual. Nenhum push, PR ou merge realizado.

## Estrutura reutilizada

- `OnboardingShellComponent`: mantém o cabeçalho semântico existente das três etapas e concentra as regras mobile de cabeçalho, conteúdo e rodapé.
- `mobileLayout`: contrato opcional com `flow` para formulário/progresso e `catalog` para a lista com rolagem interna. Consumidores antigos não aderem automaticamente.
- `mobileActions`: template opcional para a ação de conclusão, preservando o mesmo handler e estado de desabilitação da apresentação desktop.
- `_onboarding-mobile.scss`: container comum com viewport dinâmica, safe-area, padding e comportamento para telas de pouca altura.
- `SetupProgressComponent`: reutilizado com template e estilos extraídos para arquivos separados; lógica de progresso inalterada.

Faixas preservadas do catálogo aprovado: até 768px; também até 960px quando a altura é de até 560px. As novas disposições são restritas a essas faixas.

## Sua empresa

Formulário em uma coluna, grupos Empresa e Responsável preservados, inputs com largura disponível, espaçamentos compactos e mensagens de erro no fluxo do formulário. O conteúdo rola dentro da área entre cabeçalho e rodapé. O botão Continuar mantém validação, loading e envio existentes. Os cinco campos, máscaras, obrigatoriedade e payload não foram alterados.

## Seu catálogo

Conteúdo aprovado preservado: título, filtros, alternância Árvore/Detalhada, seleção, lista e ações. Apenas as regras do cabeçalho/estrutura/rodapé foram centralizadas no shell. Nenhum arquivo do seletor da biblioteca foi modificado; busca, modal, categorias, seleção, importação e reconexão permanecem iguais.

## Preparando e conclusão

Espaçamento, títulos, descrições, ícones e contadores ajustados exclusivamente no mobile. Todas as tarefas e os dados reais de produtos e SmartCalc permanecem existentes. A ação Entrar no ClickManager usa o rodapé compartilhado no mobile; no desktop, permanece no local original. Também se aplica à rota de resumo após atualização da página. Não foram alterados polling, requisições, animação, estados ou navegação.

## Arquivos

- `src/app/components/onboarding/onboarding-shell.component.{ts,html,scss}`: contrato e estrutura compartilhados.
- `src/app/components/setup-progress/setup-progress.component.{ts,html,scss}`: separação de arquivos e estilos mobile.
- `src/app/pages/onboarding-v2/_onboarding-mobile.scss`: frame mobile comum.
- `src/app/pages/onboarding-v2/onboarding-v2-page.scss`: importação do frame.
- `src/app/pages/onboarding-v2/company-step/onboarding-v2-company-page.component.{html,scss}`: organização do formulário e adesão ao shell.
- `src/app/pages/onboarding-v2/products-step/onboarding-v2-products-page.component.{html,scss}`: reutilização da estrutura aprovada e ação de conclusão.
- `src/app/pages/onboarding-v2/summary-step/onboarding-v2-summary-page.component.{html,scss}`: mesma estrutura e ação na rota de resumo.
- `src/app/pages/onboarding-v2/onboarding-flow.spec.ts`: quatro casos de regressão funcionais.
- Este documento: escopo e validação.

## Validação automatizada

Baseline antes das alterações:

```sh
npm test -- --watch=false --browsers=ChromeHeadless
```

908 testes: 907 aprovados e 1 falha anterior em `AppStatusGridComponent — mantém navegação com filtro de status`. O teste espera `/page/grafica/comercial-beta/orcamentos`, enquanto a navegação usa `/page/grafica/comercial/orcamentos`.

Testes pertinentes após a implementação:

```sh
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/pages/onboarding-v2/**/*.spec.ts' --include='src/app/pages/grafica/biblioteca/biblioteca-produtos-selector.component.spec.ts'
```

44 testes aprovados. Os quatro novos casos cobrem validação/payload da empresa pelo rodapé, estados semânticos do cabeçalho e compatibilidade com outros consumidores, transição entre catálogo/preparação/conclusão e proteção da ação de conclusão durante erro/salvamento com nova tentativa.

Suíte completa final: **912 testes, 911 aprovados e a mesma falha anterior** de `AppStatusGridComponent`. Nenhuma nova falha identificada.

```sh
npm run build:prod
```

Build de produção aprovado. Emite avisos de compilação em outros componentes, Sass da skin e dependências CommonJS (`qrcode` e `chance`); não impede a geração.

Verificações adicionais: `git diff --check` aprovado; comparação dos estilos compilados fora das media queries confirma a preservação das regras desktop do shell e das páginas. Estilos desktop do SetupProgress foram extraídos sem mudanças; a classe de processamento e as classes das três páginas permanecem idênticas ao baseline.

## Pendências

A validação visual manual cabe ao responsável pelo projeto, conforme solicitado. Não houve abertura manual de navegador, screenshots nem nova infraestrutura E2E. Os testes automatizados existentes de layout foram preservados. A falha anterior de navegação em AppStatusGridComponent permanece fora do escopo desta entrega.
