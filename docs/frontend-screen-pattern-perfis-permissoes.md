# Padronização de Perfis e Permissões

Data: 28/09/2026. Épico: #79. Continuidade: #85 e #86.

## Base e branch

- Branch: `feature/padronizar-perfis-permissoes`.
- Base: `develop` atualizada e idêntica a `origin/develop`.
- SHA: `9ad10226cb056fbe911ca05e3af7896b23f74764`.
- Baseline antes das alterações: 440 testes executados, 440 passaram, 0 falharam; nenhuma falha a registrar.

## Estrutura anterior e estrutura final

A tela usava um `mat-card` local, toolbar, sidebar com largura fixa, `mat-nav-list`, `MatTable` e CSS próprio de master-detail. Loading, erro e vazio eram representados pelo mesmo array, não havia retry e respostas antigas de usuários podiam substituir a seleção mais recente.

A estrutura final usa `PageCard` como shell e dois `SectionCard`: Perfis e Usuários do perfil. A lista de perfis continua em `mat-nav-list`, pois seu contrato é seleção master-detail e não tabular. A lista de usuários usa `DataTable` sem paginação, porque o endpoint retorna a coleção completa. A grade estrutural passa a uma coluna abaixo de 900px sem duplicar estado ou fluxo.

Os estados agora são explícitos: forbidden, carregando perfis, erro/retry de perfis, nenhum perfil, nenhum perfil selecionado, carregando usuários, erro/retry de usuários, nenhum usuário e usuários carregados. Cada seleção recebe um identificador de requisição; respostas obsoletas são descartadas.

## Reuso e decisões de componentes

Foram reutilizados `PageCard`, `SectionCard`, `DataTable`, `DataTableCellDirective`, `ConfirmDialogComponent`, `InputTextoRestritoComponent`, `InputTextareaComponent`, `InputOptionsComponent` e `dialog-form-shell.scss`. Do template/Material foram mantidos `mat-nav-list`, `mat-list-item`, botões, ícones, checkboxes, slide toggles, spinner e dialogs.

Nenhum componente compartilhado novo foi criado ou alterado. Não foi criado um master-detail global porque não há evidência de outro consumidor com o mesmo contrato. Também não foi criado avatar específico; a célula projetada do `DataTable` preserva `ImagemUtil.montarUrlImagemPerfil` e o fallback existente.

`InputPesquisa` foi avaliado para o editor de permissões. O editor exige filtragem local imediata e atualização coerente ao alterar uma permissão com “Somente selecionadas” ativo; o debounce do componente compartilhado acrescentaria atraso nesse contrato. Por isso, a busca local permaneceu com o input Material/template já usado na feature, sem alterar o componente global.

Os diálogos de criar/editar e trocar perfil adotaram `dialog-form-shell.scss`. A descrição passou a usar o textarea canônico e a seleção de perfil passou de `mat-select` local para `InputOptionsComponent`. Cancelar fecha o diálogo e descarta o editor, sem `PageFormState` ou snapshot artificial.

## Comportamentos preservados

O master-detail preserva nome, descrição, id e permissões do perfil. Novo, editar e excluir continuam condicionados às permissões `PERFIS_PERMISSOES_CADASTRAR`, `PERFIS_PERMISSOES_EDITAR` e `PERFIS_PERMISSOES_EXCLUIR`; a leitura usa `PERFIS_PERMISSOES_VER`. A troca de perfil do usuário permanece uma ação contextual de edição.

O editor preserva a hierarquia Módulo → Recurso → Permissão, ordenação pelos metadados, expansão manual, expansão inicial de itens selecionados, expansão durante busca/filtro, seleção individual, por recurso, por módulo e apenas das permissões visíveis. Preserva também checked/unchecked/indeterminate, busca por módulo/recurso/título/descrição/ação/chave, “Somente selecionadas”, contadores, catálogo vazio, busca sem resultado, descrição e código. O catálogo segue integralmente orientado por `GET api/permissoes` e `GET api/permissoes/perfil/:id`.

O aviso de proprietário permanece informativo: o proprietário possui acesso total aos módulos ativos independentemente das permissões do perfil. O frontend não altera permissões efetivas nem simula essa autorização.

A exclusão continua consultando `api/perfis/:id/usuarios` antes de confirmar. Perfis com usuários não são excluídos; perfis sem usuários passam pelo `ConfirmDialogComponent`, `DELETE`, feedback e recarga. A validação não depende da tabela atualmente exibida.

A troca de perfil preserva perfil atual, obrigatoriedade, cancelar, retorno de `usuarioId + novoPerfilId`, `PUT api/usuarios/:id/perfil`, feedback e recarga da tela. Ela não incorpora o CRUD de Usuários.

Após atualizar o perfil do usuário logado, `authService.carregarUsuarioCompleto()` continua sendo chamado para atualizar as permissões efetivas da sessão. A falha desse refresh mantém feedback específico depois do salvamento bem-sucedido.

O payload continua sendo `PerfilRequest` com `nome`, `descricao` e uma entrada `{ id, selecionada }` para cada permissão do catálogo. IDs não foram trocados por chaves e permissões desmarcadas não foram omitidas.

## Código morto e dívidas técnicas

Foram removidos apenas estados sem consumidor comprovado no componente principal: `FormGroup`, `editando`, `cancelar()`, `sidebarCollapsed`, `sidebarWidth`, colunas da tabela local e `MatTableDataSource`, junto com imports relacionados.

Permanecem como dívida técnica:

- modelos `Perfil` duplicados em `src/app/models/perfil.model.ts` e `src/app/models/perfil/perfil.model.ts`; não foram consolidados;
- a rota `/page/perfil` exige `PERFIS_PERMISSOES_VER`, enquanto o menu considera qualquer uma das quatro permissões de perfis suficiente para exibir a entrada; a política não foi redefinida nesta migração;
- existem dois componentes com seletor `app-input-textarea`; foi usado o canônico já adotado pelos fluxos recentes, sem consolidação ampla;
- avisos preexistentes da suíte sobre mistura de tipos de nós do Angular Material Tree permanecem fora desta feature.

## Validação automatizada

- Testes focados de `src/app/pages/perfil/**/*.spec.ts`: 32 executados, 32 passaram, 0 falharam.
- Suíte completa final: 464 executados, 464 passaram, 0 falharam.
- Novas falhas em relação à baseline: 0.
- Build: `npm run build`, exit 0.
- TypeScript: `npx tsc --noEmit -p tsconfig.app.json`, exit 0.
- Integridade do diff: `git diff --check`, OK.

Validação visual: pendente de revisão manual pelo responsável do produto.
