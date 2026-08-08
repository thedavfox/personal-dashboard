import httpx

from app.config import settings
from app.models import Widget
from app.widgets.base import WidgetPlugin

TAVILY_URL = "https://api.tavily.com/search"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

DEFAULT_PROMPT = (
    "List the 5 most relevant articles published today. For each, give the "
    "title, a one-sentence summary, and a direct URL. Respond as a JSON list "
    "of {title, summary, url} objects and nothing else."
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


def _build_augmented_prompt(prompt: str, results: list[dict]) -> str:
    if not results:
        return prompt + "\n\n(No web search results were found — answer from general knowledge, and say so.)"

    listing = "\n\n".join(
        f"- Title: {r['title']}\n  URL: {r['url']}\n  Excerpt: {r.get('content', '')[:400]}" for r in results
    )
    return (
        f"{prompt}\n\n"
        "Base your answer only on these real, current web search results — use their actual titles "
        "and URLs, don't invent articles or links:\n\n"
        f"{listing}"
    )


class LLMDigestWidget(WidgetPlugin):
    """Searches the web via Tavily for real, current results on the topic in
    `widget.prompt` (falling back to DEFAULT_PROMPT), then has Groq's free
    tier summarize/format them. The prompt is stored on the widget itself so
    it's editable from the UI without a redeploy.
    """

    type_key = "llm_digest"
    update_interval_seconds = 6 * 60 * 60  # 4x/day; override per-widget later if needed

    async def fetch(self, widget: Widget) -> dict:
        if not settings.tavily_api_key:
            return {"error": "TAVILY_API_KEY is not configured", "result": None}
        if not settings.groq_api_key:
            return {"error": "GROQ_API_KEY is not configured", "result": None}

        prompt = widget.prompt or DEFAULT_PROMPT

        try:
            results = await _search(prompt)
        except httpx.HTTPStatusError as e:
            return {"error": f"Tavily search error ({e.response.status_code}): {e.response.text}", "result": None}

        augmented_prompt = _build_augmented_prompt(prompt, results)

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [{"role": "user", "content": augmented_prompt}],
                },
            )

        if resp.status_code != 200:
            return {"error": f"Groq API error ({resp.status_code}): {resp.text}", "result": None}

        body = resp.json()
        return {"result": body["choices"][0]["message"]["content"]}
