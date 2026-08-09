from app.widgets.base import WidgetPlugin
from app.widgets.clock import ClockWidget
from app.widgets.llm_digest import LLMDigestWidget
from app.widgets.stocks import StocksWidget
from app.widgets.todo_sync import TodoSyncWidget
from app.widgets.weather import WeatherWidget

REGISTRY: dict[str, WidgetPlugin] = {
    plugin.type_key: plugin
    for plugin in (TodoSyncWidget(), StocksWidget(), LLMDigestWidget(), ClockWidget(), WeatherWidget())
}


def get_plugin(widget_type: str) -> WidgetPlugin | None:
    return REGISTRY.get(widget_type)
