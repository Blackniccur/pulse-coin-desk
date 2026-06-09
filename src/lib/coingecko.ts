// CoinGecko public API helpers (no key required, rate-limited ~10-30/min)
const BASE = "https://api.coingecko.com/api/v3";

export type CoinMeta = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
};

async function withRetry<T>(fn: () => Promise<Response>, parse: (r: Response) => Promise<T>, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fn();
      if (r.status === 429 || r.status >= 500) {
        // backoff and retry
        await new Promise((res) => setTimeout(res, 600 * (i + 1)));
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await parse(r);
    } catch (e) {
      lastErr = e;
      await new Promise((res) => setTimeout(res, 400 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Request failed");
}

export async function fetchTopCoins(per_page = 50): Promise<CoinMeta[]> {
  return withRetry(
    () => fetch(`${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${per_page}&page=1&sparkline=false&price_change_percentage=24h`),
    (r) => r.json(),
  );
}

export async function fetchOHLC(coinId: string, days = 1): Promise<[number, number, number, number, number][]> {
  return withRetry(
    () => fetch(`${BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`),
    (r) => r.json(),
  );
}

export async function fetchSimplePrice(ids: string[]): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  if (!ids.length) return {};
  return withRetry(
    () => fetch(`${BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`),
    (r) => r.json(),
  );
}
