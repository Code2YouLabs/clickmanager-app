# Padronização Frontend - Configurações / Presença Pública

Projeto: `clickmanager-app`

Branch: `feature/padronizar-presenca-publica`

SHA base: `7687a028f03f0d9d7e3f9b0dd7edd2cb3266012f`

Épico: `#79`

## Escopo

Tela migrada:

- `/page/config/presenca-publica`

Componente:

- `PresencaPublicaComponent`

Serviço preservado:

- `PresencaPublicaService`

Modelos preservados:

- `PresencaPublicaResponse`
- `PresencaPublicaDominioProprioRequest`
- `PresencaPublicaSlugDisponivelResponse`
- `PresencaPublicaSlugRequest`

Contratos HTTP preservados:

- `GET api/presenca-publica`
- `GET api/presenca-publica/slug-disponivel?slug=...`
- `PUT api/presenca-publica/slug`
- `PUT api/presenca-publica/dominio-proprio`
- `DELETE api/presenca-publica/dominio-proprio`

Não foram alterados:

- backend;
- rota `/page/config/presenca-publica`;
- `permissionGuard`;
- `SHARED_ROUTE_DATA`;
- permissão `DADOS_EMPRESA`;
- domínio fixo `clickmanager.com.br`.

## Baseline

Antes das alterações, `develop` e `origin/develop` foram confirmados no mesmo SHA:

`7687a028f03f0d9d7e3f9b0dd7edd2cb3266012f`

Baseline executada antes da alteração:

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `610 SUCCESS`.

Falhas preexistentes: nenhuma.

## Estrutura Anterior

A tela usava:

- `mat-card` local;
- `CardHeader` separado;
- seção customizada;
- formulário com submit local;
- botão local `Alterar`;
- estilos locais para shell/seção/badge.

O erro de carregamento era comunicado principalmente por toast e poderia deixar a tela sem estado explícito no conteúdo.

## Estrutura Final

A tela passou a usar:

- `PageCard` como shell, header, conteúdo e footer;
- `SectionCard` para a seção `Endereço ClickManager`;
- `StatusBadge` para o status `ATIVO`;
- `PageFormState` para o ciclo de edição/cancelamento.

Não foram criados:

- componente novo;
- shell novo;
- footer novo;
- botão local de salvar;
- fluxo mobile paralelo.

## PageCard

O header usa:

- título: `Presença Pública`;
- subtítulo: `Gerencie os endereços usados para acessar os recursos públicos da empresa.`

O footer é do `PageCard`:

- `Cancelar` gerado pelo `PageFormState`;
- `Salvar` via `PageCardAction` submit;
- `form="presenca-publica-form"`;
- sem handler local de cancelar;
- sem botão `Alterar`.

O submit principal acontece apenas por:

`<form id="presenca-publica-form" [formGroup]="form" (ngSubmit)="salvarSlug()">`

## SectionCard

A seção única usa:

- título: `Endereço ClickManager`;
- subtítulo: `Escolha o subdomínio público da empresa. O final .clickmanager.com.br é fixo.`

Permanecem como ações contextuais dentro da seção:

- `Consultar`;
- `Copiar`.

Essas ações não foram movidas para o footer.

## PageFormState

A tela usa `PageFormState` em modo `edit`.

Fluxo:

- `begin('edit')` antes do GET;
- `loaded()` depois do carregamento;
- `reset()` pelo Cancelar do `PageCard`;
- sem novo GET ao cancelar;
- sem navegação ao cancelar.

Estado extra registrado:

- `slugConsultado`.

Cancelar restaura:

- slug persistido;
- estado transitório de disponibilidade.

Também limpa o feedback de disponibilidade quando a alteração é descartada.

## Slug

Foram preservados:

- `required`;
- `maxlength(80)`;
- `pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)`;
- `catalogoSlugify()`;
- `normalizarSlugDigitado()`;
- `dominioFixo`;
- sufixo visual `.clickmanager.com.br`.

`InputTextoRestrito` foi avaliado, mas não foi aplicado porque este campo combina normalização por slugify, sufixo fixo visual, validação por regex e consulta remota de disponibilidade. Manter o `mat-form-field` local evita perder comportamento específico.

## Prévia

O texto do bloco foi ajustado para:

`Prévia do endereço`

porque o valor digitado pode ainda não estar salvo. A prévia continua usando:

