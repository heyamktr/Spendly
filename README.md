# Spendly

Spendly is a chat-based expense tracker with two apps in one monorepo:

- `backend/`: FastAPI API, SQLAlchemy models, Alembic migrations, Messenger webhook processing, and rule-based expense parsing.
- `frontend/`: Next.js internal dashboard for viewing users, spending totals, category breakdowns, and recent transactions.

For the MVP, a Messenger user sends a message like `coffee 5`, the backend parses it into an expense, stores it in PostgreSQL, and the dashboard reads the resulting analytics over REST.

## MVP architecture

1. Meta Messenger sends a webhook event to `POST /api/webhook/messenger`.
2. Spendly stores the raw event in `webhook_events` using a stable `event_key`.
3. Duplicate events are ignored safely.
4. The backend upserts a `users` row by `messenger_psid`.
5. The parser extracts `amount`, `category`, `note`, and `source_text`.
6. On success, the backend stores an `expenses` row and sends a confirmation reply.
7. The Next.js dashboard reads `/api/users`, `/api/analytics/*`, and `/api/expenses`.

## Repo structure

```text
backend/
  alembic/
  app/
  tests/
frontend/
  app/
  components/
  lib/
docker-compose.yml
README.md
```

## Prerequisites

- Docker Desktop
- Python 3.12+
- Node.js 24+
- npm 11+

## Environment files

### Root `.env`

Create the backend env file from the repo root:

```powershell
Copy-Item .env.example .env
```

Required variables:

| Variable | Purpose | Local default |
| --- | --- | --- |
| `APP_NAME` | FastAPI app title | `Spendly API` |
| `ENVIRONMENT` | Controls debug mode | `development` |
| `FRONTEND_URL` | Allowed local frontend origin for CORS | `http://localhost:3000` |
| `MESSENGER_VERIFY_TOKEN` | Token Meta must send back during webhook verification | `spendly-dev-verify-token` |
| `MESSENGER_REPLY_MODE` | `stub` for local testing or `send_api` for real Messenger replies | `stub` |
| `MESSENGER_PAGE_ACCESS_TOKEN` | Page access token for Send API replies | empty |
| `MESSENGER_API_BASE_URL` | Graph API base URL | `https://graph.facebook.com/v22.0` |
| `MESSENGER_REQUEST_TIMEOUT_SECONDS` | Send API timeout | `10` |
| `DATABASE_HOST` | PostgreSQL hostname | `localhost` |
| `DATABASE_PORT` | PostgreSQL port | `5432` |
| `DATABASE_NAME` | PostgreSQL database name | `spendly` |
| `DATABASE_USER` | PostgreSQL username | `spendly` |
| `DATABASE_PASSWORD` | PostgreSQL password | `spendly` |
| `DATABASE_ECHO` | SQLAlchemy SQL logging toggle | `false` |

### Frontend `.env.local`

Create the frontend env file:

```powershell
cd frontend
Copy-Item .env.example .env.local
cd ..
```

Required variable:

| Variable | Purpose | Local default |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL used by the dashboard | `http://localhost:8000` |

## Local development setup

### 1. Start PostgreSQL

From the repo root:

```powershell
docker compose up -d db
docker compose ps
```

`docker compose ps` should show the `db` container as healthy.

### 2. Install backend dependencies

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

### 3. Run Alembic migrations

```powershell
cd backend
alembic upgrade head
```

Useful migration commands:

```powershell
cd backend
alembic current
alembic history
alembic revision -m "describe change"
```

### 4. Run the backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Useful endpoints:

- `http://localhost:8000/health`
- `http://localhost:8000/api/users`
- `http://localhost:8000/api/webhook/messenger`

### 5. Run the frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

The dashboard runs at `http://localhost:3000`.

## Running tests

From the backend directory:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```

The Phase 6 test suite covers:

- Parser success and failure cases
- Manual expense creation and expense listing
- Summary, by-category, and recent analytics endpoints
- Messenger webhook verification
- New webhook processing
- Duplicate webhook idempotency
- Parse-failure webhook handling

## Manual API checks

### Create a manual expense

First create or identify a user. For a quick local seed, use the Messenger webhook example below or insert a user in a database client. Then call:

```powershell
curl.exe -X POST http://127.0.0.1:8000/api/expenses `
  -H "Content-Type: application/json" `
  -d "{\"user_id\":1,\"amount\":\"5.25\",\"category\":\"food\",\"note\":\"iced coffee\"}"
```

### List expenses for one user

```powershell
curl.exe "http://127.0.0.1:8000/api/expenses?user_id=1&limit=20&offset=0"
```

### Read analytics

```powershell
curl.exe "http://127.0.0.1:8000/api/analytics/summary?user_id=1"
curl.exe "http://127.0.0.1:8000/api/analytics/by-category?user_id=1&period=month"
curl.exe "http://127.0.0.1:8000/api/analytics/recent?user_id=1&limit=10"
```

## Testing the webhook locally

### Verification endpoint

```powershell
curl.exe "http://127.0.0.1:8000/api/webhook/messenger?hub.mode=subscribe&hub.verify_token=spendly-dev-verify-token&hub.challenge=12345"
```

Expected response body:

```text
12345
```

### Local webhook delivery with a sample Messenger payload

With the backend running, send a sample expense message:

```powershell
curl.exe -X POST http://127.0.0.1:8000/api/webhook/messenger `
  -H "Content-Type: application/json" `
  -d "{""object"":""page"",""entry"":[{""id"":""page-123"",""time"":1713523200000,""messaging"":[{""sender"":{""id"":""psid-123""},""recipient"":{""id"":""page-123""},""timestamp"":1713523200000,""message"":{""mid"":""mid.123"",""text"":""coffee 5""}}]}]}"
```

Expected behavior:

- one `webhook_events` row is stored
- one `users` row is created or reused for `psid-123`
- one `expenses` row is created
- the response JSON reports `processed: 1`
- if `MESSENGER_REPLY_MODE=stub`, the confirmation reply is logged by the backend only

To verify idempotency, send the exact same payload again. The second response should report `duplicates: 1`, and Spendly should not create another expense or send another reply.

## Exposing the local webhook to Meta

Meta needs a public HTTPS URL for webhook verification and delivery. The simplest local workflow is:

1. Run PostgreSQL, migrations, and the backend locally.
2. Start a tunnel that forwards public HTTPS traffic to `http://localhost:8000`.
3. Use the public URL plus `/api/webhook/messenger` as the callback URL in Meta.
4. Set Meta's verify token to the same value as `MESSENGER_VERIFY_TOKEN` in your root `.env`.
5. Subscribe the page/app to the `messages` webhook field.
6. Send a message to the connected page and watch the backend logs.

Example tunnel commands:

```powershell
ngrok http 8000
```

or

```powershell
cloudflared tunnel --url http://localhost:8000
```

Your Meta callback URL should look like:

```text
https://your-public-url.example/api/webhook/messenger
```

## Using real Messenger replies

For local development without a real page token, keep:

```text
MESSENGER_REPLY_MODE=stub
```

When you are ready to test real replies:

1. Set `MESSENGER_REPLY_MODE=send_api`
2. Set `MESSENGER_PAGE_ACCESS_TOKEN` to a valid page access token
3. Restart the backend

If the Send API call fails, Spendly still keeps the already stored expense and logs the reply failure instead of rolling back the webhook result.
