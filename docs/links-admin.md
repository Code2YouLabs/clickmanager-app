# ClickLink administrativo

Status: MVP administrativo frontend

## Rotas

- `/page/links`: listagem de páginas ClickLink.
- `/page/links/nova`: criação rápida da primeira ou nova página.
- `/page/links/:id`: editor administrativo da página e dos itens.

As rotas usam o mecanismo existente de módulo ativo com `featureKey: 'LINKS'` e o
`permissionGuard` com as permissões de Links.

## Estrutura

O módulo frontend fica em `src/app/pages/links` com:

- `links.routes.ts`;
- `models/links.models.ts`;
- `services/links.service.ts`;
- `pages/lista`;
- `pages/editor`;
- `components/item-dialog`;
- `utils`.

O service de identidade pública da Empresa fica em `src/app/pages/empresa`, porque slug
e logo continuam pertencendo a Empresa.

## UX mobile-first

A listagem usa cards como experiência principal. O editor usa fluxo vertical no mobile e
apenas expande para layout com painel lateral em telas largas. A ordenação de itens não
depende de drag-and-drop: os botões de mover para cima e para baixo são a operação
principal e funcionam por toque.

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
