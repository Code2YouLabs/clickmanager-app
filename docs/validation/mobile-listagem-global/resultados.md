# Validação da fundação mobile de listagens

Comandos executados:

```sh
npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/components/data-table/**/*.spec.ts' --include='src/app/components/list-filter-bar/**/*.spec.ts' --include='src/app/components/inputs/input-pesquisa/**/*.spec.ts' --include='src/app/components/view-mode-toggle/**/*.spec.ts' --include='src/app/pages/grafica/comercial/**/*.spec.ts'
npm test -- --watch=false --browsers=ChromeHeadless
npm run build:prod
```

As execuções focadas intermediárias identificaram ajustes no mock do botão Material/BreakpointObserver e no evento string legado. A suíte completa final validou esses ajustes, a integração mobile e os consumidores existentes.

- Final: 1.083 executados, 1.082 passaram; exit 1 somente pela mesma falha de onboarding do baseline. Nenhuma falha nova.
- Build de produção: exit 0, mesmos 38 avisos já existentes, nenhum erro.
- git diff --check: sem erros.
- Testes novos são funcionais/estruturais; sem testes visuais ou screenshots.

Extrato da única falha:

```text
Chrome Headless 155.0.0.0 (Mac OS 10.15.7) Narrativa do onboarding acomoda stepper, árvore e ações em 360px sem rolagem horizontal FAILED
	Expected 303 to be less than or equal 298.
	    at <Jasmine>
	    at UserContext.<anonymous> (src/app/pages/onboarding-v2/onboarding-flow.spec.ts:333:33)
	    at next (<anonymous>)
	    at asyncGeneratorStep (node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js:3:1)
	    at _next (node_modules/@babel/runtime/helpers/esm/asyncToGenerator.js:17:1)
Chrome Headless 155.0.0.0 (Mac OS 10.15.7): Executed 261 of 1083 (1 FAILED) (0 secs / 6.04 secs)
TOTAL: 1 FAILED, 1082 SUCCESS
```

Logs completos temporários em `/tmp/clickmanager-mobile-list-foundation-{focused,full,build}.log`.
