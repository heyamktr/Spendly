# Spendly

Spendly is a chat-first expense tracker with a FastAPI backend and a Next.js dashboard. Messenger messages such as `coffee 5` are parsed into expenses, stored in PostgreSQL, and surfaced in a live analytics workspace.

## What is included

- Messenger webhook verification and event ingestion
- Idempotent webhook processing so duplicate Messenger events do not double-log expenses
- Rule-based expense parsing from short chat messages
- REST endpoints for users, expenses, and analytics
- Manual expense create, edit, and delete support
- Live Next.js dashboard with user selection, search, summary cards, category charts, recent transactions, analytics, settings, and light/dark theme controls
- PostgreSQL schema managed with Alembic
- Backend tests for parsing, expenses, analytics, and webhook behavior

## Tech stack

- Backend: Python 3.12, FastAPI, SQLAlchemy, Alembic, Pydantic Settings, PostgreSQL
- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts
- Local infrastructure: Docker Compose for PostgreSQL

## Repository layout

```text
.
|-- backend/
|   |-- alembic/
|   |-- app/
|   |   |-- api/
|   |   |-- core/
|   |   |-- db/
|   |   |-- models/
|   |   |-- schemas/
|   |   `-- services/
|   |-- tests/
|   `-- pyproject.toml
|-- frontend/
|   |-- app/
|   |-- components/
|   |-- lib/
|   `-- package.json
|-- docker-compose.yml
`-- README.md
```

## Prerequisites

- Docker Desktop
- Python 3.12+
- Node.js 20+ recommended
- npm

## Environment setup

The backend reads configuration from the root `.env` file. Create one at the repository root:

```powershell
@"
APP_NAME=Spendly API
ENVIRONMENT=development
FRONTEND_URL=http://localhost:3000

MESSENGER_VERIFY_TOKEN=spendly-dev-verify-token
MESSENGER_REPLY_MODE=stub
MESSENGER_PAGE_ACCESS_TOKEN=
MESSENGER_API_BASE_URL=https://graph.facebook.com/v22.0
MESSENGER_REQUEST_TIMEOUT_SECONDS=10

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=spendly
DATABASE_USER=spendly
DATABASE_PASSWORD=spendly
DATABASE_ECHO=false
"@ | Set-Content .env
```

The frontend reads its API URL from `frontend/.env.local`:

```powershell
@"
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
"@ | Set-Content frontend\.env.local
```

For local Messenger testing, keep `MESSENGER_REPLY_MODE=stub`. Set `MESSENGER_REPLY_MODE=send_api` and provide `MESSENGER_PAGE_ACCESS_TOKEN` only when you are ready to send real Messenger replies.

## Local development

Start PostgreSQL:

```powershell
docker compose up -d db
docker compose ps
```

Install backend dependencies:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

Run database migrations:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
alembic upgrade head
```

Start the backend API:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`.

Start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The dashboard runs at `http://localhost:3000`.

## Useful commands

Backend tests:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```

Backend lint:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
ruff check --no-cache .
```

Frontend type check:

```powershell
cd frontend
npm run typecheck
```

Frontend production build:

```powershell
cd frontend
npm run build
```

Frontend full check:

```powershell
cd frontend
npm run check
```

Alembic helpers:

```powershell
cd backend
alembic current
alembic history
alembic revision -m "describe change"
alembic upgrade head
```

## API endpoints

- `GET /health`
- `GET /api/users`
- `GET /api/expenses?user_id=1&limit=20&offset=0`
- `POST /api/expenses`
- `PATCH /api/expenses/{expense_id}`
- `DELETE /api/expenses/{expense_id}`
- `GET /api/analytics/summary?user_id=1`
- `GET /api/analytics/by-category?user_id=1&period=month`
- `GET /api/analytics/recent?user_id=1&limit=10`
- `GET /api/webhook/messenger`
- `POST /api/webhook/messenger`

## Manual API checks

Health check:

```powershell
curl.exe http://127.0.0.1:8000/health
```

Create a manual expense after a user exists:

```powershell
curl.exe -X POST http://127.0.0.1:8000/api/expenses `
  -H "Content-Type: application/json" `
  -d "{\"user_id\":1,\"amount\":\"5.25\",\"category\":\"food\",\"note\":\"iced coffee\",\"source_text\":\"coffee 5.25\"}"
```

Update an expense:

```powershell
curl.exe -X PATCH http://127.0.0.1:8000/api/expenses/1 `
  -H "Content-Type: application/json" `
  -d "{\"amount\":\"6.00\",\"category\":\"food\",\"note\":\"latte\"}"
```

Delete an expense:

```powershell
curl.exe -X DELETE http://127.0.0.1:8000/api/expenses/1
```

Read analytics:

```powershell
curl.exe "http://127.0.0.1:8000/api/analytics/summary?user_id=1"
curl.exe "http://127.0.0.1:8000/api/analytics/by-category?user_id=1&period=month"
curl.exe "http://127.0.0.1:8000/api/analytics/recent?user_id=1&limit=10"
```

## Testing Messenger locally

Verify the webhook challenge endpoint:

```powershell
curl.exe "http://127.0.0.1:8000/api/webhook/messenger?hub.mode=subscribe&hub.verify_token=spendly-dev-verify-token&hub.challenge=12345"
```

Expected response body:

```text
12345
```

Send a sample Messenger expense event:

```powershell
curl.exe -X POST http://127.0.0.1:8000/api/webhook/messenger `
  -H "Content-Type: application/json" `
  -d "{""object"":""page"",""entry"":[{""id"":""page-123"",""time"":1713523200000,""messaging"":[{""sender"":{""id"":""psid-123""},""recipient"":{""id"":""page-123""},""timestamp"":1713523200000,""message"":{""mid"":""mid.123"",""text"":""coffee 5""}}]}]}"
```

Expected behavior:

- a `webhook_events` row is stored
- a `users` row is created or reused for `psid-123`
- an `expenses` row is created
- the response reports `processed: 1`
- in stub reply mode, the reply is logged instead of sent to Messenger

Send the exact same payload again to verify idempotency. Spendly should report a duplicate and should not create a second expense.

## Exposing the webhook to Meta

Meta needs a public HTTPS callback URL. A typical local workflow is:

1. Run PostgreSQL, migrations, and the backend locally.
2. Start a tunnel to `http://localhost:8000`.
3. Use the tunnel URL plus `/api/webhook/messenger` as the Meta callback URL.
4. Set Meta's verify token to the same value as `MESSENGER_VERIFY_TOKEN`.
5. Subscribe the app or page to the `messages` webhook field.
6. Send a message to the connected page and watch the backend logs.

Example tunnel commands:

```powershell
ngrok http 8000
```

```powershell
cloudflared tunnel --url http://localhost:8000
```

The callback URL should look like:

```text
https://your-public-url.example/api/webhook/messenger
```

## Dashboard workflow

1. Start the backend and frontend.
2. Create a user by sending a sample Messenger webhook event.
3. Open `http://localhost:3000`.
4. Select the Messenger user.
5. Use the floating log button to add expenses manually, or send more webhook payloads.
6. Use search, period controls, category filters, analytics, and settings to inspect the live data.

The dashboard polls the backend every 3 seconds so webhook activity and manual edits appear without a full page refresh.
