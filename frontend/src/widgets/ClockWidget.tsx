import { useEffect, useRef, useState } from "react";

type View = "digital" | "analog";

function DigitalFace({ now }: { now: Date }) {
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const date = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="clock-digital">
      <span className="clock-digital-time">{time}</span>
      <span className="clock-digital-date">{date}</span>
    </div>
  );
}

function AnalogFace({ now }: { now: Date }) {
  const hours = now.getHours() % 12;
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const secDeg = seconds * 6;
  const minDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  const ticks = Array.from({ length: 12 }, (_, i) => i);

  return (
    <svg viewBox="0 0 100 100" className="clock-analog">
      <circle cx="50" cy="50" r="47" className="clock-face" />
      {ticks.map((i) => (
        <line
          key={i}
          x1="50"
          y1="6"
          x2="50"
          y2={i % 3 === 0 ? "12" : "9"}
          className="clock-tick"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
      <line x1="50" y1="50" x2="50" y2="27" className="clock-hand clock-hand-hour" transform={`rotate(${hourDeg} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="16" className="clock-hand clock-hand-minute" transform={`rotate(${minDeg} 50 50)`} />
      <line x1="50" y1="50" x2="50" y2="12" className="clock-hand clock-hand-second" transform={`rotate(${secDeg} 50 50)`} />
      <circle cx="50" cy="50" r="2.2" className="clock-center" />
    </svg>
  );
}

export function ClockWidget() {
  const [now, setNow] = useState(new Date());
  const [view, setView] = useState<View>("digital");
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function toggleView() {
    setView((v) => (v === "digital" ? "analog" : "digital"));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) toggleView();
    touchStartX.current = null;
  }

  return (
    <div className="clock-widget" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="clock-face-wrap" onClick={toggleView}>
        {view === "digital" ? <DigitalFace now={now} /> : <AnalogFace now={now} />}
      </div>
      <div className="clock-dots">
        <button
          className={`clock-dot ${view === "digital" ? "active" : ""}`}
          onClick={() => setView("digital")}
          aria-label="Digital clock"
        />
        <button
          className={`clock-dot ${view === "analog" ? "active" : ""}`}
          onClick={() => setView("analog")}
          aria-label="Analog clock"
        />
      </div>
    </div>
  );
}