- valor digitado;
- ou slug persistido;
- `slugPreviewHost`.

## Consulta De Disponibilidade

Fluxo preservado:

- normaliza slug;
- valida campo;
- consulta backend;
- mostra disponível, indisponível ou erro.

Slug igual ao persistido:

- não chama backend;
- considera válido;
- mostra `Este já é o endereço atual da empresa.`

Enquanto consulta:

- bloqueia nova consulta;
- indica estado pending no botão.

## Proteção Contra Resposta Obsoleta

A consulta agora usa um identificador de geração.

Uma resposta só é aplicada quando:

- pertence à última consulta vigente;
- corresponde ao valor atual do campo.

Se o usuário alterar o campo antes da resposta, a resposta antiga não:

- marca o novo valor como disponível;
- sobrescreve o campo;
- valida uma consulta de outro slug;
- habilita salvar indevidamente.

## Salvar

Endpoint preservado:

`PUT api/presenca-publica/slug`

Payload preservado:

```json
{
  "slug": "minha-empresa"
}
```

Salvar exige:

- form válido;
- slug alterado;
- consulta de disponibilidade válida;
- `slugConsultado.disponivel === true`;
- `slugConsultado.slug === valor atual`;
- não estar consultando;
- não estar salvando.

Após sucesso:

- aplica resposta do backend;
- atualiza `presenca`;
- atualiza o form;
- limpa `slugConsultado`;
- atualiza baseline do `PageFormState`.

Assim, depois de salvar `empresa-b`, cancelar uma alteração posterior volta para `empresa-b`, não para o valor inicial carregado.

Erro no save:

- mantém valor digitado;
- mantém consulta válida correspondente;
- libera nova tentativa.

## Copiar

Preservado:

- `navigator.clipboard`;
- cópia de `slugPreviewHost`;
- toast `Endereço copiado.`;
- toast `Não foi possível copiar o endereço.`

Copiar continua sendo ação contextual, sem navegação e fora do footer.

## Estados

Foram adicionados estados explícitos:

- loading;
- erro com retry;
- forbidden;
- content.

Falha no `GET api/presenca-publica` não renderiza formulário vazio.

Retry chama apenas:

`carregar()`

sem reload da aplicação.

Quando o GET retorna 403, a tela exibe estado de acesso restrito em vez de erro genérico.

## Domínio Próprio Latente

O service e os models de domínio próprio foram preservados porque podem ter consumidores ou uso futuro:

- `dominioProprio`;
- `dominioProprioAtivo`;
- `configurarDominioProprio()`;
- `removerDominioProprio()`.

A UI de domínio próprio não foi reintroduzida.

Não foram criados:

- configuração de DNS;
- SSL;
- ativação/desativação de domínio próprio;
- controles de domínio próprio no template.

Situação registrada como dívida técnica/código latente para decisão futura.

## Responsividade

Não houve redesign mobile.

Foram preservados estilos locais apenas para:

- campo de subdomínio com sufixo;
- ações contextuais;
- preview;
- feedback de disponibilidade.

O shell, seção e footer seguem os componentes compartilhados.

## Testes Focados

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/config/presenca-publica/presenca-publica.component.spec.ts'`

Resultado: `12 SUCCESS`.

Cobertura adicionada:

- PageCard único;
- SectionCard;
- footer Cancelar + Salvar;
- ausência de botão local `Alterar`;
- loading/error/retry/forbidden;
- validators;
- normalização via `catalogoSlugify`;
- domínio fixo;
- prévia;
- slug atual sem request;
- disponível/indisponível;
- resposta obsoleta ignorada;
- save bloqueado sem consulta válida;
- payload correto;
- baseline após save;
- erro no save preservando dados;
- cancelar sem novo GET;
- clipboard sucesso/falha;
- domínio próprio latente fora da UI.

## Validações

`npx tsc --noEmit -p tsconfig.app.json`

Resultado: sucesso.

`npm test -- --watch=false --browsers=ChromeHeadless`

Resultado: `618 SUCCESS`.

Novas falhas: `0`.

`npm run build`

Resultado: sucesso. Permanecem warnings preexistentes fora do escopo desta tela, incluindo optional/nullish chains, imports não utilizados, avisos Sass e dependências CommonJS.

`git diff --check`

Resultado: sucesso.

Validação visual: pendente de revisão manual pelo responsável do produto.
