# Padronização de Usuários — épico #79

## Base e escopo

Branch: `feature/padronizar-usuarios`.
Base: `develop` atualizada por fast-forward, confirmada igual a `origin/develop` no SHA `9ad10226cb056fbe911ca05e3af7896b23f74764` antes da criação da branch. Não deriva da branch de Clientes.

Referências consultadas: issues #79, #85 e #86; documentos `frontend-screen-pattern-audit.md`, `frontend-screen-pattern-foundation.md` e `frontend-screen-pattern-clientes.md`, já presente na develop.

Escopo: `/page/usuarios/listar`, `/page/usuarios/novo` e `/page/usuarios/editar/:id`. Guards, `SHARED_ROUTE_DATA`, `USUARIOS_VER`, `USUARIO_CADASTRAR`, `USUARIO_EDITAR` e `USUARIO_EXCLUIR` preservados. Usuários permanece transversal, sem dependência de Gráfica ou Depósito. Breadcrumbs antigos de dashboard e `/usuarios` agora apontam para `/page/usuarios/listar`.

## Inventário e decisões de componentes

Pesquisa realizada em `src/app/components`, `src/app/pages/forms` e `src/app/pages/ui-components` antes da implementação.

| Necessidade | Decisão |
| --- | --- |
| Página, header e footer | `PageCard`, com `CardHeader` interno; sem outro shell |
| Lista, filtros e paginação | `DataTable`, seu `ListFilterBar` e `DataTableFilterState` tipado |
| Estados | Contratos de estado de `DataTable`; spinner Material e classes existentes no formulário |
| Seção de formulário | `SectionCard` |
| Nome | `InputTextoRestrito`, maxlength 100, sem bloquear números |
| E-mail | `InputEmail`, maxlength 50 |
| Perfil | `InputOptions`, opções de `PerfilService.listar()`, valor `id`, rótulo `nome`, sem criação embutida |
| Descarte | `PageFormState` integrado ao `PageCard` |
| Exclusão | `ConfirmDialogComponent` existente |
| Status | `StatusBadgeComponent`, acrescentando apenas a configuração genérica `INATIVO` |
| Foto | Mantidos `ImagemUtil.montarUrlImagemPerfil`, fallback e imagem circular com classes existentes |
| Senha | Novo `InputPasswordComponent`, compartilhado em `components/inputs/input-password` |

Descartados: chips locais e `StatusFilter` legado, em conformidade com a direção de depreciação da auditoria; MatTable/MatPaginator locais; exemplos de avatar de demonstração, que não oferecem um componente adequado para reutilização. Não foi criado avatar específico.

Não existia input compartilhado de senha adequado. Os exemplos `forms/form-horizontal` e `forms/form-vertical` já usam Material com botão sufixo e ícones visibility/visibility_off. O novo input reproduz essa experiência, recebe FormControl, label, placeholder, autocomplete e mensagem de obrigatório; utiliza outline e as classes existentes da família de inputs. Não contém regra de Usuário nem define validators. O botão de visibilidade é `type="button"`, com nome acessível e estado pressed. Não há CSS, cores ou tokens novos.

O levantamento dos consumidores de StatusBadge abrangeu Pedidos, Orçamentos, Funcionários, Folha, Suporte, Storage, demo e componentes compartilhados de pedido, transferência e mobile. Seus mapeamentos anteriores não foram alterados; `INATIVO` reutiliza `chip-cancelado` e o ícone Material `block`. Specs verificam o novo estado e compatibilidade de estados existentes/fallback.

## Listagem final

`PageCard → DataTable`, mantendo Foto, Nome, E-mail, Perfil, Status e Ações. Filtro inicial Ativos (`true`); Inativos (`false`) e Todos (`null`). O select compartilhado fornece Todos; limpar filtro também seleciona Todos. Alterações reiniciam a página e consultam o backend. Paginação mantém status e tamanho selecionados.

