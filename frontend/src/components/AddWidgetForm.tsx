import { useState } from "react";
import { api } from "../api/client";
import { WIDGET_LABELS } from "../widgets/registry";

interface Props {
  dashboardId: string;
  onAdded: () => void;
}

export function AddWidgetForm({ dashboardId, onAdded }: Props) {
  const [type, setType] = useState("todo_sync");
  const [configText, setConfigText] = useState("{}");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(configText);
    } catch {
      setError("Config must be valid JSON");
      return;
    }
    await api.createWidget(dashboardId, { type, config });
    onAdded();
  }

  return (
    <form className="add-widget-form" onSubmit={handleSubmit}>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        {Object.entries(WIDGET_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <input
        value={configText}
        onChange={(e) => setConfigText(e.target.value)}
        placeholder='e.g. {"tickers": ["AAPL"]}'
      />
      <button type="submit">Add widget</button>
      {error && <span className="widget-error">{error}</span>}
    </form>
  );
}
