import { useState } from "react";
import { Sparkline } from "../components/Sparkline";
import { EpsBarChart } from "../components/EpsBarChart";
import { EarningsBeatChart } from "../components/EarningsBeatChart";

interface Profile {
  name?: string;
  logo?: string;
  marketCapitalization?: number; // in millions
}

interface Stats {
  week52High?: number;
  week52Low?: number;
  peTTM?: number;
  beta?: number;
  epsHistory?: { period: string; eps: number }[];
}

interface Recommendation {
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
  period?: string;
}

interface Earnings {
  quarters?: { period: string; actual: number | null; estimate: number | null }[];
}

interface Quote {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h?: number; // day high
  l?: number; // day low
  o?: number; // day open
  pc?: number; // previous close
  history?: { t: number; c: number }[];
  profile?: Profile;
  stats?: Stats;
  recommendation?: Recommendation;
  earnings?: Earnings;
}

interface Props {
  data: { quotes?: Record<string, Quote>; error?: string } | undefined;
  config: { tickers?: string[] } | undefined;
  onSaveConfig: (config: { tickers: string[] }) => void;
}

const UP_COLOR = "#4caf50";
const DOWN_COLOR = "#e06c75";

function formatMarketCap(millions: number | undefined): string | null {
  if (!millions) return null;
  if (millions >= 1e6) return `$${(millions / 1e6).toFixed(2)}T`;
  if (millions >= 1e3) return `$${(millions / 1e3).toFixed(2)}B`;
  return `$${millions.toFixed(0)}M`;
}

export function StocksWidget({ data, config, onSaveConfig }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tickerInput, setTickerInput] = useState("");

  // Source the ticker list from config (authoritative, updates instantly on
  // edit) rather than data.quotes, which briefly lags behind right after an
  // add/remove until the next scheduled fetch completes.
  const tickers = config?.tickers ?? Object.keys(data?.quotes ?? {});

  function toggle(ticker: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }

  function handleAddTicker(e: React.FormEvent) {
    e.preventDefault();
    const symbol = tickerInput.trim().toUpperCase();
    setTickerInput("");
    if (!symbol || tickers.includes(symbol)) return;
    onSaveConfig({ tickers: [...tickers, symbol] });
  }

  function handleRemoveTicker(symbol: string) {
    onSaveConfig({ tickers: tickers.filter((t) => t !== symbol) });
  }

  return (
    <div className="stocks-widget">
      <form className="stock-add-form" onSubmit={handleAddTicker}>
        <input
          value={tickerInput}
          onChange={(e) => setTickerInput(e.target.value)}
          placeholder="Add ticker, e.g. MSFT"
        />
        <button type="submit">Add</button>
      </form>

      {!data && <p className="widget-empty">Loading quotes…</p>}
      {data?.error && <p className="widget-error">{data.error}</p>}
      {tickers.length === 0 && !data?.error && <p className="widget-empty">No tickers yet — add one above.</p>}

      <div className="stocks-list">
        {tickers.map((ticker) => {
          const quote = data?.quotes?.[ticker];

          if (!quote) {
            return (
              <div key={ticker} className="stock-item">
                <div className="stock-header">
                  <span className="stock-ticker">{ticker}</span>
                  <span className="widget-empty">loading…</span>
                  <button className="stock-remove-ticker" onClick={() => handleRemoveTicker(ticker)}>
                    ×
                  </button>
                </div>
              </div>
            );
          }

          const up = quote.dp >= 0;
          const color = up ? UP_COLOR : DOWN_COLOR;
          const marketCap = formatMarketCap(quote.profile?.marketCapitalization);
          const rec = quote.recommendation;
          const totalVotes = rec
            ? (rec.strongBuy ?? 0) + (rec.buy ?? 0) + (rec.hold ?? 0) + (rec.sell ?? 0) + (rec.strongSell ?? 0)
            : 0;
          const isExpanded = expanded.has(ticker);

          return (
            <div key={ticker} className="stock-item">
              <div className="stock-header">
                {quote.profile?.logo && <img className="stock-logo" src={quote.profile.logo} alt="" />}
                <span className="stock-ticker">{ticker}</span>
                <div className="stock-price-block">
                  <span className="stock-price">{quote.c?.toFixed(2)}</span>
                  <span className={`stock-change ${up ? "up" : "down"}`}>
                    {up ? "+" : ""}
                    {quote.dp?.toFixed(2)}%
                  </span>
                </div>
                <button className="stock-remove-ticker" onClick={() => handleRemoveTicker(ticker)} aria-label={`Remove ${ticker}`}>
                  ×
                </button>
              </div>

              <Sparkline history={quote.history ?? []} color={color} />

              <div className="stock-meta">
                {marketCap && <span>{marketCap}</span>}
                {quote.stats?.peTTM != null && <span>P/E {quote.stats.peTTM.toFixed(1)}</span>}
                <button className="stock-details-toggle" onClick={() => toggle(ticker)}>
                  {isExpanded ? "Less ▲" : "Details ▾"}
                </button>
              </div>

              {isExpanded && (
                <div className="stock-details">
                  <div className="stock-meta">
                    {quote.l != null && quote.h != null && (
                      <span>
                        Day: {quote.l.toFixed(2)}–{quote.h.toFixed(2)}
                      </span>
                    )}
                    {quote.pc != null && <span>Prev close: {quote.pc.toFixed(2)}</span>}
                    {quote.stats?.week52Low != null && quote.stats?.week52High != null && (
                      <span>
                        52w: {quote.stats.week52Low.toFixed(2)}–{quote.stats.week52High.toFixed(2)}
                      </span>
                    )}
                    {quote.stats?.beta != null && <span>Beta: {quote.stats.beta.toFixed(2)}</span>}
                  </div>

                  {rec && totalVotes > 0 && (
                    <div className="stock-recommendation">
                      Analysts ({rec.period}): {rec.strongBuy} strong buy, {rec.buy} buy, {rec.hold} hold,{" "}
                      {rec.sell} sell{rec.strongSell ? `, ${rec.strongSell} strong sell` : ""}
                    </div>
                  )}

                  {quote.stats?.epsHistory && quote.stats.epsHistory.length > 1 && (
                    <div className="stock-chart-block">
                      <span className="stock-chart-title">Quarterly EPS</span>
                      <EpsBarChart history={quote.stats.epsHistory} />
                    </div>
                  )}

                  {quote.earnings?.quarters && quote.earnings.quarters.length > 0 && (
                    <div className="stock-chart-block">
                      <span className="stock-chart-title">Earnings: actual vs. estimate</span>
                      <EarningsBeatChart quarters={quote.earnings.quarters} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
