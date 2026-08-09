import time

import httpx

from app.config import settings
from app.models import Widget
from app.widgets.base import WidgetPlugin

# At the 30s poll interval, this keeps roughly 4 hours of history per ticker.
MAX_HISTORY_POINTS = 480

# Profile/metrics/recommendations change slowly, so they're cached on the
# widget's own result and only refetched once stale — keeps the steady-state
# 30s poll down to one API call per ticker instead of four.
PROFILE_TTL_SECONDS = 7 * 24 * 60 * 60
METRICS_TTL_SECONDS = 24 * 60 * 60
RECOMMENDATION_TTL_SECONDS = 24 * 60 * 60
EARNINGS_TTL_SECONDS = 24 * 60 * 60

QUARTERS_OF_EPS_HISTORY = 12


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
                prev = previous_quotes.get(ticker, {})

                resp = await client.get("/quote", params={"symbol": ticker, "token": settings.stock_api_key})
                resp.raise_for_status()
                quote = resp.json()

                history = list(prev.get("history", []))
                history.append({"t": now, "c": quote.get("c")})
                quote["history"] = history[-MAX_HISTORY_POINTS:]

                quote["profile"] = await self._get_cached(
                    client, ticker, prev.get("profile"), PROFILE_TTL_SECONDS, now, "/stock/profile2"
                )
                quote["stats"] = await self._get_stats(client, ticker, prev.get("stats"), now)
                quote["recommendation"] = await self._get_recommendation(
                    client, ticker, prev.get("recommendation"), now
                )
                quote["earnings"] = await self._get_earnings(client, ticker, prev.get("earnings"), now)

                quotes[ticker] = quote

        return {"quotes": quotes}

    async def _get_cached(
        self, client: httpx.AsyncClient, ticker: str, cached: dict | None, ttl: int, now: int, path: str
    ) -> dict:
        if cached and now - cached.get("fetched_at", 0) < ttl:
            return cached
        resp = await client.get(path, params={"symbol": ticker, "token": settings.stock_api_key})
        resp.raise_for_status()
        data = resp.json()
        data["fetched_at"] = now
        return data

    async def _get_stats(self, client: httpx.AsyncClient, ticker: str, cached: dict | None, now: int) -> dict:
        if cached and now - cached.get("fetched_at", 0) < METRICS_TTL_SECONDS:
            return cached
        resp = await client.get(
            "/stock/metric", params={"symbol": ticker, "metric": "all", "token": settings.stock_api_key}
        )
        resp.raise_for_status()
        body = resp.json()
        metric = body.get("metric", {})

        # Real quarterly EPS history, newest-first — comes free in the same
        # call as the headline stats, no extra request needed.
        eps_series = body.get("series", {}).get("quarterly", {}).get("eps", [])
        eps_history = [{"period": e["period"], "eps": e["v"]} for e in eps_series[:QUARTERS_OF_EPS_HISTORY]]
        eps_history.reverse()  # oldest to newest, for left-to-right charting

        return {
            "week52High": metric.get("52WeekHigh"),
            "week52Low": metric.get("52WeekLow"),
            "peTTM": metric.get("peTTM"),
            "beta": metric.get("beta"),
            "epsHistory": eps_history,
            "fetched_at": now,
        }

    async def _get_recommendation(self, client: httpx.AsyncClient, ticker: str, cached: dict | None, now: int) -> dict:
        if cached and now - cached.get("fetched_at", 0) < RECOMMENDATION_TTL_SECONDS:
            return cached
        resp = await client.get("/stock/recommendation", params={"symbol": ticker, "token": settings.stock_api_key})
        resp.raise_for_status()
        periods = resp.json()
        latest = periods[0] if periods else {}
        return {
            "strongBuy": latest.get("strongBuy"),
            "buy": latest.get("buy"),
            "hold": latest.get("hold"),
            "sell": latest.get("sell"),
            "strongSell": latest.get("strongSell"),
            "period": latest.get("period"),
            "fetched_at": now,
        }

    async def _get_earnings(self, client: httpx.AsyncClient, ticker: str, cached: dict | None, now: int) -> dict:
        if cached and now - cached.get("fetched_at", 0) < EARNINGS_TTL_SECONDS:
            return cached
        resp = await client.get("/stock/earnings", params={"symbol": ticker, "token": settings.stock_api_key})
        resp.raise_for_status()
        # Finnhub orders these by fiscal quarter number, not calendar date —
        # sort by period explicitly so the chart reads oldest-to-newest.
        quarters = sorted(resp.json(), key=lambda q: q.get("period") or "")
        return {
            "quarters": [
                {
                    "period": q.get("period"),
                    "actual": q.get("actual"),
                    "estimate": q.get("estimate"),
                }
                for q in quarters
            ],
            "fetched_at": now,
        }
