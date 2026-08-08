import httpx

from app.config import settings
from app.models import Widget
from app.widgets.base import WidgetPlugin

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

DEFAULT_PROMPT = (
    "List the 5 most relevant articles published today. For each, give the "
    "title, a one-sentence summary, and a direct URL. Respond as a JSON list "
    "of {title, summary, url} objects and nothing else."
)


class LLMDigestWidget(WidgetPlugin):
    """Runs `widget.prompt` (falling back to DEFAULT_PROMPT) through Groq's
    free tier on a slow schedule and caches the result. The prompt is stored
    on the widget itself so it's editable from the UI without a redeploy.
    """

    type_key = "llm_digest"
    update_interval_seconds = 6 * 60 * 60  # 4x/day; override per-widget later if needed

    async def fetch(self, widget: Widget) -> dict:
        if not settings.groq_api_key:
            return {"error": "GROQ_API_KEY is not configured", "result": None}

        prompt = widget.prompt or DEFAULT_PROMPT
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

        if resp.status_code != 200:
            return {"error": f"Groq API error ({resp.status_code}): {resp.text}", "result": None}

        body = resp.json()
        return {"result": body["choices"][0]["message"]["content"]}