Loading inicial, refreshing com dados preservados, erro, retry, forbidden, vazio, vazio filtrado e conteúdo usam os contratos da fundação. HTTP 403 oculta a tabela. Cada nova consulta cancela a anterior; destruição também libera subscriptions. Erros não são convertidos em lista vazia.

Editar e Excluir usam ações do DataTable e permissões, verificadas também no tratamento da ação. Exclusão mantém confirmação, DELETE, feedback e recarga. Foto mantém URL e fallback com proteção contra loop de erro.

Responsividade estrutural dos componentes canônicos e grid existente. Não há fluxo mobile paralelo nem `appDataTableItem`.

## Formulário e Cancelar

`PageCard → form → SectionCard`, com footer único. Criação aguarda perfis; edição aguarda conjuntamente usuário e perfis via forkJoin. Falha de qualquer dependência apresenta erro/retry ou acesso restrito, sem expor formulário incompleto. Cargas obsoletas são canceladas.

Nome obrigatório até 100 caracteres; e-mail obrigatório, válido e até 50; perfil obrigatório; senha obrigatória com mínimo de 6 apenas na criação. Edição não exibe senha nem exige seu preenchimento e mantém toggle Ativo/Inativo.

Salvar usa exclusivamente submit nativo `form="usuario-form"`, `type="submit"` e `ngSubmit`. O estado `saving`, texto de andamento e bloqueio do PageCard impedem submissões duplicadas; erro libera nova tentativa. Sucesso preserva feedback e navegação para a listagem.

Cancelar usa diretamente a infraestrutura compartilhada, sem handler de reset na feature:

- NOVO: restaura Nome/E-mail/Senha vazios, Perfil null e Ativo true.
- EDIÇÃO: restaura Nome/E-mail/Perfil/Ativo originalmente carregados, sem GET adicional.
- Estado pristine/untouched é restaurado pelo contrato existente; Voltar continua navegação no header.

PageFormState não foi alterado nesta tarefa. PageCard recebeu a padronização transversal de Salvar solicitada durante a revisão. Continuam genéricos, sem domínio, backend ou regras de negócio.

## Padronização transversal de Salvar

Por solicitação explícita na revisão, a apresentação de Salvar pertence exclusivamente ao PageCard: texto `Salvar`, ícone Material `save` e botão primário fixos, tanto em criação quanto edição e durante saving. A mensagem acessível de processamento continua separada. Não existe configuração de texto/ícone/cor de submit nas páginas; o contrato TypeScript rejeita essas opções e a resolução interna impede sobrescrita em runtime.

Todos os consumidores atuais do footer declarativo foram migrados: Usuários, Clientes, SmartCalc e Gráfica (Produtos, Serviços, Cores, Formatos, Materiais, Categorias e cadastro genérico). As páginas informam somente identificação, associação ao formulário e condição disabled. Submit nativo, validações, payloads e salvamento continuam nas features.

## Auditoria HTTP e busca

Contrato verificado no `UsuarioController` e DTOs do backend local, além de `UsuarioService` e `ApiService`. Backend e serviços não foram modificados.

- GET `/api/usuarios`: paginação e filtro `ativo` preservados. O backend também aceita `nome` e `username`, mas `UsuarioService.listar()` atualmente só expõe page/size/ativo. Esta etapa mantém a interface atual sem busca textual. Não foi criada filtragem local da página; uma busca futura deve definir como expor os dois filtros reais e conectá-los ao endpoint.
- POST `/api/usuarios`: objeto JSON do formulário, contendo nome, username, senha, perfilId e ativo, preservado. O DTO `UsuarioRequest` declara nome, username, senha e perfilId; o endpoint retorna 201 sem corpo.
- PUT `/api/usuarios/:id`: o backend tem contratos distintos por content-type. JSON usa `UsuarioResumidoRequest` (nome, username, perfilId, ativo); multipart usa `UsuarioUpdateRequest` para o perfil pessoal, incluindo foto e outros campos. O formulário administrativo já enviava JSON diretamente, apesar da assinatura FormData do serviço. Isso foi preservado, inclusive `senha: ''` no objeto enviado, sem introduzir alteração de senha.

