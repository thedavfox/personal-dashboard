from anthropic import AsyncAnthropic

from app.config import settings
from app.models import Widget
from app.widgets.base import WidgetPlugin

_client = AsyncAnthropic(api_key=settings.anthropic_api_key) if settings.anthropic_api_key else None

DEFAULT_PROMPT = (
    "List the 5 most relevant articles published today. For each, give the "
    "title, a one-sentence summary, and a direct URL. Respond as a JSON list "
    "of {title, summary, url} objects and nothing else."
)


class LLMDigestWidget(WidgetPlugin):
    """Runs `widget.prompt` (falling back to DEFAULT_PROMPT) through Claude
    on a slow schedule and caches the result. The prompt is stored on the
    widget itself so it's editable from the UI without a redeploy.
    """

    type_key = "llm_digest"
    update_interval_seconds = 6 * 60 * 60  # 4x/day; override per-widget later if needed

    async def fetch(self, widget: Widget) -> dict:
        if _client is None:
            return {"error": "ANTHROPIC_API_KEY is not configured", "result": None}

        prompt = widget.prompt or DEFAULT_PROMPT
        message = await _client.messages.create(
            model="claude-sonnet-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(block.text for block in message.content if block.type == "text")
        return {"result": text}
