# Spendly

Spendly is a chat-based expense tracker built as a simple monorepo:

- `backend/` contains the FastAPI API, SQLAlchemy wiring, and Alembic setup.
- `frontend/` contains the Next.js App Router dashboard shell.
- `docker-compose.yml` runs PostgreSQL locally for development.

## Phase 1 status

This repository currently includes:

- Root project scaffolding
- Local PostgreSQL with Docker Compose
- Minimal FastAPI application shell
- Minimal Next.js application shell
- Environment/config loading
- SQLAlchemy session setup
- Alembic initialization without application models yet

It does not yet include:

- Application models or migrations
- Expense APIs
- Messenger webhook processing
- Parsing logic
- Dashboard analytics UI

## Prerequisites

- Docker Desktop
- Python 3.12+
- Node.js 24+
- npm 11+

## Local setup

### 1. Create env files

From the repo root:

```powershell
Copy-Item .env.example .env
```

From the frontend directory:

```powershell
cd frontend
Copy-Item .env.example .env.local
cd ..
```

### 2. Start PostgreSQL

```powershell
docker compose up -d db
docker compose ps
```

PostgreSQL will be available at `localhost:5432` with the values from the root `.env`.

### 3. Run the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

Backend health endpoint:

- `http://localhost:8000/health`

### 4. Run the frontend

In a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend app:

- `http://localhost:3000`

## Alembic

Alembic is wired to the shared backend settings and SQLAlchemy metadata. There are no application models or revisions yet.

Useful commands:

```powershell
cd backend
alembic current
alembic revision -m "describe change"
alembic upgrade head
```

## Project structure

```text
backend/
  alembic/
  app/
frontend/
  app/
  lib/
docker-compose.yml
README.md
```
