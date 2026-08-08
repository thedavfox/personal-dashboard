import { Sparkline } from "../components/Sparkline";

interface Quote {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  history?: { t: number; c: number }[];
}

const UP_COLOR = "#4caf50";
const DOWN_COLOR = "#e06c75";

export function StocksWidget({ data }: { data: { quotes?: Record<string, Quote>; error?: string } | undefined }) {
  if (!data) return <p className="widget-empty">Loading quotes…</p>;
  if (data.error) return <p className="widget-error">{data.error}</p>;

  return (
    <div className="stocks-list">
      {Object.entries(data.quotes ?? {}).map(([ticker, quote]) => {
        const up = quote.dp >= 0;
        const color = up ? UP_COLOR : DOWN_COLOR;
        return (
          <div key={ticker} className="stock-item">
            <div className={`stock-row ${up ? "up" : "down"}`}>
              <span className="stock-ticker">{ticker}</span>
              <span className="stock-price">{quote.c?.toFixed(2)}</span>
              <span className="stock-change">
                {up ? "+" : ""}
                {quote.dp?.toFixed(2)}%
              </span>
            </div>
            <Sparkline history={quote.history ?? []} color={color} />
          </div>
        );
      })}
    </div>
  );
}
