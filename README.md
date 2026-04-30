# Spendly

Spendly is a chat-first expense tracker. Messenger messages like `coffee 5` are parsed into expenses by a FastAPI backend, stored in PostgreSQL, and shown in a live Next.js dashboard with analytics, receipt scanning, CSV export, and manual expense controls.

## Features

- Messenger webhook verification and event ingestion
- Idempotent webhook processing to prevent duplicate expenses from repeated events
- Rule-based parsing for short expense messages
- Receipt image scanning with Tesseract OCR and editable scan previews
- REST APIs for users, expenses, analytics, receipt scanning, and CSV export
- Next.js dashboard with user selection, live polling, search, period filters, category charts, insights, custom categories, settings, and light/dark themes
- Manual expense create, edit, delete, and export workflows
- PostgreSQL schema managed with Alembic
- Backend tests for parsing, receipts, expenses, analytics, and webhooks

## Tech Stack

- Backend: Python 3.12, FastAPI, SQLAlchemy, Alembic, Pydantic Settings, PostgreSQL
- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS, Recharts
- Local infrastructure: Docker Compose for PostgreSQL
- OCR: Tesseract CLI

## Repository Layout

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
|-- scripts/
|-- docker-compose.yml
|-- package.json
`-- README.md
```

## Prerequisites

- Docker Desktop
- Python 3.12+
- Node.js 20+
- npm
- Tesseract OCR for receipt scanning

Receipt scanning works only when the `tesseract` executable is installed and available on `PATH`, or when `TESSERACT_PATH` points to the executable.

## Environment Setup

Create a root `.env` file for the backend and Docker Compose:

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

TESSERACT_PATH=
RECEIPT_OCR_TIMEOUT_SECONDS=20

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=spendly
DATABASE_USER=spendly
DATABASE_PASSWORD=spendly
DATABASE_ECHO=false
"@ | Set-Content .env
```

Create `frontend/.env.local` for the dashboard:

```powershell
@"
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
"@ | Set-Content frontend\.env.local
```

Keep `MESSENGER_REPLY_MODE=stub` for local webhook testing. Use `send_api` with a real `MESSENGER_PAGE_ACCESS_TOKEN` only when the app should send Messenger replies.

## Local Development

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

Install and start the frontend in another terminal:

```powershell
cd frontend
npm install
npm run dev
```

The dashboard runs at `http://localhost:3000`.

## Useful Commands

Run all checks from the repository root:

```powershell
npm run check
```

Frontend checks:

```powershell
npm run frontend:typecheck
npm run frontend:build
npm run frontend:check
```

Backend checks:

```powershell
npm run backend:lint
npm run backend:test
```

Direct backend commands:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
ruff check --no-cache .
alembic current
alembic history
alembic revision -m "describe change"
alembic upgrade head
```

## API Endpoints

- `GET /health`
- `GET /api/users`
- `GET /api/expenses?user_id=1&limit=20&offset=0`
- `GET /api/expenses/export.csv?user_id=1`
- `POST /api/expenses`
- `POST /api/expenses/scan-receipt`
- `PATCH /api/expenses/{expense_id}`
- `DELETE /api/expenses/{expense_id}`
- `GET /api/analytics/summary?user_id=1`
- `GET /api/analytics/by-category?user_id=1&period=month`
- `GET /api/analytics/recent?user_id=1&limit=10`
- `GET /api/webhook/messenger`
- `POST /api/webhook/messenger`

## Manual API Checks

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

Export expenses:

```powershell
curl.exe "http://127.0.0.1:8000/api/expenses/export.csv?user_id=1" -o spendly-expenses.csv
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

## Testing Messenger Locally

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

- A `webhook_events` row is stored
- A `users` row is created or reused for `psid-123`
- An `expenses` row is created
- The response reports `processed: 1`
- In stub reply mode, the reply is logged instead of sent to Messenger

Send the same payload again to verify idempotency. Spendly should report a duplicate and should not create a second expense.

## Receipt Scanning

Receipt scanning accepts JPG, PNG, WEBP, BMP, and TIFF images up to 6 MB. The backend runs Tesseract OCR, extracts the likely total and merchant, infers a category from recent history and keywords, then returns a preview. The frontend saves the final edited result through the normal expense creation endpoint.

If scans fail locally, check:

- `tesseract --version` works in the terminal that starts the backend
- `TESSERACT_PATH` points to the executable if Tesseract is not on `PATH`
- The receipt image has a visible final total and readable text

## Exposing the Webhook to Meta

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

## Dashboard Workflow

1. Start PostgreSQL, the backend, and the frontend.
2. Create a user by sending a sample Messenger webhook event.
3. Open `http://localhost:3000`.
4. Select the Messenger user.
5. Add expenses with the log button, scan a receipt image, or send more webhook payloads.
6. Use search, period controls, category filters, analytics, CSV export, and settings to inspect the live data.

The dashboard polls the backend every 3 seconds so webhook activity and manual edits appear without a full page refresh.
