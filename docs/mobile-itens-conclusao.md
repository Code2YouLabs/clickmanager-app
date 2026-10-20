# Itens e conclusão do Editor Comercial mobile

- `ItensPedidoSectionComponent` mantém uma única lista responsiva. Até 760px,
  cada linha usa identificação, descrição integral, quantidade/unidade e valores.
  O desktop mantém colunas, detalhes e subtotais anteriores.
- `ItemPedidoView.unidade` recebe a unidade real. `viewKey` conserva a identidade
  visual durante atualizações; não representa relação entre produto e acabamento.
  `sourceIndex`, handlers, permissões e remoção permanecem inalterados.
- Quando unitário e total são iguais, apenas o total fica na linha financeira
  mobile. Cobrança, memória de cálculo e detalhes continuam acessíveis pelo
  controle nativo Detalhes do preço. Duplicatas textuais exatas são eliminadas
  dessa apresentação auxiliar, sem interpretar ou reescrever descrições.
- Não há agrupamento: o contrato não fornece vínculo explícito de composição.
  Descrições, snapshots, DTOs e valores persistidos não foram alterados.
- Revisão e conclusão inicia recolhida nas criações mobile de Pedidos,
  Orçamentos e Rascunhos. O mecanismo existente de Revisar pendências do piloto
  de Pedidos abre a revisão e a seção necessária, mantendo validações e foco.
  O tutorial continua abrindo seus alvos antes do destaque, sem novos checkpoints.
- O painel inferior mantém infraestrutura, handle, total, Salvar, safe area e
  rolagem. Apenas espaçamentos, alinhamento e aparência do controle Detalhes
  receberam estilos locais do Editor; nenhuma alteração no componente global.

Validação automatizada: lista em largura mobile e desktop, políticas de preço,
valores resolvidos, remoção, bloqueios, detalhes expansíveis, seções, pendências,
tutorial e regressão dos três contextos comerciais. Sem testes visuais ou
screenshots; aparência final permanece sujeita à validação manual.
