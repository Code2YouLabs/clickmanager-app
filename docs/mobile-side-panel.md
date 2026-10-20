# Painel lateral mobile compartilhado

`openMobileSidePanel` (`src/app/components/mobile-side-panel/mobile-side-panel.ts`)
abre um componente ou TemplateRef como painel de tela inteira, vindo da direita.
Os filtros do DataTable/ListFilterBar e Novo cliente no Editor Comercial usam a mesma infraestrutura.
O consumidor decide quando usar essa apresentação; o desktop permanece com sua configuração própria.

- Aceita MatDialog, conteúdo e MatDialogConfig (data, ariaLabel, viewContainerRef).
- Retorna MatDialogRef, preservando afterClosed e o resultado original do formulário.
- Centraliza entrada/saída, movimento reduzido, foco, Escape, navegação e ajuste à visualViewport.
- As classes opcionais `mobile-side-panel__layout`, `__header`, `__body`, `__footer`
  organizam formulários com corpo rolável e ações visíveis, respeitando safe areas.
- Os estilos são carregados globalmente por `src/styles.scss`, sem depender da presença de filtros na página.
- Cancelar e salvar continuam sob responsabilidade do consumidor.

A validação manual da aparência e das animações permanece a cargo do projeto.
