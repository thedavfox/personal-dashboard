from google import genai

from app.config import settings
from app.models import Widget
from app.widgets.base import WidgetPlugin

_client = genai.Client(api_key=settings.gemini_api_key) if settings.gemini_api_key else None

DEFAULT_PROMPT = (
    "List the 5 most relevant articles published today. For each, give the "
    "title, a one-sentence summary, and a direct URL. Respond as a JSON list "
    "of {title, summary, url} objects and nothing else."
)


class LLMDigestWidget(WidgetPlugin):
    """Runs `widget.prompt` (falling back to DEFAULT_PROMPT) through Gemini's
    free tier on a slow schedule and caches the result. The prompt is stored
    on the widget itself so it's editable from the UI without a redeploy.
    """

    type_key = "llm_digest"
    update_interval_seconds = 6 * 60 * 60  # 4x/day; override per-widget later if needed

    async def fetch(self, widget: Widget) -> dict:
        if _client is None:
            return {"error": "GEMINI_API_KEY is not configured", "result": None}

        prompt = widget.prompt or DEFAULT_PROMPT
        response = await _client.aio.models.generate_content(model="gemini-2.0-flash", contents=prompt)
        return {"result": response.text}
