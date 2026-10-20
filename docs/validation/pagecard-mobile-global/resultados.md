# Validação automatizada — PageCard global

- Focados: PageCard, CardHeader e Comercial, 158/158 passaram na validação inicial do contrato.
- Suíte completa final: 1.073 executados, 1.072 passaram, uma falha; exit 1.
- Falha idêntica ao baseline: Narrativa do onboarding — acomoda stepper, árvore e ações em 360px sem rolagem horizontal. Expected 303 to be less than or equal 298. Nenhuma falha nova.
- Build de produção final: exit 0, 38 avisos já existentes, nenhum erro.
- git diff --check: sem erros.
- Sem testes visuais e sem screenshots. Aprovação visual manual pendente.

Comandos:

```sh
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/components/page-card/**/*.spec.ts' --include='src/app/components/card-header/**/*.spec.ts' --include='src/app/pages/grafica/comercial/**/*.spec.ts'
npm test -- --watch=false --browsers=ChromeHeadless
npm run build:prod
```