Dívidas registradas, sem ampliação do escopo:

1. Tipagem de `UsuarioService.atualizar` não representa ambos os contratos; não mudar isoladamente, pois atende também perfil pessoal multipart.
2. `salvar` tipa resposta como Usuario embora POST retorne corpo vazio; o modelo não descreve o DTO completo de criação. Payload não foi simplificado.
3. Filtros textuais reais do backend não estão expostos pelo cliente administrativo.
4. `InputTextoRestrito` tem mensagem preexistente de maxlength com interpolação literal; a validação e maxlength permanecem corretos. `InputOptions` produz aviso preexistente de disabled com Reactive Forms em testes. Não se alteraram esses componentes nesta etapa.

## Validação técnica

Baseline executada antes de editar, na develop atualizada: **440 executados, 440 passaram, 0 falhas**, exit 0. Não existem nomes de falhas preexistentes nesta baseline; os números históricos de outras tarefas não foram reutilizados.

Comandos:

```bash
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/pages/usuarios/**/*.spec.ts'
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/components/inputs/input-password/*.spec.ts' --include='src/app/components/status-badge/*.spec.ts'
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

Testes focados de Usuários: **28/28**, exit 0. Compartilhados: **9/9**, exit 0. Cobertura inclui filtros true/false/null, paginação, estados, ações/permissões, confirmação, foto, perfis, validações, cargas conjuntas, submit nativo, duplicidade, retry, Cancelar nos dois modos e descarte de consultas obsoletas. O input genérico tem spec próprio de visibilidade, acessibilidade, disabled e validators fornecidos pelo consumidor.

Resultados finais:

| Verificação | Resultado |
| --- | --- |
| Baseline develop | 440 executados / 440 passaram / 0 falhas / exit 0 |
| Focados Usuários | 28 executados / 28 passaram / 0 falhas / exit 0 |
| Focados compartilhados | 9 executados / 9 passaram / 0 falhas / exit 0 |
| Suíte completa final, incluindo Salvar compartilhado | 478 executados / 478 passaram / 0 falhas / exit 0 |
| Falhas preexistentes | 0; nenhuma a listar |
| Novas falhas | 0 |
| Build oficial | `npm run build` → exit 0 |
| TypeScript e whitespace | `npx tsc --noEmit -p tsconfig.app.json` e `git diff --check` → exit 0 |

38 testes novos no total. O spec existente de PageCard foi adaptado ao contrato sem apresentação configurável no submit; foi adicionado teste que verifica texto e ícone fixos, inclusive durante saving e diante de tentativa de sobrescrita. A primeira tentativa focada encontrou fixtures de Perfil sem o campo obrigatório permissoes; os dados dos novos testes foram corrigidos antes das execuções aprovadas. Build mantém avisos de Sass e dependências CommonJS (`qrcode`, `chance`) em arquivos fora desta alteração, sem erro de compilação.

Logs da execução local: `/tmp/usuarios-baseline.log`, `/tmp/usuarios-focused.log`, `/tmp/usuarios-shared.log`, `/tmp/usuarios-full.log`, `/tmp/usuarios-build.log`. Os totais acima são de execução real em ChromeHeadless, não apenas compilação dos specs.

Padronização de Usuários tecnicamente pronta para revisão, sem regressões identificadas pelos testes executados.

Após a padronização transversal de Salvar, a suíte completa foi reexecutada: **478/478**, exit 0, nenhuma nova falha. Build reexecutado: **exit 0**. Logs desta revisão: `/tmp/save-full.log` e `/tmp/save-build.log`.

Não foi realizada inspeção visual automatizada nem geração de screenshots. Sem push ou PR.

Validação visual: pendente de revisão manual pelo responsável do produto.
