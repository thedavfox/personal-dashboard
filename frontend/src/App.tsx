import { useCallback, useEffect, useState } from "react";
import { api, clearToken, getToken, type Dashboard } from "./api/client";
import { LoginForm } from "./components/LoginForm";
import { DashboardGrid } from "./components/DashboardGrid";
import { AddWidgetForm } from "./components/AddWidgetForm";
import "./App.css";

function App() {
  const [loggedIn, setLoggedIn] = useState(() => !!getToken());
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  const loadDashboard = useCallback(async () => {
    const dashboards = await api.listDashboards();
    if (dashboards.length > 0) {
      setDashboard(dashboards[0]);
    } else {
      const created = await api.createDashboard("My Dashboard");
      setDashboard(created);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) loadDashboard();
  }, [loggedIn, loadDashboard]);

  if (!loggedIn) {
    return <LoginForm onLoggedIn={() => setLoggedIn(true)} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>{dashboard?.name ?? "Dashboard"}</h1>
        <button
          className="link-btn"
          onClick={() => {
            clearToken();
            setLoggedIn(false);
            setDashboard(null);
          }}
        >
          Log out
        </button>
      </header>

      {dashboard && (
        <>
          <AddWidgetForm dashboard={dashboard} onAdded={loadDashboard} />
          <DashboardGrid dashboard={dashboard} onChange={loadDashboard} />
        </>
      )}
    </div>
  );
}

export default App;
