import json

import httpx

from app.config import settings
from app.models import Widget
from app.widgets.base import WidgetPlugin

TAVILY_URL = "https://api.tavily.com/search"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

DEFAULT_PROMPT = "Find the 5 most relevant articles published in the last few days."

FORMAT_INSTRUCTIONS = (
    "You are a research assistant. Base your answer only on the web search "
    "results provided below — use their real titles and URLs, never invent "
    "articles or links. If fewer than 5 are genuinely relevant, return fewer.\n\n"
    'Respond with strict JSON and nothing else, in this exact shape: '
    '{"articles": [{"title": string, "url": string, "summary": string '
    "(one sentence)}]}"
)


async def _search(query: str) -> list[dict]:
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            TAVILY_URL,
            json={
                "api_key": settings.tavily_api_key,
                "query": query,
                "topic": "news",
                "days": 3,
                "max_results": 8,
            },
        )
    resp.raise_for_status()
    return resp.json().get("results", [])


def _build_user_message(topic: str, results: list[dict]) -> str:
    if not results:
        return f"Topic: {topic}\n\n(No web search results were found for this topic.)"

    listing = "\n\n".join(
        f"- Title: {r['title']}\n  URL: {r['url']}\n  Excerpt: {r.get('content', '')[:400]}" for r in results
    )
    return f"Topic: {topic}\n\nSearch results:\n\n{listing}"


class LLMDigestWidget(WidgetPlugin):
    """Searches the web via Tavily for real, current results on the topic in
    `widget.prompt` (falling back to DEFAULT_PROMPT), then has Groq's free
    tier pick and summarize the most relevant ones as structured JSON. The
    prompt is stored on the widget itself so it's editable from the UI
    without a redeploy — it only ever describes *what* to look for, since
    *how* the result is formatted is enforced separately (FORMAT_INSTRUCTIONS)
    so the frontend can always render a consistent link list.
    """

    type_key = "llm_digest"
    update_interval_seconds = 6 * 60 * 60  # 4x/day; also re-runs immediately whenever the widget is edited

    async def fetch(self, widget: Widget, previous: dict | None) -> dict:
        if not settings.tavily_api_key:
            return {"error": "TAVILY_API_KEY is not configured", "articles": []}
        if not settings.groq_api_key:
            return {"error": "GROQ_API_KEY is not configured", "articles": []}

        topic = widget.prompt or DEFAULT_PROMPT

        try:
            results = await _search(topic)
        except httpx.HTTPStatusError as e:
            return {"error": f"Tavily search error ({e.response.status_code}): {e.response.text}", "articles": []}

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": FORMAT_INSTRUCTIONS},
                        {"role": "user", "content": _build_user_message(topic, results)},
                    ],
                },
            )

        if resp.status_code != 200:
            return {"error": f"Groq API error ({resp.status_code}): {resp.text}", "articles": []}

        content = resp.json()["choices"][0]["message"]["content"]
        try:
            parsed = json.loads(content)
            articles = parsed["articles"]
        except (json.JSONDecodeError, KeyError, TypeError):
            return {"error": "Model returned an unexpected format", "articles": []}

        return {"articles": articles}
