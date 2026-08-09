import { useState } from "react";

interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
}

interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipProbability: number | null;
  description: string;
  icon: string;
}

interface Props {
  data: { current?: CurrentWeather; forecast?: ForecastDay[]; label?: string; error?: string } | undefined;
  config: { lat?: number; lon?: number; label?: string } | undefined;
  onSaveConfig: (config: { lat: number; lon: number; label: string }) => void;
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString([], { weekday: "short" });
}

async function geocode(query: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
  const body = await res.json();
  const match = body.results?.[0];
  if (!match) return null;
  const label = [match.name, match.admin1, match.country].filter(Boolean).join(", ");
  return { lat: match.latitude, lon: match.longitude, label };
}

function LocationPicker({ onSaveConfig }: { onSaveConfig: Props["onSaveConfig"] }) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  function useMyLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation isn't available in this browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => onSaveConfig({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "My Location" }),
      (err) => setError(err.message || "Couldn't get your location"),
      { timeout: 10000 }
    );
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const result = await geocode(query.trim());
      if (!result) {
        setError("No matching location found");
        return;
      }
      onSaveConfig(result);
      setQuery("");
    } catch {
      setError("Search failed — try again");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="weather-picker">
      <button type="button" className="weather-use-location" onClick={useMyLocation}>
        📍 Use my location
      </button>
      <form className="weather-search-form" onSubmit={handleSearch}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Or search a city…" />
        <button type="submit" disabled={searching}>
          {searching ? "…" : "Search"}
        </button>
      </form>
      {error && <p className="widget-error">{error}</p>}
    </div>
  );
}

export function WeatherWidget({ data, config, onSaveConfig }: Props) {
  const [changingLocation, setChangingLocation] = useState(false);
  const hasLocation = config?.lat != null && config?.lon != null;

  if (!hasLocation || changingLocation) {
    return (
      <div className="weather-widget">
        <LocationPicker
          onSaveConfig={(c) => {
            onSaveConfig(c);
            setChangingLocation(false);
          }}
        />
      </div>
    );
  }

  if (!data) return <p className="widget-empty">Loading weather…</p>;
  if (data.error) return <p className="widget-error">{data.error}</p>;

  const { current, forecast } = data;

  return (
    <div className="weather-widget">
      <div className="weather-location-row">
        <span className="weather-location-label">{config?.label ?? data.label}</span>
        <button className="weather-change-location" onClick={() => setChangingLocation(true)}>
          Change
        </button>
      </div>

      {current && (
        <div className="weather-current">
          <span className="weather-icon">{current.icon}</span>
          <div className="weather-current-main">
            <span className="weather-temp">{Math.round(current.temperature)}°F</span>
            <span className="weather-description">{current.description}</span>
          </div>
        </div>
      )}

      {current && (
        <div className="weather-meta">
          <span>Feels like {Math.round(current.feelsLike)}°F</span>
          <span>Humidity {current.humidity}%</span>
          <span>Wind {Math.round(current.windSpeed)} mph</span>
        </div>
      )}

      {forecast && forecast.length > 0 && (
        <div className="weather-forecast">
          {forecast.map((day) => (
            <div key={day.date} className="weather-forecast-day">
              <span className="weather-forecast-label">{dayLabel(day.date)}</span>
              <span className="weather-forecast-icon">{day.icon}</span>
              <span className="weather-forecast-temps">
                {Math.round(day.tempMax)}° <span className="weather-forecast-low">{Math.round(day.tempMin)}°</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
