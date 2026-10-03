# Padronização Frontend - Configurações / Presença Pública

Projeto: `clickmanager-app`

Branch da finalização #82: `feature/82-finalizar-presenca-publica`

Tela:

- `/page/config/presenca-publica`

Componentes principais:

- `PresencaPublicaComponent`
- `AlterarEnderecoPublicoDialogComponent`

Serviço preservado:

- `PresencaPublicaService`

## Contratos

Contratos HTTP preservados:

- `GET api/presenca-publica`
- `GET api/presenca-publica/slug-disponivel?slug=...`
- `PUT api/presenca-publica/slug`
- `PUT api/presenca-publica/dominio-proprio`
- `DELETE api/presenca-publica/dominio-proprio`

Contrato auxiliar de publicação:

- `GET api/site/config`

O domínio ClickManager público é montado a partir de `environment.publicBaseDomain`.

## Estrutura Atual

A página usa `PageCard` como shell.

Header:

- título: `Presença Pública`
- subtítulo: `Gerencie como sua empresa é acessada publicamente.`

A tela principal é uma tela de visualização e resumo. Ela não possui:

- formulário inline de slug;
- `PageFormState`;
- footer de `Cancelar` e `Salvar`;
- `SectionCard` forçado para a composição principal;
- consulta de disponibilidade na primeira visão.

Responsabilidades do `PresencaPublicaComponent`:

- carregar presença pública;
- carregar status informativo do Site Público;
- montar URL pública e URL local;
- abrir URL;
- copiar URL;
- abrir o dialog de alteração;
- aplicar a resposta retornada pelo dialog sem novo `GET`.

## Resumo Do Endereço

O bloco principal destaca:

- ícone de globo;
- `Endereço público`;
- URL completa `https://{slug}.{environment.publicBaseDomain}`;
- descrição `Seu endereço público ClickManager.`;
- status compacto de publicação.

Ações:

- `Abrir site`;
- `Copiar endereço`;
- `Alterar endereço`.

`Abrir site` e `Copiar endereço` são ações de consulta e não dependem de permissão de edição.

## Status De Publicação

Presença Pública não controla `siteAtivo`.

Ownership preservado:

- Presença Pública gerencia slug, subdomínio ClickManager, host e domínio próprio latente;
- Meu Site -> Configurações gerencia `siteAtivo`, conteúdo, publicação, orçamento e WhatsApp.

Quando `siteAtivo === true`, a tela mostra apenas estado compacto:

- `Site publicado`

Quando `siteAtivo !== true`, a tela mostra:

- `Site não publicado`;
- mensagem informando que o endereço está reservado;
- CTA `Configurar publicação` para `/page/site/configuracoes`.

Não há toggle de publicação nesta tela.

Se `GET api/site/config` falhar, a tela preserva o resumo do endereço e apenas omite o estado de publicação.

## Ambiente De Desenvolvimento

O bloco de ambiente local renderiza somente quando `environment.production === false`.

Conteúdo:

- `Ambiente de desenvolvimento`;
- `${environment.publicSiteBaseUrl}/loja/{slug}`;
- ações `Abrir` e `Copiar`.

Em produção não há referência visual a `localhost` ou URL local.

## Dialog De Alteração

`AlterarEnderecoPublicoDialogComponent` fica em:

- `src/app/pages/config/presenca-publica/components`

Arquivos:

- `alterar-endereco-publico-dialog.component.ts`
- `alterar-endereco-publico-dialog.component.html`
- `alterar-endereco-publico-dialog.component.scss`
- `alterar-endereco-publico-dialog.component.spec.ts`

O dialog usa o padrão visual de `dialog-form-shell.scss` e não usa:

- `PageCard`;
- `PageFormState`;
- `ConfirmDialogComponent`;
- modal sobre modal.

## Dialog - Pesquisa

Ao abrir, o dialog começa limpo:

- sem `slugConsultado`;
- sem resultado anterior;
- sem draft anterior.

