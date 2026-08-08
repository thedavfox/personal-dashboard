from abc import ABC, abstractmethod

from app.models import Widget


class WidgetPlugin(ABC):
    """Base class for a widget type. Each subclass encapsulates how that
    widget's data is produced — a DB poll, an external API poll, or a
    scheduled LLM call — behind one `fetch` method. The scheduler and
    websocket layer don't need to know which strategy a given widget uses.
    """

    #: unique key stored in Widget.type and used to look the plugin up
    type_key: str

    #: how often the scheduler should call fetch() for this widget type
    update_interval_seconds: int

    @abstractmethod
    async def fetch(self, widget: Widget, previous: dict | None) -> dict:
        """Produce the latest data for this widget instance. `widget.config`
        holds type-specific settings; `widget.prompt` is set for LLM widgets.
        `previous` is this widget's last cached result (or None), for plugins
        that build up a rolling history rather than just the latest value."""
        raise NotImplementedError
