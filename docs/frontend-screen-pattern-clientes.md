# Padronização de Clientes — épico #79

Status: implementação e validação técnica concluídas; revisão visual manual pendente.

## Base e escopo

Branch `feature/padronizar-clientes`, criada após checkout de `develop` e pull fast-forward. `develop`, `origin/develop` e HEAD inicial conferidos em `3a847dba3a3a307cd4a56ae30a3aa8930796b95f`. Essa develop inclui a fundação #86; a #87 ainda não está incorporada. Sua documentação foi consultada via `git show feature/87-padronizar-comercial-grafica:docs/frontend-screen-pattern-comercial.md`, sem importar alterações da branch anterior.

Referências: épico #79, auditoria #85, fundação #86, Comercial #87, `frontend-screen-pattern-audit.md` e `frontend-screen-pattern-foundation.md`. Aplicada a [skill anthropics/frontend-design](https://www.ui-skills.com/skills/anthropics/frontend-design) para consistência, estados, hierarquia e acessibilidade, preservando identidade do App.

A evolução de `PageCard` e `page-form-state` é uma decisão **intencional de padronização transversal solicitada pelo usuário**, além da migração de Clientes. Os consumidores migrados devem permanecer no contrato compartilhado; essa ampliação não é uma regressão de escopo a reverter. Backend, serviços de produção e rotas não foram alterados. A implementação foi commitada e publicada, mediante autorização anterior, em `a6621302a9087e20dd1cfabbfbb0dbdeb3ffecf1`. Esta rodada apenas confirma arquitetura e validação técnica, sem nova alteração arquitetural, commit, push ou PR.

## Estrutura e contratos

- Listagem: PageCard/CardHeader → DataTable → ListFilterBar/InputPesquisa, estados, colunas Nome/E-mail/Telefone, ações e paginação. Telefone mantém o pipe existente. Nenhuma MatTable local ou componente paralelo foi criado. A listagem não precisa de SCSS próprio, pois usa os estilos da fundação.
- Busca global preservada: `textoPesquisa` no serviço existente; único debounce de 400 ms no InputPesquisa; busca reinicia página zero; paginação e total são do servidor. Não existe filtragem local. Nova consulta cancela a anterior.
- Estados: loading inicial, refreshing preservando dados, erro com retry, 403, vazio real e vazio filtrado. Falha de atualização preserva dados e total; 403 oculta conteúdo. Exclusão mantém confirmação e feedback, seguida de recarga.
- Permissões: botão Novo cliente usa CLIENTE_CADASTRAR; ações editar/excluir verificam CLIENTE_EDITAR/CLIENTE_EXCLUIR. Rotas e SHARED_ROUTE_DATA permanecem intactos, inclusive CLIENTE_VER. Nenhuma dependência de segmento foi introduzida.
- Desktop: PageCard/CardHeader → form `cliente-form` → SectionCard Dados do cliente + EnderecoForm → footer declarativo Cancelar/Salvar. Submit nativo `type=submit`, `form=cliente-form`, com um único handler. Cancelar limpa a criação ou restaura os dados carregados na edição, pelo contrato compartilhado PageFormState; apenas Voltar do header navega para `/page/cliente`.
- Edição: loading/erro/retry/403 antes de montar o formulário; só exibe campos após receber dados. Consultas obsoletas são canceladas. EnderecoForm recebe o valor existente antes de substituir o grupo, preservando o endereço carregado e a troca entre desktop/mobile.
- Saving: estado explícito, ações desabilitadas e texto Salvando; handler bloqueia chamadas repetidas. Falha libera nova tentativa sem apagar campos. `retorno` preservado tanto no POST quanto no PUT.
- Campos, máscaras, validators, payload e busca de CEP mantidos. Mobile preserva duas etapas, validação, continuar/voltar, foco, busca explícita de CEP e MobileTotalBar. Foco procura o input dentro da própria instância do formulário e seu timer é cancelado ao destruir. MobileTotalBar global não foi alterado.

## Arquivos

- `src/app/pages/cliente/listar-cliente/listar-cliente.component.ts` e `.html`: migração e estados.
- `src/app/pages/cliente/form-cliente/form-cliente.component.ts`, `.html` e `.scss`: composição desktop, estados e proteção de salvamento; estilos mobile anteriores preservados.
- `src/app/pages/cliente/listar-cliente/listar-cliente.component.spec.ts`: 13 cenários integrados de listagem, servidor/debounce, paginação, estados, cancelamento e ações/permissões.
- `src/app/pages/cliente/form-cliente/form-cliente.component.spec.ts`: 18 cenários de criação/edição, validação, loading/retry/403, endereço/CEP, submit único, retorno e mobile.
- `src/app/pages/cliente/cliente.service.spec.ts`: 2 cenários do endpoint/query existentes.
- `src/app/pages/cliente/cliente.routes.spec.ts`: 1 cenário das rotas, guards, permissões e transversalidade.
- `src/app/components/page-card/page-form-state.ts` e `.spec.ts`, arquivos do PageCard e formulário/spec de Produtos: cancelamento centralizado e cobertura.
- Este documento e evidências em `docs/validation/clientes/`.

