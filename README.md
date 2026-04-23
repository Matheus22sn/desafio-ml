# Desafio ML

Aplicacao full stack para autenticacao de vendedor, sincronizacao e gestao de anuncios do Mercado Livre.

## Visao geral

O projeto foi estruturado como um painel operacional de vendedor:

- autenticacao OAuth com Mercado Livre
- sessao isolada por navegador
- sincronizacao de anuncios do seller autenticado
- listagem local com filtros e metricas
- criacao de anuncios com preditor de categoria e validacao
- edicao rapida de titulo, preco e estoque
- deteccao basica de concorrencia e mudanca remota

## Stack

- Frontend: React 19 + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Banco: MongoDB
- Deploy atual: Vercel (frontend) + Render (backend) + MongoDB Atlas

## O que foi melhorado na entrega

### Frontend

- Painel visual refatorado para parecer produto e nao prototipo.
- Cards de metricas, filtros, estados vazios, toasts e modais de criacao/edicao.
- Fluxo de criacao guiado:
  - sugestao de categoria pelo titulo
  - carregamento de listing types validos da conta
  - atributos dinamicos por categoria
  - validacao do payload antes da publicacao
- Edicao rapida com bloqueio basico de concorrencia usando `expected_updated_at`.
- Sessao por navegador persistida no frontend via `session_id`.

### Backend

- Integracao com OAuth do Mercado Livre.
- Tokens persistidos por `user_id`.
- Sessoes isoladas por navegador em `AuthSession`.
- Escopo de dados por vendedor autenticado.
- Retry para erros transientes da API externa.
- Refresh automatico do token quando necessario.
- Sincronizacao local com marcacao de divergencia:
  - `synced`
  - `remote_changed`
  - `missing_remote`
  - `conflict`
- Validacao antes do `POST /items`.
- Atualizacao com optimistic locking basico.

### Documentacao

- README principal consolidado.
- Guia de arquitetura.
- Guia de endpoints.
- Guia de apresentacao para entrevista/demo.
- Lista consolidada das melhorias implementadas.

## Estrutura do projeto

- `frontend/`: interface React/Vite
- `backend/`: API Express + integracao Mercado Livre + MongoDB
- `docker-compose.yml`: MongoDB local
- `docs/ARCHITECTURE.md`: arquitetura e fluxos internos
- `docs/ENDPOINTS.md`: endpoints e contratos principais
- `docs/IMPLEMENTED_IMPROVEMENTS.md`: inventario das melhorias feitas
- `docs/PRESENTATION_GUIDE.md`: roteiro para explicar o projeto

## Modelos principais

### Token

Representa o token OAuth do Mercado Livre por vendedor autenticado.

Campos principais:

- `user_id`
- `access_token`
- `refresh_token`
- `expires_at`

### AuthSession

Representa uma sessao isolada por navegador.

Campos principais:

- `session_id`
- `seller_user_id`
- `frontend_url`
- `status`
- `expires_at`
- `last_seen_at`

### Ad

Representa o cache local do anuncio sincronizado do marketplace.

Campos principais:

- `ml_id`
- `seller_user_id`
- `title`
- `price`
- `available_quantity`
- `status`
- `sync_state`
- `sync_note`
- `last_error`
- `last_sync`
- `remote_state_hash`

## Fluxos principais

### 1. Autenticacao

1. Front chama `GET /api/auth/login`.
2. Backend cria uma `AuthSession` pendente.
3. Backend devolve a URL de OAuth do Mercado Livre com `state`.
4. Usuario autentica no Mercado Livre.
5. Mercado Livre chama `/api/auth/callback`.
6. Backend troca o `code` por token, ativa a sessao e redireciona ao frontend com `session_id`.
7. Front armazena `session_id` e passa esse header nas chamadas seguintes.

### 2. Sincronizacao

1. Front chama `POST /api/ads/sync`.
2. Backend resolve a sessao atual.
3. Backend busca os itens do seller na API do Mercado Livre.
4. Cada item remoto e salvo/atualizado no Mongo.
5. Itens nao retornados na busca ficam com `sync_state = missing_remote`.
6. Mudancas remotas detectadas entre snapshots ficam com `sync_state = remote_changed`.

### 3. Criacao

1. Usuario informa o titulo.
2. Front usa `GET /api/ads/category-predictor`.
3. Usuario escolhe a categoria.
4. Front usa `GET /api/ads/category-context`.
5. Front monta os atributos dinamicos.
6. Front chama `POST /api/ads/validate`.
7. Se o payload passar, chama `POST /api/ads`.
8. Backend publica no Mercado Livre e persiste o item localmente.

### 4. Edicao

1. Usuario abre o modal de edicao.
2. Front envia `expected_updated_at`.
3. Backend compara com o `updatedAt` atual do registro local.
4. Se houve mudanca no meio da edicao, o backend retorna `409` e marca `sync_state = conflict`.
5. Se nao houve conflito, backend atualiza no Mercado Livre e persiste o snapshot novo.

## Variaveis de ambiente

### Backend (`backend/.env`)

Copie `backend/.env.example` para `backend/.env`.

- `PORT`
- `MONGO_URI`
- `ML_APP_ID`
- `ML_SECRET_KEY`
- `ML_REDIRECT_URI`
- `FRONTEND_URL`
- `CORS_ORIGIN`

### Frontend (`frontend/.env`)

Copie `frontend/.env.example` para `frontend/.env`.

- `VITE_API_URL`

## Rodando localmente

### 1. Banco

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Scripts importantes

### Backend

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run typecheck`

### Frontend

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run preview`

## Endpoints principais

### Auth

- `GET /api/auth/login`
- `GET /api/auth/callback`
- `GET /api/auth/status`
- `GET /api/auth/me`
- `DELETE /api/auth/session`

### Ads

- `GET /api/ads`
- `POST /api/ads/sync`
- `GET /api/ads/category-predictor?title=...`
- `GET /api/ads/category-context?category_id=...`
- `GET /api/ads/listing-types?category_id=...`
- `POST /api/ads/validate`
- `POST /api/ads`
- `PUT /api/ads/:id`

## Documentacao complementar

- [Arquitetura](./docs/ARCHITECTURE.md)
- [Endpoints](./docs/ENDPOINTS.md)
- [Melhorias implementadas](./docs/IMPLEMENTED_IMPROVEMENTS.md)
- [Guia de apresentacao](./docs/PRESENTATION_GUIDE.md)

## Deploy

### Frontend

- Vercel
- env principal:
  - `VITE_API_URL=https://SEU-BACKEND.onrender.com/api`

### Backend

- Render
- env principais:
  - `MONGO_URI`
  - `ML_APP_ID`
  - `ML_SECRET_KEY`
  - `ML_REDIRECT_URI`
  - `FRONTEND_URL`
  - `CORS_ORIGIN`

### Mercado Livre

A `ML_REDIRECT_URI` cadastrada no app do Mercado Livre precisa bater exatamente com:

```text
https://SEU-BACKEND.onrender.com/api/auth/callback
```

## Limitacoes conhecidas

- O controle de concorrencia e basico e focado na edicao rapida do painel.
- A reconciliacao local x marketplace foi melhorada, mas ainda nao usa fila assicrona ou job scheduler.
- O fluxo de atributos depende do que a categoria do Mercado Livre exigir no momento da publicacao.
- O deploy free do Render pode entrar em idle.

## Validacao recomendada antes da entrega

1. Autenticar uma conta no frontend publicado.
2. Sincronizar anuncios.
3. Editar um anuncio.
4. Criar um anuncio com validacao passando.
5. Confirmar o README e os `.env.example`.
