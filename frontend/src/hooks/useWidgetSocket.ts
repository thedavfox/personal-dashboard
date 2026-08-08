import { useEffect, useRef, useState } from "react";
import { API_BASE, getToken } from "../api/client";

type WidgetUpdateEvent = { type: "widget_update"; widget_id: string; data: unknown };

/**
 * One WebSocket connection shared by every widget on the dashboard. Backend
 * pushes an event per widget whenever its scheduled fetch produces new data
 * (see app/scheduler.py); we key incoming results by widget_id and let each
 * widget component read only its own slice.
 */
export function useWidgetSocket(initialResults: Record<string, unknown> = {}) {
  const [results, setResults] = useState<Record<string, unknown>>(initialResults);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const wsUrl = `${API_BASE.replace(/^http/, "ws")}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const payload: WidgetUpdateEvent = JSON.parse(event.data);
      if (payload.type === "widget_update") {
        setResults((prev) => ({ ...prev, [payload.widget_id]: payload.data }));
      }
    };

    return () => ws.close();
  }, []);

  return results;
}
