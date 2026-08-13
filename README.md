# clickmanager-app

ERP principal do ClickManager, desenvolvido em Angular. É o painel utilizado
pelos clientes para operar empresa, catálogo, orçamentos, site, ClickTV e os
demais módulos contratados.

## Documentação do ecossistema

A documentação geral da arquitetura, infraestrutura, ambiente local e operação
do ClickManager está em:

https://github.com/Code2YouLabs/clickmanager-docs

## Requisitos

- Node.js 20 ou superior;
- npm;
- `clickmanager-backend` disponível em `http://localhost:8080`;
- Docker, somente para execução em container.

## Subir localmente

```bash
npm install
npm start
```

Acesse `http://localhost:4200`. O ambiente de desenvolvimento usa:

- API: `http://localhost:8080`;
- site público multiempresa: `http://localhost:4300`.

## Testar e gerar o build

```bash
npm test -- --watch=false
npm run build:prod
```

O build é gerado em `dist/clickmanager-app/browser`.

## Subir com Docker

```bash
docker build -t clickmanager-app .
docker run --rm -p 8081:80 clickmanager-app
```

Acesse `http://localhost:8081`.

## Produção

- domínio: `https://app.clickmanager.com.br`;
- imagem: `ghcr.io/leonardombr89/clickmanager-app:latest`;
- serviço no compose da VPS: `app`;
- build: `.github/workflows/build-app.yml`;
- deploy: `.github/workflows/deploy-app.yml`.

O push na `main` gera a imagem e o workflow de deploy atualiza somente `app`.
São necessários os secrets `SSH_HOST`, `SSH_USER` e `SSH_PRIVATE_KEY`.

Deploy manual na VPS:

```bash
cd /opt/clickmanager
docker-compose -f docker-compose.prod.yml pull app
docker-compose -f docker-compose.prod.yml up -d --no-deps app
docker-compose -f docker-compose.prod.yml ps app
```

Em produção, chamadas para `/api/` e `/auth/` são relativas ao domínio e devem
ser encaminhadas pelo proxy principal para o backend.
