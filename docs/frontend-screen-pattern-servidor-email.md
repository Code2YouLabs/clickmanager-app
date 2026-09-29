# Padronização Frontend - Configurações / Servidor de E-mail

Projeto: `clickmanager-app`

Branch: `feature/padronizar-servidor-email`

SHA base: `b9470c920bff28bd845f0bcac32bf5f25e602d1b`

Épico: `#79`

## Escopo

Tela migrada:

- `/page/config/email-servidor`

Componentes:

- `EmailServidorComponent`
- `EmailServidorTesteDialogComponent`

Serviço preservado:

- `EmailServidorService`

Contratos HTTP preservados:

- `GET api/config/email-servidor`
- `PUT api/config/email-servidor`
- `POST api/config/email-servidor/teste`

Não foram alterados:

- backend;
- rota `/page/config/email-servidor`;
- `permissionGuard`;
- `GRAFICA_ROUTE_DATA`;
- permissão `CONFIG_EMAIL`;
- segmento exclusivo `GRAFICA`;
- política SMTP/SSL/TLS.

## Baseline

Antes das alterações, `develop` e `origin/develop` foram confirmados no mesmo SHA:

`b9470c920bff28bd845f0bcac32bf5f25e602d1b`

Baseline executada antes da alteração:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `631 SUCCESS`.

Falhas preexistentes: nenhuma.

## Estrutura Anterior

A tela usava:

- `mat-card` local;
- `CardHeader` direto;
- botão `Voltar` para dashboard;
- form único sem estados explícitos;
- botão local `Testar configuração`;
- footer manual `Cancelar` e `Salvar`;
- `cancelar()` com navegação;
- senha em `InputTextoRestrito`.

O GET comunicava erro por toast e poderia deixar o formulário com defaults aparentando configuração real.

## Estrutura Final

A tela passou a usar:

- `PageCard` como shell, header, conteúdo e footer;
- `SectionCard` para `Servidor SMTP`;
- `SectionCard` para `Credenciais e remetente`;
- `PageFormState` para o ciclo de edição/cancelamento;
- estados explícitos de loading, erro com retry e acesso restrito;
- `InputPassword` para senha.

Não foram criados:

- componente novo;
- shell novo;
- footer novo;
- input SMTP específico;
- input de senha específico;
- fluxo mobile paralelo.

## PageCard

O header usa:

- título: `Servidor de E-mail`;
- subtítulo: `Configure o servidor SMTP usado pelo ClickManager para envio de e-mails.`

O footer é do `PageCard`:

- `Cancelar` gerado pelo `PageFormState`;
- `Salvar` via `PageCardAction` submit;
- `form="email-servidor-form"`;
- sem handler local de cancelar;
- sem botão local de salvar;
- sem botão `Voltar`.

O submit principal acontece apenas por:

`<form id="email-servidor-form" [formGroup]="form" (ngSubmit)="salvar()">`

## PageFormState

A tela usa `PageFormState` em modo `edit`.

Fluxo:

- `begin('edit')` antes do GET;
- `loaded()` depois do carregamento;
- `reset()` pelo Cancelar do `PageCard`;
- sem novo GET ao cancelar;
- sem navegação ao cancelar.

Cancelar restaura:

- `id`;
- `host`;
- `porta`;
- `usuario`;
- `senha`;
- `remetente`;
- `usarSsl`.

## Baseline

O `PUT api/config/email-servidor` retorna `void`.

Depois de salvar com sucesso:

- o estado atual validado do formulário vira a nova baseline;
- `form.markAsPristine()` é chamado;
- `PageFormState.loaded()` registra o snapshot salvo;
- não é feito GET adicional para estabelecer baseline.

Teste coberto:

- carregar A;
- alterar B;
- salvar B;
- alterar C;
- Cancelar;
- resultado B.

## Servidor SMTP

Seção `Servidor SMTP` contém:

- Host;
- Porta;
- Usar SSL/TLS.

Inputs reutilizados:

- Host: `InputTextoRestrito`;
- Porta: `InputNumerico`;
- SSL/TLS: `mat-checkbox`.

Validações preservadas:

- host obrigatório;
- porta obrigatória;
- porta mínima `1`;
- `usarSsl` default `true`.

## Credenciais E Remetente

Seção `Credenciais e remetente` contém:

- Usuário (e-mail);
- Senha;
- Remetente padrão.

Inputs reutilizados:

- Usuário: `InputEmail`;
- Senha: `InputPassword`;
- Remetente: `InputEmail`.

Validações preservadas:

- usuário obrigatório e e-mail válido;
- senha obrigatória;
- remetente obrigatório e e-mail válido.

Senha:

- não é tratada como texto comum;
- não é registrada em log;
- não aparece em toast;
- não foi documentado valor real ou máscara;
- o contrato recebido do backend é preservado.

## Loading / Erro / Retry

Estados explícitos:

- carregando;
- acesso restrito;
- erro com retry;
- conteúdo.

Falha no GET:

- não renderiza formulário com defaults;
- exibe erro no conteúdo;
- mantém toast apenas como feedback complementar.

Retry:

- chama somente `carregar()`;
- não recarrega a aplicação;
- não navega.

