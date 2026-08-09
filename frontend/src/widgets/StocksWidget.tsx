import { Sparkline } from "../components/Sparkline";

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
}

interface Recommendation {
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
  period?: string;
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
}

const UP_COLOR = "#4caf50";
const DOWN_COLOR = "#e06c75";

function formatMarketCap(millions: number | undefined): string | null {
  if (!millions) return null;
  if (millions >= 1e6) return `$${(millions / 1e6).toFixed(2)}T`;
  if (millions >= 1e3) return `$${(millions / 1e3).toFixed(2)}B`;
  return `$${millions.toFixed(0)}M`;
}

export function StocksWidget({ data }: { data: { quotes?: Record<string, Quote>; error?: string } | undefined }) {
  if (!data) return <p className="widget-empty">Loading quotes…</p>;
  if (data.error) return <p className="widget-error">{data.error}</p>;

  return (
    <div className="stocks-list">
      {Object.entries(data.quotes ?? {}).map(([ticker, quote]) => {
        const up = quote.dp >= 0;
        const color = up ? UP_COLOR : DOWN_COLOR;
        const marketCap = formatMarketCap(quote.profile?.marketCapitalization);
        const rec = quote.recommendation;
        const totalVotes = rec ? (rec.strongBuy ?? 0) + (rec.buy ?? 0) + (rec.hold ?? 0) + (rec.sell ?? 0) + (rec.strongSell ?? 0) : 0;

        return (
          <div key={ticker} className="stock-item">
            <div className="stock-header">
              {quote.profile?.logo && <img className="stock-logo" src={quote.profile.logo} alt="" />}
              <div className="stock-name-block">
                <span className="stock-ticker">{ticker}</span>
                {quote.profile?.name && <span className="stock-name">{quote.profile.name}</span>}
              </div>
              <div className="stock-price-block">
                <span className="stock-price">{quote.c?.toFixed(2)}</span>
                <span className={`stock-change ${up ? "up" : "down"}`}>
                  {up ? "+" : ""}
                  {quote.dp?.toFixed(2)}%
                </span>
              </div>
            </div>

            <Sparkline history={quote.history ?? []} color={color} />

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
              {quote.stats?.peTTM != null && <span>P/E: {quote.stats.peTTM.toFixed(1)}</span>}
              {quote.stats?.beta != null && <span>Beta: {quote.stats.beta.toFixed(2)}</span>}
              {marketCap && <span>Mkt cap: {marketCap}</span>}
            </div>

            {rec && totalVotes > 0 && (
              <div className="stock-recommendation">
                Analysts ({rec.period}): {rec.strongBuy} strong buy, {rec.buy} buy, {rec.hold} hold, {rec.sell} sell
                {rec.strongSell ? `, ${rec.strongSell} strong sell` : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
