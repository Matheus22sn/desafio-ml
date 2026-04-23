# Desafio ML

Aplicacao full stack para autenticacao de vendedor, sincronizacao e gestao de anuncios do Mercado Livre.

## Stack

- Frontend: React 19 + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Banco: MongoDB

## O que foi estruturado para entrega

- Painel de vendedor com metricas, filtros, edicao rapida e criacao de anuncio.
- Backend com endpoints para sessao, listagem local, sincronizacao, criacao e atualizacao.
- Refresh automatico de token quando a sessao expira.
- Configuracao por ambiente no frontend e no backend.
- Documentacao minima para subir localmente e em producao.

## Estrutura

- `frontend/`: interface web
- `backend/`: API Express e integracao com Mercado Livre
- `docker-compose.yml`: MongoDB local

## Backend

### Variaveis de ambiente

Copie `backend/.env.example` para `backend/.env` e configure:

- `PORT`
- `MONGO_URI`
- `ML_APP_ID`
- `ML_SECRET_KEY`
- `ML_REDIRECT_URI`
- `FRONTEND_URL`
- `CORS_ORIGIN`

### Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run typecheck`

## Frontend

Copie `frontend/.env.example` para `frontend/.env` e configure:

- `VITE_API_URL`

### Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`

## Subindo localmente

1. Rode `docker compose up -d` para subir o MongoDB.
2. Configure o `.env` do backend com as credenciais da aplicacao do Mercado Livre.
3. Inicie o backend em `backend/` com `npm install` e `npm run dev`.
4. Configure o `.env` do frontend apontando para o backend.
5. Inicie o frontend em `frontend/` com `npm install` e `npm run dev`.

## Endpoints principais

- `GET /api/auth/login`
- `GET /api/auth/callback`
- `GET /api/auth/status`
- `GET /api/ads`
- `POST /api/ads/sync`
- `GET /api/ads/listing-types?category_id=...`
- `POST /api/ads`
- `PUT /api/ads/:id`

## Observacoes para producao

- No Mercado Livre, confirme que a `ML_REDIRECT_URI` cadastrada no app eh a mesma usada no backend.
- Em deploy, defina `FRONTEND_URL` e `CORS_ORIGIN` com os dominios publicados.
- O endpoint de criacao repassa para a API do Mercado Livre os campos essenciais do item. Categorias especificas podem exigir validacoes adicionais do marketplace.
