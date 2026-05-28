# MailMax Pro — Email Marketing SaaS

Sistema completo de email marketing para agências digitais e gestores de tráfego.

## Stack

- **Backend**: NestJS + TypeScript + Fastify + Prisma + PostgreSQL + Redis + BullMQ + Amazon SES
- **Frontend**: Next.js 14 + Tailwind CSS + TanStack Query + Zustand
- **Infra**: Docker Compose

## Início Rápido

### Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 20+ e pnpm (para desenvolvimento local)

### Rodar com Docker Compose

```bash
cd mailmax-pro

# Copie e configure as variáveis de ambiente
cp apps/api/.env.example apps/api/.env
# Edite apps/api/.env com suas credenciais AWS SES (opcional para testes)

# Suba tudo
docker-compose up --build

# Em outro terminal, rode as migrations e seed
docker-compose exec api npx prisma migrate deploy
docker-compose exec api npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts
```

Acesse:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Swagger**: http://localhost:3001/docs

**Login demo**: `admin@demo.com` / `admin123`

### Desenvolvimento Local

```bash
# Instale dependências
pnpm install

# Suba apenas PostgreSQL e Redis
docker-compose -f docker-compose.dev.yml up -d

# Configure .env na API
cp apps/api/.env.example apps/api/.env

# Rode as migrations
pnpm db:migrate

# Popule com dados de exemplo
pnpm db:seed

# Inicie em modo dev (API + Web em paralelo)
pnpm dev
```

### Comandos úteis

```bash
# Abrir Prisma Studio (visualizar banco de dados)
pnpm db:studio

# Rodar apenas a API
pnpm --filter api dev

# Rodar apenas o frontend
pnpm --filter web dev

# Testes da API
pnpm --filter api test

# Build de produção
pnpm build
```

## Variáveis de Ambiente (API)

| Variável | Descrição | Padrão |
|---|---|---|
| `DATABASE_URL` | URL PostgreSQL | — |
| `REDIS_URL` | URL Redis | — |
| `JWT_SECRET` | Segredo JWT (mín. 16 chars) | — |
| `JWT_EXPIRES_IN` | Validade do access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Validade do refresh token | `7d` |
| `AWS_REGION` | Região AWS | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Chave AWS (para SES) | Opcional |
| `AWS_SECRET_ACCESS_KEY` | Secret AWS | Opcional |
| `SES_FROM_EMAIL` | Email remetente padrão | `noreply@mailmaxpro.com` |
| `APP_URL` | URL do frontend | `http://localhost:3000` |
| `API_URL` | URL da API | `http://localhost:3001` |
| `TRACKING_URL` | URL de tracking | `http://localhost:3001` |

## Módulos Implementados

- **Auth**: Register, login, JWT refresh, multi-tenancy com organizations
- **Contatos**: CRUD, importação CSV/XLSX, exportação, soft delete
- **Listas**: Criar e gerenciar listas de contatos
- **Segmentos**: Segmentação dinâmica com regras e segmentação RFM automática
- **Templates**: Editor com blocos, MJML rendering, histórico de versões
- **Campanhas**: Criar, agendar, disparar, A/B testing, métricas em tempo real
- **Motor de Envio**: BullMQ workers, Amazon SES, rate limiting, retry exponencial
- **Tracking**: Open tracking (pixel), click tracking, bounces e spam via webhook SES
- **Automações**: Flow builder backend, workers de execução, nós condicionais
- **Analytics**: Overview, performance de campanhas, receita atribuída, top contatos
- **Entregabilidade**: Score de saúde, verificação DNS (SPF/DKIM/DMARC), warmup de IP
- **Canais**: Configuração SMS (Twilio) e WhatsApp
- **Formulários**: Formulários embeddáveis com double opt-in

## Arquitetura

```
mailmax-pro/
├── apps/
│   ├── api/          # NestJS + Fastify (porta 3001)
│   │   ├── src/modules/   # Módulos de domínio
│   │   ├── src/shared/    # Prisma, Redis, SES, Guards
│   │   └── prisma/        # Schema + migrations + seed
│   └── web/          # Next.js 14 App Router (porta 3000)
├── docker-compose.yml
└── docker-compose.dev.yml
```

## Endpoints Principais

Documentação completa em `http://localhost:3001/docs` (Swagger).

| Módulo | Prefixo |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login` |
| Contatos | `GET/POST/PUT/DELETE /contacts` |
| Listas | `GET/POST /lists` |
| Segmentos | `GET/POST /segments`, `GET /segments/rfm` |
| Templates | `GET/POST/PUT /templates` |
| Campanhas | `GET/POST /campaigns`, `POST /campaigns/:id/send` |
| Automações | `GET/POST /automations` |
| Analytics | `GET /analytics/overview` |
| Entregabilidade | `GET /deliverability/health`, `GET /deliverability/dns/:domain` |
| Tracking | `GET /track/open/:token`, `GET /track/click/:token` |
