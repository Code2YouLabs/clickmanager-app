# Metro quadrado no configurador mobile

- A variante depende de `mobilePanel` e da estratégia resolvida
  `POR_METRO_QUADRADO`. Metro linear, outras políticas e desktop mantêm o layout.
- Largura e altura usam o input numérico compartilhado com `decimal` opt-in,
  entrada numérica nativa e `step=any`. A normalização da entrada fica com o
  navegador e o value accessor do Angular; não há parser ou conversão de unidade
  novos. Consumidores existentes continuam no modo inteiro original.
- Labels usam a unidade de entrada configurada. Cobrança aparece como preço por
  m², separada da unidade das dimensões. Mensagens de medida usam os validators
  atuais, junto aos campos, conforme interação/touched.
- Ver regras é um details nativo no mesmo painel. Exibe unidade de entrada e
  cobrança, preço por m², mínimo e limites existentes. Não configurado e Sem
  limite distinguem ausência de dados de um valor zero explícito.
- Calcular, loading, erro, cancelamento de resposta antiga e invalidação após
  edição permanecem nos métodos existentes. Não foi criado cálculo automático.
- O resumo só aparece para resultado válido. Medidas são exibidas quando a API
  fornece dimensões e unidade; áreas usam exclusivamente `areaReal` e
  `areaFaturada`, sem multiplicação local para completar dados ausentes.
- O contrato não possui flag específica de preço mínimo aplicado. A interface
  mostra mensagens e detalhes reais da API, sem concluir aplicação do mínimo a
  partir da política ou do total. Duplicatas textuais exatas não são repetidas.
- No resultado mobile válido, o sucesso genérico e as entradas técnicas completas
  conhecidas de `mensagem`/`detalhes` não aparecem abaixo do Total. A filtragem é
  conservadora: alertas, textos desconhecidos ou mistos continuam visíveis.
  Resultados inválidos exibem mensagem e detalhes sem essa filtragem.
- Ordem do resumo: medidas, área faturada, área geométrica quando distinta,
  quantidade, unitário e Total. Não há cálculo novo de área ou valor financeiro.
  A resposta original e seus detalhes continuam intactos no snapshot comercial.

Validação automatizada sem screenshots: unidades m/cm/mm, decimais, campos
obrigatórios, limites, regras expansíveis, retorno válido/inválido, mínimo
informado pela API, loading, erro e edição após calcular. Validação visual manual.
