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
e logo continuam pertencendo a Empresa. ClickLink consome a identidade pública da
Empresa, mas não administra diretamente essa identidade.

## UX mobile-first e padrão visual

A listagem segue o padrão administrativo usado em Produtos/Clientes: card principal,
header interno com divisor e tabela Material no desktop. Em mobile, a listagem vira
cards estruturados para evitar rolagem horizontal. Criar página é uma ação da tela de
Páginas, não um item de menu. As ações frequentes ficam diretas como `Editar` e
`Compartilhar`; `Abrir` e ações de estado ficam no menu `⋮`. Ícones de ação usam
tooltip para manter legenda acessível sem poluir a tabela.

O editor usa header padrão com `Voltar` e preview mobile. `Salvar` e `Cancelar` ficam no
footer do formulário, seguindo o padrão visual dos cadastros. `Cancelar` restaura apenas
o formulário da página para o snapshot persistido; operações de itens continuam sendo
salvas individualmente. O conteúdo foi organizado em abas Material:

- `Geral`: título, descrição, identidade read-only, endereço público read-only,
  publicação e ações avançadas;
- `Links`: itens exibidos na página pública, sugestões a partir dos dados existentes da
  Empresa, ações e ordenação;
- `Aparência`: tema, cor de destaque, cor de fundo, formato dos botões e acesso ao
  preview;
- `Compartilhar`: URL pública, copiar link, abrir página, QR Code e download.

Publicar/Despublicar ficam na seção `Publicação` da aba `Geral`. Publicar exige que o
formulário esteja salvo para evitar publicar dados antigos enquanto o preview mostra
alterações locais. Arquivar fica separado em `Ações avançadas`, com confirmação e estilo
destrutivo, sem competir com Salvar/Publicar.

O preview mobile é aberto por botão e usa o mesmo view model em dialog. Em desktop, o
dialog apresenta uma moldura visual de celular; em mobile, o preview ocupa a tela útil
com opção de fechar. A ordenação de itens continua por botões subir/descer e funciona
por toque.

A aba `Links` pode sugerir itens a partir dos dados administrativos já cadastrados na
Empresa, como telefone, e-mail, site, Instagram, Facebook, YouTube e endereço. Handles
de Instagram (`@empresa`) e sites sem protocolo (`www.exemplo.com`) são normalizados para
URLs clicáveis. Endereços geram opções separadas para Google Maps e Waze. Essas sugestões
apenas criam itens normais do ClickLink quando acionadas; não alteram os dados da Empresa
e não criam contrato novo no backend.

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
`{publicSiteBaseUrl}/l/{slug}`. A listagem e o editor reutilizam o mesmo painel de
compartilhamento para copiar link, abrir página, gerar QR Code e baixar PNG. O QR Code
é gerado localmente com `qrcode`, codifica apenas a URL canônica e não possui
persistência no backend.

O endereço público é read-only no ClickLink. Se a Empresa ainda não possuir slug, a UI
orienta configurar os dados da empresa antes de publicar ou compartilhar. Evoluções como
geração automática, personalização controlada, redirect de slug antigo e permissão
específica de slug ficam fora do MVP administrativo atual.

## Preview público

O preview do admin deve espelhar o renderer público `/l/{slug}`. O renderer público é a
referência canônica para estrutura de identidade, degradê de topo atrás da logo, tipografia,
espaçamentos, botões, ícones por tipo, tema, cor de destaque, cor de fundo e formato
dos botões. A composição atual omite nome da Empresa quando ele repete o título,
remove texto auxiliar `Abrir` dos itens porque o card inteiro é clicável, limita
subtítulos longos e usa a cor de destaque como acento visual. A diferença aceitável é
apenas o container externo do preview dentro do admin.

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

- `DADOS_EMPRESA`: permanece do módulo Empresa. ClickLink não expõe alteração inline de
  slug ou logo, mesmo que o usuário possua essa permissão.

## Limites do MVP

O admin não implementa page builder, HTML customizado, CSS livre, UTMs, visitantes
únicos, exportação de analytics, domínio customizado de ClickLink ou múltiplas páginas
públicas por sub-slug. O QR Code é apenas uma representação local da URL pública
canônica e não cria entidade no backend.

Validações de URL e tenant no frontend existem para ergonomia, mas a autoridade final é
sempre o backend.
