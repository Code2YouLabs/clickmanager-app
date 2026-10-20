# Preço por lote no configurador mobile

- A variante depende de `mobilePanel` e `POR_LOTE`. A lista e os valores vêm de
  `politicaPrecoAtual.lotes`; os cartões mantêm duas colunas e altura flexível.
- O botão original continua selecionando toda a área. O destaque ativo combina
  borda principal, fundo suave, check e `aria-pressed`, usando a mesma seleção
  única existente. Foco visível e textos longos permanecem suportados.
- O resumo mobile só aparece com lote selecionado e resultado válido. Quantidade,
  unitário informativo e Total são da resposta; não há multiplicação do preço
  do lote nem cálculo de unitário na apresentação. A orientação redundante some
  apenas no mobile. Não foi criado botão Calcular.
- Trocar de lote continua atualizando o controle, invalidando o preço e cancelando
  a requisição anterior. Voltar/avançar e composição usam os handlers existentes.
- O DTO do lote contém ID opcional, quantidade e valor, sem flag de disponibilidade.
  Nenhuma regra artificial de desabilitação ou filtro de lotes foi acrescentada.
- Desktop e demais políticas mantêm apresentação e comportamento anteriores.

Testes automatizados cobrem seleção, troca durante loading, erro, resumo, preços,
navegação, Adicionais, Revisão, retorno aos três documentos comerciais e listas
com 1, 2, 3 e muitos lotes. Validação visual manual, sem screenshots.