## Saving / Dirty

Estados separados:

- `carregando`;
- `salvando`;
- `testando`.

Salvar fica indisponível quando:

- carregando;
- salvando;
- testando;
- erro;
- acesso restrito;
- formulário inválido;
- nenhuma alteração.

Duplo submit de salvar é bloqueado enquanto o `PUT` está pendente.

Em erro de salvar:

- os dados digitados permanecem no formulário;
- uma nova tentativa fica disponível.

## Testar Configuração

`Testar configuração` é ação contextual da seção `Credenciais e remetente`.

Não fica no footer.

Fluxo preservado:

- usa os valores atuais do formulário;
- permite testar alterações ainda não salvas;
- não exige salvar antes de testar;
- form inválido marca campos, mostra warning e não abre dialog;
- teste bem-sucedido não altera a baseline.

Payload preservado:

- `emailDestino`;
- `mensagem`;
- `id`;
- `host`;
- `porta`;
- `usuario`;
- `senha`;
- `remetente`;
- `usarSsl`.

Enquanto o `POST /teste` está pendente:

- `testando` fica ativo;
- novo `POST /teste` é bloqueado;
- o formulário não é desabilitado permanentemente.

Feedback preservado:

- sucesso: `E-mail de teste enviado. Verifique a caixa de entrada de {destinatário}.`;
- erro: `userMessage` ou fallback;
- mensagens do frontend não adicionam host, senha ou credenciais.

## Dialog De Teste

O dialog continua contextual e não usa `PageCard` nem `PageFormState`.

Foi padronizado com:

- `dialog-form-shell.scss`;
- form real;
- submit por `form`.

Form:

`<form id="email-servidor-teste-form" [formGroup]="form" (ngSubmit)="enviar()">`

Botão Enviar:

- `type="submit"`;
- `form="email-servidor-teste-form"`.

Cancelar:

- fecha o dialog;
- não dispara request.

Destinatário:

- default vem de `authService.usuario$`;
- quando usuário não possui e-mail, abre vazio;
- `required` e `email` preservados.

Mensagem:

- default preservado;
- `required` preservado;
- `minLength(5)` preservado;
- `InputTextarea` reutilizado.

## Campo Id

O código antigo tentava enviar:

`id: (config as any).id`

O campo `id` não fazia parte da interface nem do `FormGroup`.

Decisão:

- `id` foi modelado como opcional em `EmailServidorConfig`;
- o `FormGroup` mantém `id`;
- se o GET retornar `id`, ele é preservado no `PUT` e no teste;
- se o GET não retornar `id`, o payload segue sem `id`.

Não foi criada regra especial para máscara de senha ou alteração parcial.

## Método POST Salvar

O service mantém:

- `salvar()` usando `POST api/config/email-servidor`;
- `atualizar()` usando `PUT api/config/email-servidor`.

Auditoria:

- a tela atual usa somente `atualizar()`;
- não há consumidor encontrado para `EmailServidorService.salvar()`;
- o método foi preservado para evitar limpeza transversal fora do escopo.

## Segmento E Permissão

Rota preservada:

- `GRAFICA_ROUTE_DATA`;
- `requiredPermission: ['CONFIG_EMAIL']`;
- `permissionGuard`.

Menu preservado:

- item `Servidor de E-mail`;
- rota `/page/config/email-servidor`;
- `requiredPermission: ['CONFIG_EMAIL']`;
- `allowedEmpresaTipos: [TipoEmpresa.GRAFICA]`.

Não foi disponibilizado para Depósito.

## Cobertura

Foram cobertos por testes:

- rota exclusiva da Gráfica com `CONFIG_EMAIL`;
- menu exclusivo da Gráfica;
- GET e preenchimento do formulário;
- loading/error/retry/forbidden;
- validações dos campos;
- senha com `InputPassword`;
- `PageCard`, `SectionCard`, footer canônico e submit por form id;
- cancelamento restaurando campos sem navegação nem GET;
- save por `PUT`, payload, saving e bloqueio de duplo submit;
- erro no save preservando alterações;
- baseline após save;
- teste usando valores atuais não salvos;
- teste inválido sem abrir dialog;
- destinatário default e usuário sem e-mail;
- mensagem padrão;
- `POST /teste`, pending e bloqueio de duplo POST;
- sucesso e erro do teste;
- teste não mudando baseline;
- dialog com `InputEmail`, `InputTextarea`, required, email, minLength, cancelar e submit por form.

## Validações

`npm test -- --watch=false --browsers=ChromeHeadless`

Baseline: `631 SUCCESS`.

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/config/email-servidor/email-servidor.component.spec.ts' --include='src/app/pages/config/email-servidor/email-servidor-teste-dialog.component.spec.ts' --include='src/app/layouts/full/vertical/sidebar/sidebar-menu.spec.ts'`

Resultado: `28 SUCCESS`.

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `652 SUCCESS`.

`npm run build`

Resultado: sucesso, com warnings preexistentes fora do escopo da tela.

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`git diff --check`

Resultado: sucesso.

Novas falhas: `0`.

Validação visual: pendente de revisão manual pelo responsável do produto.
