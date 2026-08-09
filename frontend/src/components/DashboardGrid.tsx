import { useState } from "react";
import GridLayout, { type Layout } from "react-grid-layout";
import type { Dashboard, Widget } from "../api/client";
import { api } from "../api/client";
import { useWidgetSocket, type WidgetResultEntry } from "../hooks/useWidgetSocket";
import { relativeTime } from "../lib/relativeTime";
import { WIDGET_COMPONENTS, WIDGET_LABELS } from "../widgets/registry";
import "react-grid-layout/css/styles.css";

interface Props {
  dashboard: Dashboard;
  onChange: () => void;
}

function initialResultsFor(dashboard: Dashboard): Record<string, WidgetResultEntry> {
  const initial: Record<string, WidgetResultEntry> = {};
  for (const widget of dashboard.widgets) {
    if (widget.latest_result) {
      initial[widget.id] = { data: widget.latest_result.data, generatedAt: widget.latest_result.generated_at };
    }
  }
  return initial;
}

export function DashboardGrid({ dashboard, onChange }: Props) {
  const liveResults = useWidgetSocket(initialResultsFor(dashboard));
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const layout = dashboard.widgets.map((w) => ({ i: w.id, ...w.layout }));

  async function handleLayoutChange(newLayout: Layout[]) {
    for (const item of newLayout) {
      const widget = dashboard.widgets.find((w) => w.id === item.i);
      if (!widget) continue;
      const { x, y, w, h } = item;
      if (JSON.stringify(widget.layout) !== JSON.stringify({ x, y, w, h })) {
        await api.updateWidget(dashboard.id, widget.id, { layout: { x, y, w, h } });
      }
    }
  }

  async function handleDeleteWidget(widgetId: string) {
    await api.deleteWidget(dashboard.id, widgetId);
    setConfirmingDelete(null);
    onChange();
  }

  async function handleSavePrompt(widget: Widget, prompt: string) {
    await api.updateWidget(dashboard.id, widget.id, { prompt });
    onChange();
  }

  async function handleSaveConfig(widget: Widget, config: Record<string, unknown>) {
    await api.updateWidget(dashboard.id, widget.id, { config });
    onChange();
  }

  if (dashboard.widgets.length === 0) {
    return <p className="dashboard-empty">No widgets yet — add one above to get started.</p>;
  }

  return (
    <GridLayout
      className="dashboard-grid"
      layout={layout}
      cols={12}
      rowHeight={60}
      width={1200}
      draggableHandle=".widget-header"
      draggableCancel=".widget-remove,.widget-delete-confirm"
      onLayoutChange={handleLayoutChange}
    >
      {dashboard.widgets.map((widget) => {
        const Component = WIDGET_COMPONENTS[widget.type];
        const entry = liveResults[widget.id];
        const confirming = confirmingDelete === widget.id;

        return (
          <div key={widget.id} className="widget-card">
            <div className="widget-header">
              <span>{WIDGET_LABELS[widget.type] ?? widget.type}</span>
              {confirming ? (
                <span className="widget-delete-confirm">
                  <button className="confirm-yes" onClick={() => handleDeleteWidget(widget.id)}>
                    Delete
                  </button>
                  <button className="confirm-no" onClick={() => setConfirmingDelete(null)}>
                    Cancel
                  </button>
                </span>
              ) : (
                <button className="widget-remove" onClick={() => setConfirmingDelete(widget.id)} aria-label="Remove widget">
                  ×
                </button>
              )}
            </div>
            <div className="widget-body">
              {Component ? (
                <Component
                  data={entry?.data}
                  prompt={widget.prompt}
                  onSavePrompt={(prompt: string) => handleSavePrompt(widget, prompt)}
                  config={widget.config}
                  onSaveConfig={(config: Record<string, unknown>) => handleSaveConfig(widget, config)}
                />
              ) : (
                <p className="widget-error">Unknown widget type: {widget.type}</p>
              )}
            </div>
            {entry && <div className="widget-footer">Updated {relativeTime(entry.generatedAt)}</div>}
          </div>
        );
      })}
    </GridLayout>
  );
}
