from app.widgets.base import WidgetPlugin
from app.widgets.llm_digest import LLMDigestWidget
from app.widgets.stocks import StocksWidget
from app.widgets.todo_sync import TodoSyncWidget

REGISTRY: dict[str, WidgetPlugin] = {
    plugin.type_key: plugin
    for plugin in (TodoSyncWidget(), StocksWidget(), LLMDigestWidget())
}


def get_plugin(widget_type: str) -> WidgetPlugin | None:
    return REGISTRY.get(widget_type)
