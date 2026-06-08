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

export async function fetchTopCoins(per_page = 50): Promise<CoinMeta[]> {
  const r = await fetch(
    `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${per_page}&page=1&sparkline=false&price_change_percentage=24h`,
  );
  if (!r.ok) throw new Error("Failed to load coins");
  return r.json();
}

export async function fetchOHLC(coinId: string, days = 1): Promise<[number, number, number, number, number][]> {
  // returns [timestamp, o, h, l, c]
  const r = await fetch(`${BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`);
  if (!r.ok) throw new Error("Failed to load chart");
  return r.json();
}

export async function fetchSimplePrice(ids: string[]): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
  if (!ids.length) return {};
  const r = await fetch(
    `${BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`,
  );
  if (!r.ok) throw new Error("Failed to load prices");
  return r.json();
}
