import httpx

from app.config import settings
from app.models import Widget
from app.widgets.base import WidgetPlugin


class StocksWidget(WidgetPlugin):
    """Polls a market-data API for a configurable list of tickers.
    Config: {"tickers": ["AAPL", "MSFT"]}.

    Uses Finnhub's quote endpoint by default (free tier: 60 calls/min); swap
    STOCK_API_BASE_URL / the request shape below if you use a different
    provider.
    """

    type_key = "stocks"
    update_interval_seconds = 30

    async def fetch(self, widget: Widget) -> dict:
        tickers: list[str] = widget.config.get("tickers", [])
        if not tickers or not settings.stock_api_key:
            return {"error": "no tickers configured or STOCK_API_KEY missing", "quotes": {}}

        quotes = {}
        async with httpx.AsyncClient(base_url=settings.stock_api_base_url, timeout=10) as client:
            for ticker in tickers:
                resp = await client.get("/quote", params={"symbol": ticker, "token": settings.stock_api_key})
                resp.raise_for_status()
                quotes[ticker] = resp.json()

        return {"quotes": quotes}
