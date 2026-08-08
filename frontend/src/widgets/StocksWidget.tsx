interface Quote {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
}

export function StocksWidget({ data }: { data: { quotes?: Record<string, Quote>; error?: string } | undefined }) {
  if (!data) return <p className="widget-empty">Loading quotes…</p>;
  if (data.error) return <p className="widget-error">{data.error}</p>;

  return (
    <table className="stocks-table">
      <tbody>
        {Object.entries(data.quotes ?? {}).map(([ticker, quote]) => (
          <tr key={ticker} className={quote.dp >= 0 ? "up" : "down"}>
            <td>{ticker}</td>
            <td>{quote.c?.toFixed(2)}</td>
            <td>
              {quote.dp >= 0 ? "+" : ""}
              {quote.dp?.toFixed(2)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
