# Login e cadastro — melhoria mobile

Branch: `feature/mobile-login-cadastro`, criada de `develop` em `22c9d3e` após atualização do remoto. Referências: épico #135 e auditoria #136. Escopo restrito às duas telas públicas de autenticação.

## Problemas e solução

As duas telas combinavam containers de altura fixa, grid aninhado e overflow oculto, dificultando a rolagem em pouca altura. Faltavam títulos explícitos e associação dos labels aos inputs; mensagens usavam hints com posicionamento absoluto. O cadastro repetia os estilos do login e o link de criação de conta dependia apenas de clique.

Agora os formulários usam uma coluna, largura máxima de 510px, altura mínima dinâmica e rolagem natural. O fundo decorativo existente permanece no desktop e cede espaço ao formulário no mobile. Logo, tipografia, cores, sombras, radius e componentes Material da skin foram reaproveitados.

- Login: título/descrição, recuperação e cadastro acessíveis, labels associados, autocomplete, teclado de email e feedback de erro persistente junto ao formulário.
- Cadastro: quatro campos existentes preservados, ajuda de senha, erros próximos aos campos, comparação de senha acessível e CTA explícito “Criar conta”. Enter avança pelos campos e envia no último; não interfere no botão de visibilidade.
- Compartilhado: botões de 48px, links de pelo menos 44px, inputs com fonte de 16px e wrapper de aproximadamente 53px, áreas seguras, foco visível e foco no primeiro campo inválido. Loading é anunciado e impede envios concorrentes entre senha e Google.

Reutilizados: `BrandingComponent`, `cardWithShadow`, `bg-gredient`, Angular Material (`mat-card`, campos, erros, botões, ícones e checkbox), tokens da skin, Reactive Forms, RouterLink e Toastr. A extração se limita a um mixin Sass e um helper de foco; nenhum novo componente visual ou biblioteca.

## Arquivos

- `src/app/pages/authentication/boxed-login/boxed-login.component.{ts,html,scss,spec.ts}`
- `src/app/pages/authentication/boxed-register/boxed-register.component.{ts,html,scss,spec.ts}`
- `src/app/pages/authentication/shared/_auth-form.scss`
- `src/app/pages/authentication/shared/auth-form-focus.ts`
- Este relatório e `docs/screenshots/mobile-login-cadastro/`.

Rota principal de cadastro confirmada: `/authentication/registro-gestor`. O alias `/authentication/boxed-register` foi conferido no navegador e continua exibindo o mesmo componente. Login permanece em `/authentication/login`. Contratos de API, validadores, payload, JWT, criação de empresa, tratamento de 402, fluxo Google e resolução de destino/onboarding foram preservados. O link de cadastro mantém a limpeza de sessão na navegação normal e ganhou href real.

## Testes e build

| Validação | Resultado |
| --- | --- |
| Baseline: `npm test -- --watch=false --browsers=ChromeHeadless` | 868 testes: 867 aprovados, 1 falha existente |
| Baseline: `npm run build:prod` | Aprovado |
| Specs de login e cadastro | 27 aprovados |
| Suíte final: `npm test -- --watch=false --browsers=ChromeHeadless` | 895 testes: 894 aprovados, mesma falha existente |
| Final: `npm run build:prod` | Aprovado, avisos de dependências CommonJS existentes |
| `git diff --check` | Aprovado |

A falha anterior e posterior é `AppStatusGridComponent mantém navegação com filtro de status`: o teste espera `/page/grafica/comercial-beta/orcamentos`, enquanto a aplicação navega para `/page/grafica/comercial/orcamentos`. Esse componente não foi alterado.

Os 27 testes verificam renderização, labels/autocomplete, obrigatoriedade, email, mínimos de nome/senha, comparação de senhas e ARIA, foco, visibilidade independente, Enter, loading e bloqueio de duplicação, recuperação de erro, payload, sessão lembrada, tratamento de 402, links, Google com mocks, tokens/fallback de login e destinos do onboarding. Nenhuma conta real foi criada.

## Verificação no Chrome

Comparação com o layout anterior realizada no navegador antes das alterações. Capturas abaixo registram o resultado final; não há arquivo de captura do estado anterior nesta pasta.

| Viewport | Login | Cadastro |
| --- | --- | --- |
| 360 × 800 | [Captura](screenshots/mobile-login-cadastro/login-360x800.jpg) | [Captura](screenshots/mobile-login-cadastro/cadastro-360x800.jpg) |
| 390 × 844 | [Captura](screenshots/mobile-login-cadastro/login-390x844.jpg) | [Captura](screenshots/mobile-login-cadastro/cadastro-390x844.jpg) |
| 430 × 932 | [Captura](screenshots/mobile-login-cadastro/login-430x932.jpg) | [Captura](screenshots/mobile-login-cadastro/cadastro-430x932.jpg) |
| 768 × 1024 | [Captura](screenshots/mobile-login-cadastro/login-768x1024.jpg) | [Captura](screenshots/mobile-login-cadastro/cadastro-768x1024.jpg) |
| 1366 × 900 | [Captura](screenshots/mobile-login-cadastro/login-1366x900.jpg) | [Captura](screenshots/mobile-login-cadastro/cadastro-1366x900.jpg) |
| 800 × 360 (paisagem) | [Captura](screenshots/mobile-login-cadastro/login-800x360.jpg) | [Captura](screenshots/mobile-login-cadastro/cadastro-800x360.jpg) |
| 390 × 420 (altura reduzida) | [Captura](screenshots/mobile-login-cadastro/login-390x420.jpg) | [Captura](screenshots/mobile-login-cadastro/cadastro-390x420.jpg) |

Nas 14 combinações, `scrollWidth` do documento foi igual a `clientWidth`, sem controles cortados horizontalmente. Nas alturas menores, a página cresce e permite alcançar o CTA por rolagem; a barra vertical ocupa parte da largura em alguns casos. As capturas de página inteira mostram esse conteúdo adicional. Medições: [JSON](screenshots/mobile-login-cadastro/validacao-viewports.json). O campo `inputs.height` mede a área textual interna, não o wrapper/área de interação.

Envio vazio conferido também no navegador: [Login](screenshots/mobile-login-cadastro/login-validacao-360.jpg) e [Cadastro](screenshots/mobile-login-cadastro/cadastro-validacao-360.jpg), com mensagens locais e foco no primeiro campo inválido.

## Limitações

- Não foi possível confirmar alteração efetiva de zoom com os atalhos pela automação da aba; o teste de zoom real permanece pendente. Viewport reduzida não foi contabilizada como zoom.
- Não havia dispositivo/ambiente com teclado virtual de iOS/Android. Altura reduzida, rolagem e foco foram verificados, mas não comprovam o comportamento do teclado real.
- Sucesso/erros de autenticação, cadastro e Google foram testados com mocks, sem submissão real ao backend nem popup OAuth real.

Nenhum push, PR ou merge faz parte desta entrega.
