# Padronização Frontend - Configurações / Dados da empresa

Projeto: `clickmanager-app`

Branch: `feature/padronizar-dados-empresa`

SHA base: `ee7572a50e292b89103ed8999633001dd8319f7e`

Épico: `#79`

## Baseline

Antes da alteração, a suíte Angular completa foi executada em `develop`:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `597 SUCCESS`.

Falhas preexistentes: `0`.

## Modo Padrão X Onboarding

O modo padrão da rota `/page/empresa` foi migrado para o padrão atual de tela.

O modo onboarding continua embutível e não recebeu `PageCard`, tabs ou footer da página padrão.

Preservados:

- `modoOnboarding`
- `esconderAcoesOnboarding`
- `onboardingSection`
- `isCurrentSectionValid()`
- `onSubmit()`
- `empresaSalva.emit()`
- `onboardingSection=empresa`
- `onboardingSection=logo`
- `onboardingSection=endereco`

O onboarding legado segue usando o mesmo componente `EmpresaFormComponent`.

## Estrutura Final

Modo padrão:

- `PageCard` como shell único.
- `MatTabGroup` preservado.
- Tabs preservadas: Empresa, Identidade Pública, Redes Sociais.
- `SectionCard` nas seções internas.
- Footer dinâmico do `PageCard`.
- Cancelar gerado pelo `PageCard` via `PageFormState`.
- Salvar como `PageCardAction`.

Não há botão Voltar no header, pois a tela é acessada diretamente pelo menu.

Foram removidos do modo padrão:

- `CardHeaderComponent` direto.
- `mat-card` como shell de página.
- footers locais por aba.
- `.empresa-form-actions` no modo padrão.

## PageFormState

O `PageFormState` foi evoluído de forma genérica para suportar:

- snapshot/reset escopado por caminhos do `FormGroup`;
- estado externo opcional como antes;
- `canReset`, permitindo que o `PageCard` desabilite Cancelar quando não houver alterações a descartar.

Contratos anteriores preservados:

- reset tradicional do formulário inteiro;
- `FormArray`;
- disabled/enabled;
- estado externo;
- consumidores existentes.

Essa evolução foi necessária porque Empresa e Redes Sociais compartilham o mesmo `FormGroup`, mas possuem baselines independentes.

## Footer Dinâmico

A aba ativa define o footer:

- Empresa: `Cancelar | Salvar`
- Identidade Pública: `Cancelar | Salvar`
- Redes Sociais: `Cancelar | Salvar`

Empresa:

- Form: `empresa-dados-form`
- Salvar: `type=submit`, `form=empresa-dados-form`

Redes Sociais:

- Form: `empresa-redes-form`
- Salvar: `type=submit`, `form=empresa-redes-form`

Identidade Pública:

- Sem `FormGroup` real de domínio.
- Salvar usa `PageCardAction` `type=button`.
- A ação é tratada por `footerAction`.

## Estados Independentes

Estados preservados e separados:

- `carregandoEmpresa`
- `carregandoIdentidade`
- `salvandoEmpresa`
- `salvandoIdentidade`
- `salvandoRedes`

Adicionados estados explícitos:

- erro de carregamento da Empresa;
- erro de carregamento da Identidade Pública.

Erro em Empresa não derruba Identidade Pública. Erro em Identidade Pública não derruba Empresa nem Redes Sociais.

## Snapshots Por Aba

Depois do GET da empresa, a tela registra baselines separadas:

- Empresa
- Redes Sociais

Depois do GET da identidade pública, a tela registra baseline separada:

- Identidade Pública

Cancelar Empresa restaura somente:

- dados cadastrais;
- contato;
- atendimento;
- endereço.

Cancelar Redes Sociais restaura somente:

- Instagram;
- Facebook;
- YouTube;
- Website.

Cancelar Identidade Pública restaura somente:

- logo original;
- favicon original;
- previews originais;
- arquivos temporários;
- flags de remoção;
- erros locais de mídia.

Não há novo GET no cancelamento.

Depois de salvar uma aba, apenas a baseline daquela aba é atualizada.

## Empresa

Seções migradas para `SectionCard`:

- Dados básicos
- Contato
- Atendimento
- Endereço

Campos preservados:

- Nome da Empresa
- CNPJ/CPF
- Inscrição Estadual
- Telefone
- E-mail
- Horário de Funcionamento
- CEP
- Logradouro
- Número
- Complemento
- Bairro
- Cidade
- Estado

Inputs compartilhados preservados:

