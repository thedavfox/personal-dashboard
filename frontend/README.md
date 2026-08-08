# Frontend

React + TypeScript (Vite). One dashboard grid made of widgets, fed by a
single WebSocket connection (`src/hooks/useWidgetSocket.ts`) that the
backend pushes updates on.

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_BASE_URL at the backend
npm run dev
```

## Adding a new widget type

1. Create `src/widgets/YourWidget.tsx` — receives `data` (whatever the
   backend plugin's `fetch()` returns) as a prop.
2. Register it in `src/widgets/registry.tsx` under the same `type` key used
   in the backend plugin's `type_key`.

No other frontend changes needed — `DashboardGrid` and `AddWidgetForm` are
generic over whatever's in the registry.
