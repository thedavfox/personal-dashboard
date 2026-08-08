import { useState } from "react";
import { api, type Dashboard } from "../api/client";
import { WIDGET_DEFAULT_SIZE, WIDGET_LABELS } from "../widgets/registry";
import { nextLayout } from "../lib/gridLayout";

interface Props {
  dashboard: Dashboard;
  onAdded: () => void;
}

export function AddWidgetForm({ dashboard, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("todo_sync");
  const [tickers, setTickers] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const config: Record<string, unknown> = {};
    if (type === "stocks") {
      const list = tickers
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);
      if (list.length === 0) {
        setError("Enter at least one ticker symbol");
        return;
      }
      config.tickers = list;
    }

    const layout = nextLayout(
      dashboard.widgets.map((w) => w.layout),
      WIDGET_DEFAULT_SIZE[type] ?? { w: 4, h: 4 }
    );

    setSubmitting(true);
    try {
      await api.createWidget(dashboard.id, {
        type,
        config,
        prompt: type === "llm_digest" && prompt.trim() ? prompt.trim() : null,
        layout,
      });
      setTickers("");
      setPrompt("");
      setOpen(false);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add widget");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button className="add-widget-toggle" onClick={() => setOpen(true)}>
        + Add widget
      </button>
    );
  }

  return (
    <form className="add-widget-form" onSubmit={handleSubmit}>
      <div className="add-widget-row">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(WIDGET_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {type === "stocks" && (
          <input
            value={tickers}
            onChange={(e) => setTickers(e.target.value)}
            placeholder="Tickers, e.g. AAPL, MSFT"
            autoFocus
          />
        )}

        {type === "llm_digest" && (
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Prompt (optional — can edit later, defaults to the built-in one)"
            autoFocus
          />
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? "Adding…" : "Add"}
        </button>
        <button type="button" className="link-btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error && <p className="widget-error">{error}</p>}
    </form>
  );
}
