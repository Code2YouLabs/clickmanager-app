# Inventário de consumidores — cabeçalho contextual mobile

Busca por selectors em templates externos e inline de `src/app/pages`, sem testes. Contagens indicam arquivos, não instâncias ou rotas. Nenhum desses arquivos foi migrado individualmente, exceto a composição do piloto Comercial.

| Componente | Arquivos consumidores |
|---|---:|
| `app-page-card` | 77 |
| `app-card-header` | 21 |
| `app-list-filter-bar` | 2 |
| `app-data-table` | 19 |
| `app-view-mode-toggle` | 2 |

## Adoção dos filtros

| Arquivo | Enquadramento |
|---|---|
| `src/app/pages/clicktv/components/midias/clicktv-midias.component.html` | PageCard padrão: acionador automático no cabeçalho quando há filtros |
| `src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html` | Sem PageCard ancestral neste template: mantém composição própria/acionador local |
| `src/app/pages/billing/minha-assinatura/minha-assinatura.component.html` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html` | PageCard padrão: acionador automático no cabeçalho quando há filtros |
| `src/app/pages/clicktv/components/telas/clicktv-telas.component.html` | PageCard padrão: acionador automático no cabeçalho quando há filtros |
| `src/app/pages/cliente/listar-cliente/listar-cliente.component.html` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/grafica/categorias/grafica-categorias.component.ts` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/grafica/comercial/comercial-list.component.html` | PageCard padrão: acionador automático no cabeçalho quando há filtros |
| `src/app/pages/grafica/cores/grafica-cores.component.ts` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/grafica/formatos/grafica-formatos.component.ts` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/grafica/materiais/grafica-materiais.component.ts` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/grafica/produtos/grafica-produtos.component.html` | PageCard padrão: acionador automático no cabeçalho quando há filtros |
| `src/app/pages/grafica/servicos/grafica-servicos.component.ts` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/links/pages/analytics/links-analytics.component.html` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/links/pages/editor/links-editor.component.html` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/links/pages/lista/links-lista.component.html` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.html` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html` | Sem PageCard ancestral neste template: mantém composição própria/acionador local |
| `src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html` | PageCard sem filtros declarados: nenhum acionador criado |
| `src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.html` | PageCard padrão: acionador automático no cabeçalho quando há filtros |

## Catálogo completo por componente

### app-page-card

- `src/app/pages/ajuda/ajuda.component.html`
- `src/app/pages/apps/calculadoras/pisos/calculadora-pisos.component.html`
- `src/app/pages/apps/fiscal/configuracoes/fiscal-configuracoes.component.ts`
- `src/app/pages/apps/fiscal/documentos/fiscal-documento-detalhe.component.ts`
- `src/app/pages/apps/fiscal/documentos/fiscal-documentos.component.ts`
- `src/app/pages/apps/fiscal/emitir/fiscal-emitir.component.ts`
- `src/app/pages/apps/fiscal/inutilizacoes/fiscal-inutilizacoes.component.ts`
- `src/app/pages/apps/fiscal/produtos/fiscal-produtos.component.ts`
- `src/app/pages/apps/fiscal/regras/fiscal-regras.component.ts`
- `src/app/pages/apps/smart-calc/smart-calc.component.html`
- `src/app/pages/billing/minha-assinatura/minha-assinatura.component.html`
- `src/app/pages/cadastro-tecnico/acabamentos/form-acabamento/form-acabamento.component.html`
- `src/app/pages/cadastro-tecnico/cores/form-cores/form-cores.component.html`
- `src/app/pages/cadastro-tecnico/formatos/form-formato/form-formato.component.html`
- `src/app/pages/cadastro-tecnico/materiais/form-material/form-material.component.html`
- `src/app/pages/cadastro-tecnico/produtos/form-produto/form-produto.component.html`
- `src/app/pages/cadastro-tecnico/servicos/form-servico/form-servico.component.html`
- `src/app/pages/calculadora-materiais/calculadora-materiais.component.html`
- `src/app/pages/catalogo/categorias/catalogo-caracteristicas.component.ts`
- `src/app/pages/catalogo/categorias/catalogo-categoria-form.component.ts`
- `src/app/pages/catalogo/marcas/catalogo-marca-form.component.ts`
- `src/app/pages/catalogo/produtos/catalogo-produto-detail.component.ts`
- `src/app/pages/catalogo/produtos/catalogo-produto-form.component.ts`
- `src/app/pages/clicktv/components/midias/clicktv-midias.component.html`
- `src/app/pages/clicktv/components/playlist-editor/clicktv-playlist-editor.component.html`
- `src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html`
- `src/app/pages/clicktv/components/telas/clicktv-telas.component.html`
- `src/app/pages/cliente/form-cliente/form-cliente.component.html`
- `src/app/pages/cliente/listar-cliente/listar-cliente.component.html`
- `src/app/pages/config/aplicativos-atalhos/aplicativos-atalhos.component.html`
- `src/app/pages/config/email-servidor/email-servidor.component.html`
- `src/app/pages/config/presenca-publica/presenca-publica.component.html`
- `src/app/pages/dashboards/dashboard1/dashboard1.component.html`
- `src/app/pages/deposito/categorias/form-categoria-deposito/form-categoria-deposito.component.html`
- `src/app/pages/deposito/itens/form-item-deposito/form-item-deposito.component.html`
- `src/app/pages/deposito/marcas/form-marca-deposito/form-marca-deposito.component.html`
- `src/app/pages/empresa/empresa-form.component.html`
- `src/app/pages/funcionarios/detalhe-funcionario/detalhe-funcionario.component.html`
- `src/app/pages/funcionarios/form-funcionario/form-funcionario.component.html`
- `src/app/pages/funcionarios/listar-funcionarios/listar-funcionarios.component.html`
- `src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts`
- `src/app/pages/grafica/categorias/grafica-categoria-form.component.ts`
- `src/app/pages/grafica/categorias/grafica-categorias.component.ts`
- `src/app/pages/grafica/comercial/comercial-editor.component.html`
- `src/app/pages/grafica/comercial/comercial-list.component.html`
- `src/app/pages/grafica/comercial/orcamento-comercial-impressao-page.component.ts`
- `src/app/pages/grafica/comercial/orcamento-comercial-whatsapp-page.component.ts`
- `src/app/pages/grafica/comercial/pedido-comercial-impressao-page.component.ts`
- `src/app/pages/grafica/comercial/pedido-comercial-whatsapp-page.component.ts`
- `src/app/pages/grafica/cores/grafica-cor-form.component.ts`
- `src/app/pages/grafica/cores/grafica-cores.component.ts`
- `src/app/pages/grafica/formatos/grafica-formato-form.component.ts`
- `src/app/pages/grafica/formatos/grafica-formatos.component.ts`
- `src/app/pages/grafica/materiais/grafica-materiais.component.ts`
- `src/app/pages/grafica/materiais/grafica-material-form.component.ts`
- `src/app/pages/grafica/produtos/grafica-produto-form.component.ts`
- `src/app/pages/grafica/produtos/grafica-produtos.component.html`
- `src/app/pages/grafica/servicos/grafica-servico-form.component.ts`
- `src/app/pages/grafica/servicos/grafica-servicos.component.ts`
- `src/app/pages/links/pages/analytics/links-analytics.component.html`
- `src/app/pages/links/pages/editor/links-editor.component.html`
- `src/app/pages/links/pages/lista/links-lista.component.html`
- `src/app/pages/pedido/detalhes-pedido/detalhes-pedido.component.html`
- `src/app/pages/pedido/form-pedido/form-pedido.component.html`
- `src/app/pages/pedido/listar-pedido/listar-pedido.component.html`
- `src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.html`
- `src/app/pages/pessoas/folha/detalhe-folha/detalhe-folha-pagamento.component.html`
- `src/app/pages/pessoas/folha/listar-folha/listar-folha-pagamento.component.html`
- `src/app/pages/site/banners/form-banner/form-banner.component.html`
- `src/app/pages/site/configuracoes/site-configuracoes.component.html`
- `src/app/pages/site/paginas/form-pagina/form-pagina.component.html`
- `src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html`
- `src/app/pages/smart-calc-config/smart-calc-config/smart-calc-config.component.html`
- `src/app/pages/storage/components/storage-admin-page/storage-admin-page.component.html`
- `src/app/pages/suporte/suporte.component.html`
- `src/app/pages/usuarios/form-usuario/form-usuario.component.html`
- `src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.html`

### app-card-header

- `src/app/pages/billing/billing-blocked/billing-blocked.component.html`
- `src/app/pages/billing/billing-confirmation/billing-confirmation.component.html`
- `src/app/pages/billing/billing-pagamento/billing-pagamento.component.html`
- `src/app/pages/billing/billing-pay/billing-pay.component.html`
- `src/app/pages/cadastro-tecnico/acabamentos/listar-acabamento/listar-acabamento.component.html`
- `src/app/pages/cadastro-tecnico/cores/listar-cores/listar-cores.component.html`
- `src/app/pages/cadastro-tecnico/formatos/listar-formato/listar-formato.component.html`
- `src/app/pages/cadastro-tecnico/materiais/listar-material/listar-material.component.html`
- `src/app/pages/cadastro-tecnico/produtos/listar-produtos/listar-produtos.component.html`
- `src/app/pages/cadastro-tecnico/servicos/listar-servicos/listar-servicos.component.html`
- `src/app/pages/catalogo/categorias/catalogo-categoria-list.component.ts`
- `src/app/pages/catalogo/marcas/catalogo-marca-list.component.ts`
- `src/app/pages/catalogo/produtos/catalogo-produto-list.component.ts`
- `src/app/pages/config/folha-config/folha-config.component.html`
- `src/app/pages/deposito/categorias/listar-categorias-deposito/listar-categorias-deposito.component.html`
- `src/app/pages/deposito/itens/listar-itens-deposito/listar-itens-deposito.component.html`
- `src/app/pages/deposito/marcas/listar-marcas-deposito/listar-marcas-deposito.component.html`
- `src/app/pages/orcamentos/detalhe-orcamento/detalhe-orcamento.component.html`
- `src/app/pages/orcamentos/form-orcamento/form-orcamento.component.html`
- `src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html`
- `src/app/pages/site/banners/listar-banners/listar-banners.component.html`

### app-list-filter-bar

- `src/app/pages/clicktv/components/midias/clicktv-midias.component.html`
- `src/app/pages/orcamentos/listar-orcamentos/listar-orcamentos.component.html`

### app-data-table

- `src/app/pages/billing/minha-assinatura/minha-assinatura.component.html`
- `src/app/pages/clicktv/components/playlists/clicktv-playlists.component.html`
- `src/app/pages/clicktv/components/telas/clicktv-telas.component.html`
- `src/app/pages/cliente/listar-cliente/listar-cliente.component.html`
- `src/app/pages/grafica/cadastros/grafica-cadastro-list.component.ts`
- `src/app/pages/grafica/categorias/grafica-categorias.component.ts`
- `src/app/pages/grafica/comercial/comercial-list.component.html`
- `src/app/pages/grafica/cores/grafica-cores.component.ts`
- `src/app/pages/grafica/formatos/grafica-formatos.component.ts`
- `src/app/pages/grafica/materiais/grafica-materiais.component.ts`
- `src/app/pages/grafica/produtos/grafica-produtos.component.html`
- `src/app/pages/grafica/servicos/grafica-servicos.component.ts`
- `src/app/pages/links/pages/analytics/links-analytics.component.html`
- `src/app/pages/links/pages/editor/links-editor.component.html`
- `src/app/pages/links/pages/lista/links-lista.component.html`
- `src/app/pages/perfil/gerenciar-perfil/gerenciar-perfil.component.html`
- `src/app/pages/site/paginas/blocos/listar-blocos/listar-blocos.component.html`
- `src/app/pages/site/paginas/listar-paginas/listar-paginas.component.html`
- `src/app/pages/usuarios/listar-usuarios/listar-usuarios.component.html`

### app-view-mode-toggle

- `src/app/pages/grafica/categorias/grafica-categorias.component.ts`
- `src/app/pages/grafica/comercial/comercial-list.component.html`