Mostra:

- título `Alterar endereço público`;
- texto `Consulte um novo endereço antes de aplicá-lo à sua empresa.`;
- endereço atual;
- campo `Novo subdomínio`;
- sufixo `.{environment.publicBaseDomain}`;
- ação `Verificar disponibilidade`.

Validações preservadas:

- `required`;
- `maxlength(80)`;
- `pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)`;
- `catalogoSlugify()`.

Durante a consulta:

- botão mostra `Verificando...`;
- segunda consulta concorrente é impedida;
- respostas obsoletas são ignoradas se o campo mudou antes do retorno.

Resultado indisponível:

- `Esse endereço já está em uso.`

Resultado disponível:

- `{slug}.{dominio} está disponível`
- botão `Usar este endereço` habilitado.

Alterar o campo depois de uma consulta invalida o resultado anterior.

## Dialog - Confirmação

Ao clicar `Usar este endereço`, o mesmo dialog muda para a etapa:

- `Confirmar alteração`

Mostra visualmente:

- endereço atual;
- seta;
- novo endereço;
- aviso `Links compartilhados com o endereço anterior podem deixar de funcionar.`

Ações:

- `Voltar`;
- `Confirmar alteração`.

`Voltar` retorna para a pesquisa, preserva a consulta e não consulta novamente.

## PUT Do Slug

Endpoint:

`PUT api/presenca-publica/slug`

Payload:

```json
{
  "slug": "minha-grafica"
}
```

Não é enviado `empresaId`.

Durante o PUT:

- botão mostra `Confirmando...`;
- `Voltar` fica desabilitado;
- fechar o dialog fica bloqueado;
- double-submit é impedido.

Sucesso:

- dialog fecha retornando `PresencaPublicaResponse`;
- componente pai aplica a resposta;
- URL atual e URL local passam a refletir o novo slug;
- toast `Endereço público alterado com sucesso.`;
- não há novo `GET`.

Erro:

- dialog permanece aberto;
- slug escolhido é preservado;
- mensagem de erro é exibida;
- retry fica liberado.

## Domínio Próprio

Domínio próprio permanece fora da UI desta etapa.

Preservados no service/model por compatibilidade e uso futuro:

- `dominioProprio`;
- `dominioProprioAtivo`;
- `configurarDominioProprio()`;
- `removerDominioProprio()`.

Não foram adicionados:

- DNS;
- SSL;
- ativação/desativação de domínio próprio;
- controles de domínio próprio no template.

## Testes Focados

Specs de página cobrem:

- carregamento da presença;
- resumo do endereço atual;
- status publicado/não publicado;
- abrir URL;
- copiar URL;
- ambiente local oculto em produção;
- ambiente local visível em desenvolvimento;
- abertura do dialog;
- resposta do dialog atualizando endereço sem novo `GET`;
- cancelamento do dialog sem alteração;
- erro/retry;
- forbidden.

Specs de dialog cobrem:

- abertura com endereço atual;
- campo vazio/inválido;
- slugify;
- consulta;
- pending;
- stale response;
- indisponível;
- disponível;
- alteração do campo invalidando consulta;
- `Usar este endereço` desabilitado sem consulta;
- troca para confirmação;
- confirmação com endereço atual + novo;
- `Voltar` preservando consulta;
- `Cancelar` sem PUT;
- `Confirmar alteração` com PUT único;
- payload sem `empresaId`;
- double-submit bloqueado;
- sucesso retornando response;
- erro mantendo dialog aberto.

Resultado focado após este refinamento:

`npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/config/presenca-publica/**/*.spec.ts'`

Resultado: `28 SUCCESS`.

## Validações

Validações obrigatórias deste refinamento:

- `npm test -- --watch=false --browsers=ChromeHeadless`
- `npm run build`
- `npx tsc --noEmit -p tsconfig.app.json`
- `git diff --check`

Validação visual: pendente de revisão manual pelo responsável do produto.
