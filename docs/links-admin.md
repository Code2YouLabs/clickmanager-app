# ClickLink administrativo

Status: MVP administrativo frontend com analytics simples

## Rotas

- `/page/links`: redireciona para Páginas.
- `/page/links/paginas`: listagem de páginas ClickLink.
- `/page/links/nova`: criação de página.
- `/page/links/:id`: editor administrativo da página e dos itens.
- `/page/links/analytics`: dashboard simples de analytics.

As rotas usam o mecanismo existente de módulo ativo com `featureKey: 'LINKS'` e o
`permissionGuard` com as permissões de Links.

O menu lateral usa o padrão expansível do sistema:

```text
ClickLink
├── Páginas
└── Analytics
```

## Estrutura

O módulo frontend fica em `src/app/pages/links` com:

- `links.routes.ts`;
- `models/links.models.ts`;
- `services/links.service.ts`;
- `pages/lista`;
- `pages/editor`;
- `components/item-dialog`;
- `components/public-preview`;
- `components/preview-dialog`;
- `utils`.

O service de identidade pública da Empresa fica em `src/app/pages/empresa`, porque slug
e logo continuam pertencendo a Empresa.

## UX mobile-first e padrão visual

A listagem segue o padrão administrativo usado em Produtos/Clientes: `CardHeader`,
card principal, header interno com divisor e tabela Material no desktop. Em mobile, a
listagem vira cards estruturados para evitar rolagem horizontal. Criar página é uma ação
da tela de Páginas, não um item de menu.

O editor usa header padrão com `Voltar`, ações de publicação e `Salvar` em local
previsível. O conteúdo foi organizado em abas Material:

- `Geral`: título, descrição, logo e endereço público;
- `Links`: itens exibidos na página pública, ações e ordenação;
- `Aparência`: tema, cor de destaque, cor de fundo, formato dos botões e preview;
- `Compartilhar`: URL pública, copiar link, abrir página, QR Code e download.

Em desktop, o preview mobile fica ao lado das configurações na aba Aparência. Em mobile,
a ação `Visualizar` abre o mesmo view model em dialog fullscreen. A ordenação de itens
continua por botões subir/descer e funciona por toque.

## Aparência

O admin envia e recebe os campos de aparência do backend:

- `tema`: `CLARO` ou `ESCURO`;
- `corPrincipal`: `#RRGGBB`;
- `corFundo`: `#RRGGBB`;
- `formatoBotao`: `ARREDONDADO`, `SUAVE` ou `QUADRADO`.

Os defaults compartilhados do MVP são `CLARO`, `#0D6EFD`, `#F6F8FB` e
`ARREDONDADO`. O frontend valida `#RRGGBB`, mas o backend continua sendo a autoridade.

## Compartilhamento

A URL pública canônica é montada por `buildClickLinkPublicUrl` como
`{publicSiteBaseUrl}/l/{slug}`. O editor permite copiar link, abrir página, gerar QR
Code e baixar PNG. O QR Code é gerado localmente com `qrcode`, codifica apenas a URL
canônica e não possui persistência no backend.

## Analytics

Analytics saiu do editor e possui página dedicada em `/page/links/analytics`. A tela
permite selecionar a página, alternar entre `7 dias` e `30 dias`, exibir métricas
principais em cards e mostrar ranking simples por link. O endpoint consumido é:

```text
GET /api/links/paginas/{id}/analytics?periodo=7d|30d
```

O período padrão é `30d`. A interface oferece `7 dias` e `30 dias`, mostra
visualizações, cliques, taxa de clique e ranking por item com ícone, título, tipo e
quantidade. O frontend não calcula a métrica principal quando o backend já retorna a
autoridade (`taxaClique`). Não há gráficos complexos, visitantes únicos, UTMs ou dados
por dispositivo no MVP.

Se não houver dados, o editor mostra estado vazio. Se a requisição falhar, mostra erro
local com ação `Tentar novamente`, sem derrubar o restante do editor.

## Permissões

Links:

- `LINKS_VER`: acessar listagem/editor;
- `LINKS_CRIAR`: criar página;
- `LINKS_EDITAR`: editar página e itens;
- `LINKS_PUBLICAR`: publicar/despublicar;
- `LINKS_EXCLUIR`: arquivar página.

Empresa:

- `DADOS_EMPRESA`: alterar slug e logo pela experiência inline.

Usuários sem `DADOS_EMPRESA` podem visualizar identidade retornada pelo detalhe de Links,
mas não recebem ações de alteração de slug/logo.

## Limites do MVP

O admin não implementa page builder, HTML customizado, CSS livre, UTMs, visitantes
únicos, exportação de analytics, domínio customizado de ClickLink ou múltiplas páginas
públicas por sub-slug. O QR Code é apenas uma representação local da URL pública
canônica e não cria entidade no backend.

Validações de URL e tenant no frontend existem para ergonomia, mas a autoridade final é
sempre o backend.