- `InputTextoRestrito`
- `InputDocumento`
- `InputTelefone`
- `InputEmail`
- `InputCep`

Validações preservadas:

- nome obrigatório;
- nome mínimo 3;
- telefone obrigatório;
- e-mail obrigatório e válido;
- CNPJ obrigatório com `ValidadorUtil.validarCNPJ`.

ViaCEP continua usando `CepUtilService` e o evento do `InputCep`.

## Identidade Pública

Preservado:

- Nome público somente leitura;
- fallback para nome da empresa;
- Endereço ClickManager via `getClickManagerPublicHost`;
- botão Copiar;
- tratamento de endereço indisponível;
- feedback de cópia com sucesso/falha.

Não foram adicionados:

- Slug público;
- Alterar endereço.

Essas funções continuam fora de Dados da empresa.

## Uploads

Logo pública preserva:

- JPG;
- GIF;
- PNG;
- `ImagemUtil.processarImagemSelecionada(...)`;
- preview;
- nome do arquivo;
- tamanho;
- remover;
- fallback;
- erro local.

Favicon preserva:

- PNG;
- SVG;
- WEBP;
- ICO;
- limite de 1 MB;
- preview;
- nome;
- tamanho;
- remover;
- `favicon.ico` fallback.

## Redes Sociais

Migrado para `SectionCard`.

Campos preservados:

- Instagram;
- Facebook;
- YouTube;
- Website.

A nomenclatura `Website` foi preservada na tela padrão.

## Contratos HTTP

Preservados:

- `GET api/empresas/:id`
- `POST api/empresas`
- `GET api/empresas/identidade-publica`
- `PUT api/empresas/identidade-publica/logo`
- `DELETE api/empresas/identidade-publica/logo`
- `PUT api/empresas/identidade-publica/favicon`
- `DELETE api/empresas/identidade-publica/favicon`

Não houve alteração de backend, endpoint, método HTTP ou payload JSON.

## Permissão

Preservado:

- `DADOS_EMPRESA`
- `permissionGuard`
- `SHARED_ROUTE_DATA`

## Acoplamento Do FormData

O método `montarFormData(false)` continua montando dados de múltiplas áreas do formulário.

Isso significa que tanto salvar Empresa quanto salvar Redes Sociais ainda usam:

`EmpresaFormService.cadastrarEmpresaFormData(...)`

com:

`POST api/empresas`

e `FormData`.

Esse acoplamento foi preservado para não alterar contrato backend nesta tarefa. A tela evita marcar artificialmente outra aba como limpa quando salva apenas o contexto ativo.

## Dívidas Técnicas

- Separar futuramente contratos parciais de Empresa e Redes Sociais caso o backend ofereça endpoints específicos.
- Avaliar se estruturas históricas de logo do cadastro devem ser isoladas do fluxo de identidade pública em uma etapa própria.
- Reduzir imports Material não usados quando a limpeza for feita de forma transversal.

## Testes Do Modo Padrão

Coberto:

- `PageCard` único;
- tabs;
- `SectionCard`;
- ausência de footers locais;
- footer do `PageCard`;
- loading, erro e retry;
- preenchimento de dados;
- validators;
- CEP;
- salvar Empresa com `FormData`;
- dirty e baseline de Empresa;
- Identidade Pública independente;
- favicon e logo;
- salvar/remover logo;
- salvar/remover favicon;
- salvar ambos;
- cancelar por aba;
- isolamento entre Empresa, Identidade Pública e Redes Sociais;
- Website;
- form ids do footer.

## Testes De Regressão Do Onboarding

Coberto:

- modo onboarding sem `PageCard`;
- sem tabs;
- sem footer padrão;
- seção empresa;
- seção logo;
- seção endereço;
- `isCurrentSectionValid()`;
- `esconderAcoesOnboarding`;
- `onSubmit()`;
- `empresaSalva`;
- seleção/remoção da logo do onboarding preservadas no template.

## Validações

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/components/page-card/**/*.spec.ts' --include='src/app/pages/empresa/empresa-form.component.spec.ts'`

Resultado: `30 SUCCESS`.

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/empresa/**/*.spec.ts'`

Resultado: `16 SUCCESS`.

`npm run build`

Resultado: sucesso. O build mantém warnings preexistentes em áreas fora do escopo e dependências CommonJS.

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `604 SUCCESS`.

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`git diff --check`

Resultado: sucesso.

Validação visual: pendente de revisão manual pelo responsável do produto.
