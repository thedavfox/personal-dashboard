from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import settings
from app.models import Widget
from app.widgets.base import WidgetPlugin

_todo_engine = create_async_engine(settings.todo_db_url) if settings.todo_db_url else None


class TodoSyncWidget(WidgetPlugin):
    """Polls the separate TODO_List app's `tasks` table (columns: id,
    taskName, dueDate, status — see ../../../TODO_List/database/functions.py).

    Polling (rather than a webhook from the TODO app) is the simplest way to
    stay decoupled from that app's internals; the interval controls how
    quickly changes show up here.
    """

    type_key = "todo_sync"
    update_interval_seconds = 10

    async def fetch(self, widget: Widget) -> dict:
        if _todo_engine is None:
            return {"error": "TODO_DB_URL is not configured", "tasks": []}

        query = "SELECT id, taskName, dueDate, status FROM tasks ORDER BY dueDate IS NULL, dueDate ASC LIMIT 50"

        async with _todo_engine.connect() as conn:
            result = await conn.execute(text(query))
            tasks = [dict(row._mapping) for row in result]

        return {"tasks": tasks}
