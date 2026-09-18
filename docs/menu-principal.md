# Menu principal

O menu principal do ClickManager segue regras de apresentação que não alteram permissões, rotas ou regras de negócio.

1. O nome do menu representa o conceito, não a ação. Use `Produtos`, `Clientes`, `Pedidos`, `Orçamentos` e `Usuários` em vez de nomes como `Gerenciar...` ou `Central de...` quando o conceito simples descreve a área.
2. Segmento controla visibilidade, não nomenclatura. O grupo `Catálogo` mantém o mesmo nome em Gráfica, Depósito e segmentos futuros; seus filhos variam por permissão, feature flag, tipo de empresa e versão do catálogo.
3. A organização visual é funcional: `Menu`, `Operação`, `Catálogo`, `Gestão`, `Presença Digital`, `Configurações` e `Ajuda`.
4. Accordion deve ser usado somente quando o item possui filhos navegáveis. Itens simples como `Dashboard`, `Pedidos`, `Clientes`, `Usuários`, `Dados da empresa` e `Suporte` permanecem como links diretos.
5. Labels de seção agrupam visualmente áreas relacionadas e não devem ter fundo colorido. Se a filtragem remover todos os itens de uma seção, o label também deve desaparecer.
6. A ordem padrão prioriza uso diário: operação, catálogo/cadastros, gestão, presença digital, configurações e ajuda.

O suporte a `allowedEmpresaTipos`, `requiredPermission`, `catalogoModo`, `featureKey` e `proprietarioOnly` deve permanecer no dado do item ou filho correspondente. O depósito legado continua usando `catalogoModo: 'LEGADO_DEPOSITO'`; no menu, o filho legado `/page/deposito/itens` aparece como `Produtos` dentro de `Catálogo`.