## Validação técnica

Baseline executada antes de editar: **378 executados, 371 passaram, 7 falharam**, exit 1. [Log](validation/clientes/baseline-tests.log). Todas as falhas são de GraficaProdutoFormComponent, com `categoriaService.listarTodas is not a function`:

- GraficaProdutoFormComponent carrega clone com valores do produto original sem reaproveitar ids internos
- GraficaProdutoFormComponent cria payload de clone sem reaproveitar ids de acabamento e politica
- GraficaProdutoFormComponent restaura snapshot original ao cancelar clone
- GraficaProdutoFormComponent clone mudando apenas formato cria novo catalogoProduto
- GraficaProdutoFormComponent clone mantendo nome original deixa familia ser resolvida pelo backend
- GraficaProdutoFormComponent clone mudando apenas material cria novo catalogoProduto
- GraficaProdutoFormComponent clone mudando apenas cor cria novo catalogoProduto

- Testes focados da etapa anterior (PageCard/PageFormState, Clientes e formulário de Produtos): **56/56 passaram**, exit 0. [Log](validation/clientes/focused-tests.log).
- Suíte completa final: **440 executados, 440 passaram, 0 falharam**, exit 0. [Log](validation/clientes/full-tests.log). **Novas falhas: 0**.
- As sete falhas da baseline foram resolvidas adicionando `listarTodas` ao mock de CatalogoCategoriaService no spec de Produtos. Essa correção de teste foi necessária para validar a mudança solicitada no cancelamento de Produtos, incluindo clone. Não houve alteração no serviço de categorias de produção. O teste antigo de restaurar clone foi atualizado para a nova regra solicitada: clone é criação e deve ser limpo.
- Build oficial `npm run build`: **exit 0**, bundle gerado em `dist/clickmanager-app`. [Log](validation/clientes/build.log).
- TypeScript dos specs, compilação Angular e `git diff --check`: passaram.
- Histórico: primeira execução focada teve erro de tipagem na asserção do diálogo; depois houve falhas no mock de MatDialog e no foco mobile. Provider do diálogo foi definido no injector do componente de teste; foco ficou restrito ao host do formulário. Todos esses cenários passaram na execução final.
- A rejeição anterior do serviço de aprovação e o abort 134 do build no sandbox são registros históricos. Nesta etapa, Karma e build oficial foram autorizados e concluídos; não há bloqueio técnico remanescente.

## Continuidade

Pendências técnicas conhecidas desta entrega: nenhuma. A revisão visual permanece com o responsável do produto.

Futura iniciativa mobile: revisar a duplicação de marcação entre desktop/mobile e eventual apresentação da listagem em itens. Esta tarefa preserva a arquitetura de duas etapas existente e a tabela compartilhada, sem promover o fluxo de Clientes a padrão global.

Validação visual: pendente de revisão manual pelo responsável do produto.

## Ajuste solicitado: padrão de Cancelar

Cancelar usa o padrão vermelho existente de Produtos. Clientes fornece o estado do formulário; PageCard gera Cancelar e aplica a aparência comum automaticamente. Produtos também utiliza footerActions e o reset compartilhado, recebendo o CSS apenas do PageCard. Testes do contrato compartilhado executados e aprovados no Karma.


## Ajuste solicitado: comportamento de Cancelar

PageCard executa a intenção `cancel` diretamente pelo PageFormState. Clientes deixou de possuir handler de cancelamento. Criação restaura defaults vazios; edição restaura o snapshot do backend, incluindo endereço, sem nova chamada HTTP. O estado de interação do formulário também é limpo. Produtos migrou suas ações para o mesmo contrato; seu adaptador restaura preço dinâmico, imagens e acabamentos. Clones seguem a regra de criação. Voltar do header mantém navegação, e `retorno` após salvar permanece intacto.

Testes acrescentados para reset centralizado, criação/edição, isolamento profundo da base, troca de grupos/endereço, invalidação da base ao trocar de edição e não emissão de comandos de cancelamento para as telas.


## Ampliação solicitada: todos os Cancelar de formulário do PageCard

