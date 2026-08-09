import httpx

from app.models import Widget
from app.widgets.base import WidgetPlugin

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# WMO weather interpretation codes, simplified.
WEATHER_CODES: dict[int, tuple[str, str]] = {
    0: ("Clear sky", "☀️"),
    1: ("Mainly clear", "🌤️"),
    2: ("Partly cloudy", "⛅"),
    3: ("Overcast", "☁️"),
    45: ("Fog", "🌫️"),
    48: ("Depositing rime fog", "🌫️"),
    51: ("Light drizzle", "🌦️"),
    53: ("Moderate drizzle", "🌦️"),
    55: ("Dense drizzle", "🌦️"),
    56: ("Light freezing drizzle", "🌧️"),
    57: ("Dense freezing drizzle", "🌧️"),
    61: ("Slight rain", "🌧️"),
    63: ("Moderate rain", "🌧️"),
    65: ("Heavy rain", "🌧️"),
    66: ("Light freezing rain", "🌧️"),
    67: ("Heavy freezing rain", "🌧️"),
    71: ("Slight snow fall", "❄️"),
    73: ("Moderate snow fall", "❄️"),
    75: ("Heavy snow fall", "❄️"),
    77: ("Snow grains", "❄️"),
    80: ("Slight rain showers", "🌦️"),
    81: ("Moderate rain showers", "🌦️"),
    82: ("Violent rain showers", "⛈️"),
    85: ("Slight snow showers", "🌨️"),
    86: ("Heavy snow showers", "🌨️"),
    95: ("Thunderstorm", "⛈️"),
    96: ("Thunderstorm with slight hail", "⛈️"),
    99: ("Thunderstorm with heavy hail", "⛈️"),
}


def _describe(code: int | None) -> dict:
    description, icon = WEATHER_CODES.get(code, ("Unknown", "❓"))
    return {"description": description, "icon": icon}


class WeatherWidget(WidgetPlugin):
    """Fetches current conditions + a 5-day forecast from Open-Meteo, which
    is free with no API key. Config: {"lat": float, "lon": float, "label":
    optional display name}. The frontend sets lat/lon via the browser's
    geolocation API or Open-Meteo's free geocoding endpoint (called directly
    from the client — no key needed there either).
    """

    type_key = "weather"
    update_interval_seconds = 15 * 60

    async def fetch(self, widget: Widget, previous: dict | None) -> dict:
        lat = widget.config.get("lat")
        lon = widget.config.get("lon")
        if lat is None or lon is None:
            return {"error": "no location configured"}

        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
            "daily": "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
            "temperature_unit": "fahrenheit",
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "timezone": "auto",
            "forecast_days": 5,
        }
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(FORECAST_URL, params=params)
        resp.raise_for_status()
        body = resp.json()

        current = body.get("current", {})
        daily = body.get("daily", {})

        forecast = []
        for i, date in enumerate(daily.get("time", [])):
            forecast.append(
                {
                    "date": date,
                    "tempMax": daily["temperature_2m_max"][i],
                    "tempMin": daily["temperature_2m_min"][i],
                    "precipProbability": daily.get("precipitation_probability_max", [None])[i],
                    **_describe(daily["weather_code"][i]),
                }
            )

        return {
            "current": {
                "temperature": current.get("temperature_2m"),
                "feelsLike": current.get("apparent_temperature"),
                "humidity": current.get("relative_humidity_2m"),
                "windSpeed": current.get("wind_speed_10m"),
                **_describe(current.get("weather_code")),
            },
            "forecast": forecast,
            "label": widget.config.get("label"),
        }
