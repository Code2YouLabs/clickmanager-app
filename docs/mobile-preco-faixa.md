# Faixa de quantidade no configurador mobile

- A variante depende de `mobilePanel` e `POR_FAIXA_QUANTIDADE`. Mantém produto,
  Quantidade/Calcular, controles, validações e rodapé existentes.
- Ver todas as faixas usa o mesmo mecanismo nativo details de Ver regras no
  metro quadrado. A lista começa recolhida, sem rolagem própria; abrir/fechar
  não modifica quantidade, resultado ou requisições.
- A faixa aplicada é identificada pelo detalhe explícito que a API atual emite:
  `Faixa aplicada: início–fim` (ou `∞`). A apresentação corresponde esse intervalo
  à política apenas quando há uma identificação única. Não compara a quantidade
  digitada com limites para decidir o destaque mobile.
- Sem metadado confiável ou com faixas ambíguas, omite contexto e destaque e mantém
  unitário e total resolvidos. O DTO não oferece ID estruturado de faixa aplicada;
  uma mudança do formato textual pode impedir a identificação, sem afetar o preço.
- O resumo exige resultado válido. A alteração de quantidade limpa resultado e
  destaque imediatamente. O debounce e o cálculo automático que já existiam
  foram preservados; nenhuma consulta automática ou regra nova foi acrescentada.
- A lista e o unitário mobile preservam casas decimais disponíveis, sem substituir
  o preço retornado pela tarifa da política. Total mantém formatação BRL e valor
  resolvido. Erros ficam fora das informações recolhidas.
- Desktop conserva tabela, destaque anterior, campos, resumo e precisão visual.
  Preço Fixo, Lote, Metro Quadrado, Adicionais e Revisão permanecem intactos.

Testes automatizados: expansão/recolhimento, identificação confiável/ausente,
limites inclusivos informados pela API, intervalos abertos e com lacunas, precisão,
loading, erro, invalidação, muitas faixas e retorno aos três documentos comerciais.
Validação visual manual, sem screenshots.
