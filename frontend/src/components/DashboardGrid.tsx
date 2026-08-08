import GridLayout, { type Layout } from "react-grid-layout";
import type { Dashboard, Widget } from "../api/client";
import { api } from "../api/client";
import { useWidgetSocket } from "../hooks/useWidgetSocket";
import { WIDGET_COMPONENTS, WIDGET_LABELS } from "../widgets/registry";
import "react-grid-layout/css/styles.css";

interface Props {
  dashboard: Dashboard;
  onChange: () => void;
}

function initialResultsFor(dashboard: Dashboard): Record<string, unknown> {
  const initial: Record<string, unknown> = {};
  for (const widget of dashboard.widgets) {
    if (widget.latest_result) initial[widget.id] = widget.latest_result.data;
  }
  return initial;
}

export function DashboardGrid({ dashboard, onChange }: Props) {
  const liveResults = useWidgetSocket(initialResultsFor(dashboard));

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
    onChange();
  }

  async function handleSavePrompt(widget: Widget, prompt: string) {
    await api.updateWidget(dashboard.id, widget.id, { prompt });
    onChange();
  }

  return (
    <GridLayout
      className="dashboard-grid"
      layout={layout}
      cols={12}
      rowHeight={60}
      width={1200}
      onLayoutChange={handleLayoutChange}
    >
      {dashboard.widgets.map((widget) => {
        const Component = WIDGET_COMPONENTS[widget.type];
        return (
          <div key={widget.id} className="widget-card">
            <div className="widget-header">
              <span>{WIDGET_LABELS[widget.type] ?? widget.type}</span>
              <button className="widget-remove" onClick={() => handleDeleteWidget(widget.id)}>
                ×
              </button>
            </div>
            <div className="widget-body">
              {Component ? (
                <Component
                  data={liveResults[widget.id]}
                  prompt={widget.prompt}
                  onSavePrompt={(prompt: string) => handleSavePrompt(widget, prompt)}
                />
              ) : (
                <p className="widget-error">Unknown widget type: {widget.type}</p>
              )}
            </div>
          </div>
        );
      })}
    </GridLayout>
  );
}
