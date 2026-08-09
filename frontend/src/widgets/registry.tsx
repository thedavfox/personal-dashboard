import type { ComponentType } from "react";
import { TodoSyncWidget } from "./TodoSyncWidget";
import { StocksWidget } from "./StocksWidget";
import { LLMDigestWidget } from "./LLMDigestWidget";
import { ClockWidget } from "./ClockWidget";

/**
 * Maps a widget's `type` (set on the backend Widget model) to the component
 * that renders its data. Add a new entry here alongside a new backend
 * plugin in app/widgets/ to introduce a new widget type end-to-end.
 */
export const WIDGET_COMPONENTS: Record<string, ComponentType<any>> = {
  todo_sync: TodoSyncWidget,
  stocks: StocksWidget,
  llm_digest: LLMDigestWidget,
  clock: ClockWidget,
};

export const WIDGET_LABELS: Record<string, string> = {
  todo_sync: "Todo List",
  stocks: "Stocks",
  llm_digest: "LLM Digest",
  clock: "Clock",
};

/** Default grid size (in grid units) for a newly added widget of each type. */
export const WIDGET_DEFAULT_SIZE: Record<string, { w: number; h: number }> = {
  todo_sync: { w: 4, h: 5 },
  stocks: { w: 4, h: 5 },
  llm_digest: { w: 6, h: 5 },
  clock: { w: 3, h: 4 },
};
