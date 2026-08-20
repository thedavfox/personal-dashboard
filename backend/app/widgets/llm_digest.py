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
    "Keep each summary under 25 words.\n\n"
    "Respond with strict, valid, properly-escaped JSON and nothing else — no "
    "markdown, no code fences, no trailing commas, no comments. Exact shape: "
    '{"articles": [{"title": string, "url": string, "summary": string}]}'
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
                "max_results": 6,
            },
        )
    resp.raise_for_status()
    return resp.json().get("results", [])


def _build_user_message(topic: str, results: list[dict]) -> str:
    if not results:
        return f"Topic: {topic}\n\n(No web search results were found for this topic.)"

    listing = "\n\n".join(
        f"- Title: {r['title']}\n  URL: {r['url']}\n  Excerpt: {r.get('content', '')[:250]}" for r in results
    )
    return f"Topic: {topic}\n\nSearch results:\n\n{listing}"


class _JSONFailure(Exception):
    """Raised when Groq either rejects the request as unparseable JSON or
    returns a 200 whose content isn't the shape we asked for — both are
    worth one retry before giving up, since they're usually a one-off
    generation glitch rather than a real, persistent problem."""


async def _call_groq(client: httpx.AsyncClient, messages: list[dict]) -> list[dict]:
    resp = await client.post(
        GROQ_URL,
        headers={"Authorization": f"Bearer {settings.groq_api_key}"},
        json={
            "model": "openai/gpt-oss-120b",
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
            "max_tokens": 2000,
            "messages": messages,
        },
    )

    if resp.status_code == 400 and "json_validate_failed" in resp.text:
        raise _JSONFailure(f"Groq couldn't produce valid JSON: {resp.text}")
    if resp.status_code != 200:
        raise RuntimeError(f"Groq API error ({resp.status_code}): {resp.text}")

    content = resp.json()["choices"][0]["message"]["content"]
    try:
        return json.loads(content)["articles"]
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        raise _JSONFailure(f"Model returned an unexpected format: {e}") from e


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

        messages = [
            {"role": "system", "content": FORMAT_INSTRUCTIONS},
            {"role": "user", "content": _build_user_message(topic, results)},
        ]

        async with httpx.AsyncClient(timeout=30) as client:
            try:
                articles = await _call_groq(client, messages)
            except _JSONFailure:
                try:
                    articles = await _call_groq(client, messages)  # one retry — usually a one-off glitch
                except _JSONFailure as e:
                    return {"error": str(e), "articles": []}
            except RuntimeError as e:
                return {"error": str(e), "articles": []}

        return {"articles": articles}
