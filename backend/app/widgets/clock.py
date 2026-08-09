from app.models import Widget
from app.widgets.base import WidgetPlugin


class ClockWidget(WidgetPlugin):
    """Renders live from the browser's own clock — nothing to fetch. Exists
    as a plugin only so the widget-type system (creation, validation, the
    scheduler) has something to register; `fetch` is a no-op run rarely."""

    type_key = "clock"
    update_interval_seconds = 24 * 60 * 60

    async def fetch(self, widget: Widget, previous: dict | None) -> dict:
        return {}
