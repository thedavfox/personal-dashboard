# Backend

FastAPI app: auth, dashboards/widgets CRUD, a WebSocket that pushes live
widget updates, and a scheduler that polls/runs each widget's plugin.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in DATABASE_URL etc.
```

Requires a running Postgres instance for `DATABASE_URL`. Tables are created
automatically on startup (no Alembic migrations yet — add them once the
schema stabilizes).

## Run

```bash
uvicorn app.main:app --reload
```

## Adding a new widget type

1. Create `app/widgets/your_widget.py` subclassing `WidgetPlugin` (see
   `app/widgets/base.py`) — implement `fetch()` and set `type_key` /
   `update_interval_seconds`.
2. Register it in `app/widgets/registry.py`.
3. The scheduler and API pick it up automatically — no other changes needed.
