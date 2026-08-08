import time

import httpx

from app.config import settings
from app.models import Widget
from app.widgets.base import WidgetPlugin

# At the 30s poll interval, this keeps roughly 4 hours of history per ticker.
MAX_HISTORY_POINTS = 480


class StocksWidget(WidgetPlugin):
    """Polls a market-data API for a configurable list of tickers.
    Config: {"tickers": ["AAPL", "MSFT"]}.

    Uses Finnhub's quote endpoint by default (free tier: 60 calls/min); swap
    STOCK_API_BASE_URL / the request shape below if you use a different
    provider. Finnhub's free tier doesn't include historical candles, so
    price history is built up from our own polls rather than fetched —
    each quote's price is appended to a rolling window carried forward via
    `previous`, capped at MAX_HISTORY_POINTS.
    """

    type_key = "stocks"
    update_interval_seconds = 30

    async def fetch(self, widget: Widget, previous: dict | None) -> dict:
        tickers: list[str] = widget.config.get("tickers", [])
        if not tickers or not settings.stock_api_key:
            return {"error": "no tickers configured or STOCK_API_KEY missing", "quotes": {}}

        previous_quotes = (previous or {}).get("quotes", {})
        now = int(time.time())

        quotes = {}
        async with httpx.AsyncClient(base_url=settings.stock_api_base_url, timeout=10) as client:
            for ticker in tickers:
                resp = await client.get("/quote", params={"symbol": ticker, "token": settings.stock_api_key})
                resp.raise_for_status()
                quote = resp.json()

                history = list(previous_quotes.get(ticker, {}).get("history", []))
                history.append({"t": now, "c": quote.get("c")})
                quote["history"] = history[-MAX_HISTORY_POINTS:]

                quotes[ticker] = quote

        return {"quotes": quotes}
