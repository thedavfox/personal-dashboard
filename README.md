# Personal Dashboard

A multi-user, live-updating dashboard made of pluggable widgets.

Each widget type owns its own data-fetch strategy on the backend (DB polling,
external API polling, or scheduled LLM jobs) and pushes updates to the
browser over a single WebSocket connection. The frontend doesn't need to know
how a widget gets its data, only how to render it.

## Planned widgets

- **Todo sync** — reflects tasks from the [TODO_List](../TODO_List) app's database
- **Stocks** — live-ish price charts for a configurable list of tickers
- **LLM digest** — scheduled Claude/GPT calls with a user-editable prompt
  (e.g. daily top gastroenterology articles)

## Stack

- **Backend**: FastAPI (Python), SQLAlchemy + Alembic, Postgres, WebSockets,
  APScheduler for polling/cron jobs
- **Frontend**: React + TypeScript (Vite), react-grid-layout for per-user
  dashboard layout, a shared WebSocket hook

## Project layout

```
backend/    FastAPI app, models, widget plugins, scheduler
frontend/   React app
```

## Development

See `backend/README.md` and `frontend/README.md` (once scaffolded) for setup.