A migração foi ampliada aos 11 pontos de descarte encontrados nos consumidores do componente. O inventário completo e o contrato obrigatório estão em `frontend-screen-pattern-foundation.md`, seção Cobertura global do Cancelar do PageCard. Não há mais ação de Cancelar declarada nas telas nem handlers locais de descarte; o PageCard gera a ação a partir do contexto de formulário. Ações de negócio e diálogos foram preservados.

A implementação compartilhada também restaura a estrutura dos FormArrays, mantendo validators ao recompor linhas. Cadastros bloqueiam Cancelar enquanto carregam ou salvam. Adicionados testes parametrizados de cores/materiais/formatos/categorias/serviços (criação, edição e clone), cadastro genérico, Pedido legado e editor Comercial.

Validação final após ampliação: suíte completa **440/440**, exit 0; build oficial **exit 0**; TypeScript dos specs e `git diff --check` passaram. Novas falhas: **0**. Sem validação visual. O commit e push posteriores foram explicitamente autorizados; nesta rodada de validação não houve nova publicação.


## Confirmação arquitetural da padronização transversal

Inspeção do código da branch `feature/padronizar-clientes`, commit `a6621302a9087e20dd1cfabbfbb0dbdeb3ffecf1`:

- `PageCard` e `page-form-state` não conhecem Produto, Cliente, Pedido ou outras entidades; não importam modelos nem serviços das features.
- Não há chamadas diretas ao backend. `PageFormState` depende apenas dos controles do Angular Forms; `PageCard` compõe Angular/Material, CardHeader e o estado compartilhado.
- A infraestrutura trabalha com estado/snapshot genérico, estrutura de controles, validators e cópias isoladas. NOVO descarta alterações e restaura o estado inicial registrado; EDIÇÃO descarta alterações locais e restaura o estado carregado registrado.
- O PageCard gera e executa Cancelar sem handler de descarte em cada tela. As features informam modo, formulário e conclusão do carregamento; adaptadores `read`/`write` apenas conectam seus dados complementares ao snapshot genérico.
- Regras de negócio, HTTP, persistência, cálculo, permissões e transformações específicas continuam nas features. O shared não implementa cancelamento de pedido, pagamento ou documento fiscal. Validators e adaptadores fornecidos pelas features continuam sob responsabilidade delas; o reset não adiciona uma operação de backend.

Consumidores migrados, preservados nesta validação:

1. Clientes.
2. Produtos gráficos.
3. Cores gráficas.
4. Materiais gráficos.
5. Formatos gráficos.
6. Categorias gráficas.
7. Serviços gráficos.
8. Cadastros gráficos genéricos.
9. Configuração SmartCalc.
10. Formulário de Pedido legado.
11. Editor Comercial da Gráfica (Pedidos, Orçamentos e Rascunhos, na pasta `comercial-beta` presente nesta develop).

Nenhuma implementação individual de infraestrutura de cancelamento foi reintroduzida, e nenhuma migração de consumidor foi revertida.


## Revalidação técnica solicitada — 25/09/2026

Executados novamente os três comandos na branch atual, sem alterar código funcional, testes ou arquitetura nesta rodada:

| Verificação | Comando | Resultado desta execução |
|---|---|---|
| Focados exclusivamente em Clientes | `npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/pages/cliente/**/*.spec.ts'` | **34 executados, 34 passaram, 0 falharam; exit 0** |
| Suíte completa real Karma/ChromeHeadless | `npm test -- --watch=false --browsers=ChromeHeadless` | **440 executados, 440 passaram, 0 falharam; exit 0** |
| Build oficial | `npm run build` | **exit 0**, produção gerada em `dist/clickmanager-app` |

Comparação com a baseline registrada: **378 executados, 371 passaram, 7 falhas preexistentes**. A suíte atual tem 62 testes adicionais. **Falhas preexistentes remanescentes: 0. Novas falhas: 0.** A correção do mock `listarTodas` já estava no commit validado, assim como a atualização do cenário de cancelar clone para o contrato de criação; não foi feita correção adicional nesta rodada. Os sete nomes da baseline estão preservados acima. O resultado focado desta rodada é 34/34 somente em Clientes, separado dos 56 testes focados de escopo maior registrados anteriormente.

Logs desta execução mantidos localmente em `/tmp/clientes-requested-focused.log`, `/tmp/clientes-requested-full.log` e `/tmp/clientes-requested-build.log`. Os logs versionados das execuções anteriores foram preservados. `git diff --check` passou; apenas este documento foi alterado nesta rodada. Não houve commit nem push.

Validação visual: pendente de revisão manual pelo responsável do produto.
