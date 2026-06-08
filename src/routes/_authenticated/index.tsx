import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, ChevronDown, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CandlestickChart, type Candle } from "@/components/CandlestickChart";
import { DepositSheet } from "@/components/DepositSheet";
import { AppShell, useMe } from "@/components/AppShell";
import { CoinPicker } from "@/components/CoinPicker";
import { placeTrade } from "@/lib/trading.functions";
import { fetchOHLC, fetchSimplePrice, type CoinMeta } from "@/lib/coingecko";

export const Route = createFileRoute("/_authenticated/")({
  component: TradeScreen,
});

const TIMEFRAMES = [
  { label: "1H", days: 1 },
  { label: "1D", days: 1 },
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
] as const;

const DEFAULT_COIN: CoinMeta = {
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  current_price: 0,
  price_change_percentage_24h: 0,
  high_24h: 0,
  low_24h: 0,
  total_volume: 0,
};

const ORDER_TYPES = ["market", "limit", "stop"] as const;
type OrderType = (typeof ORDER_TYPES)[number];

function TradeScreen() {
  const [coin, setCoin] = useState<CoinMeta>(() => {
    if (typeof window === "undefined") return DEFAULT_COIN;
    try {
      const raw = localStorage.getItem("activeCoin");
      return raw ? JSON.parse(raw) : DEFAULT_COIN;
    } catch {
      return DEFAULT_COIN;
    }
  });
  const [tf, setTf] = useState<(typeof TIMEFRAMES)[number]>(TIMEFRAMES[1]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [qty, setQty] = useState("0.01");
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [triggerPrice, setTriggerPrice] = useState("");
  const me = useMe();
  const qc = useQueryClient();
  const trade = useServerFn(placeTrade);

  useEffect(() => {
    try { localStorage.setItem("activeCoin", JSON.stringify(coin)); } catch { /* ignore */ }
  }, [coin]);

  const ohlc = useQuery({
    queryKey: ["ohlc", coin.id, tf.days],
    queryFn: () => fetchOHLC(coin.id, tf.days),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const live = useQuery({
    queryKey: ["livePrice", coin.id],
    queryFn: () => fetchSimplePrice([coin.id]),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const baseCandles: Candle[] = useMemo(() => {
    if (!ohlc.data || ohlc.data.length === 0) return [];
    return ohlc.data.slice(-60).map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
  }, [ohlc.data]);

  // Synthetic live tick: ensures the chart visibly moves between CoinGecko
  // refreshes (which cache for ~60s) so the market never appears frozen.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 900);
    return () => clearInterval(id);
  }, []);

  const livePrice = live.data?.[coin.id]?.usd;
  const change24 = live.data?.[coin.id]?.usd_24h_change ?? coin.price_change_percentage_24h ?? 0;
  const lastClose = baseCandles[baseCandles.length - 1]?.c ?? livePrice ?? coin.current_price ?? 0;

  const candles: Candle[] = useMemo(() => {
    if (baseCandles.length === 0) return [];
    const next = baseCandles.slice();
    const last = { ...next[next.length - 1] };
    const anchor = livePrice ?? last.c;
    const jitter = anchor * 0.0006 * (Math.sin(tick * 0.7) + (Math.random() - 0.5));
    last.c = +(anchor + jitter).toFixed(8);
    last.h = Math.max(last.h, last.c);
    last.l = Math.min(last.l, last.c);
    next[next.length - 1] = last;
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCandles, livePrice, tick]);

  const price = candles[candles.length - 1]?.c ?? lastClose;

  const stats = useMemo(() => {
    if (candles.length === 0) return { price, change: change24, high: price, low: price, bull: change24 >= 0 };
    const high = Math.max(...candles.map((c) => c.h));
    const low = Math.min(...candles.map((c) => c.l));
    return { price, change: change24, high, low, bull: change24 >= 0 };
  }, [candles, price, change24]);

  const isDemo = me.data?.profile?.active_account === "demo";
  const symbol = `${coin.symbol.toUpperCase()}/USDT`;
  const dp = price < 1 ? 6 : price < 100 ? 4 : 2;

  async function execute(side: "buy" | "sell") {
    const q = parseFloat(qty);
    if (!q || q <= 0) return toast.error("Enter a valid quantity");
    const tp = orderType !== "market" ? parseFloat(triggerPrice) : undefined;
    if (orderType !== "market" && (!tp || tp <= 0)) return toast.error("Enter a trigger price");
    try {
      const res = await trade({
        data: {
          symbol, side, qty: q,
          price: orderType === "limit" ? (tp as number) : stats.price,
          order_type: orderType,
          trigger_price: tp,
        },
      });
      await qc.invalidateQueries({ queryKey: ["me"] });
      if ("pending" in res && res.pending) {
        toast.success(`${orderType.toUpperCase()} order placed: ${side} ${q} ${coin.symbol.toUpperCase()} @ $${tp?.toFixed(dp)}`);
      } else {
        toast.success(`${side === "buy" ? "Bought" : "Sold"} ${q} ${coin.symbol.toUpperCase()} at $${stats.price.toFixed(dp)}`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Trade failed");
    }
  }

  return (
    <AppShell
      right={
        <button onClick={() => setDepositOpen(true)} className="h-10 px-3 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5" /> Deposit
        </button>
      }
    >
      <div className="pb-56">
        <div className="px-5 pt-3 pb-3">
          {isDemo && (
            <div className="mb-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-bear bg-bear/10 border border-bear/30 px-2 py-1 rounded-full">
              Demo mode • virtual funds
            </div>
          )}
          <button onClick={() => setPickerOpen(true)} className="flex items-center gap-2 group">
            <img src={coin.image} alt={coin.symbol} className="h-8 w-8 rounded-full" />
            <div className="text-lg font-semibold uppercase">{coin.symbol}<span className="text-muted-foreground">/USDT</span></div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-baseline gap-3 mt-2">
            <div className="text-4xl font-semibold tabular tracking-tight">
              ${price.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium tabular px-2 py-0.5 rounded-md ${stats.bull ? "text-bull bg-bull/10" : "text-bear bg-bear/10"}`}>
              {stats.bull ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {stats.bull ? "+" : ""}{stats.change.toFixed(2)}%
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground">
            <span>High <span className="text-foreground tabular ml-1">${stats.high.toFixed(dp === 6 ? 4 : 2)}</span></span>
            <span>Low <span className="text-foreground tabular ml-1">${stats.low.toFixed(dp === 6 ? 4 : 2)}</span></span>
            <span className="text-bull">● Live</span>
          </div>
        </div>

        <div className="px-5 flex gap-1.5 mb-2">
          {TIMEFRAMES.map((t) => (
            <button key={t.label} onClick={() => setTf(t)} className={`h-7 px-2.5 rounded-md text-[11px] font-medium tabular ${tf.label === t.label ? "bg-accent text-foreground" : "text-muted-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="h-[320px] px-2 grid-bg">
          {candles.length > 0 ? (
            <CandlestickChart candles={candles} />
          ) : (
            <div className="h-full grid place-items-center text-xs text-muted-foreground">
              {ohlc.isLoading ? "Loading chart…" : ohlc.isError ? "Chart unavailable (rate limit)" : "No data"}
            </div>
          )}
        </div>

        <div className="px-5 py-3 grid grid-cols-2 gap-3 text-[11px]">
          <div className="rounded-lg bg-bull/5 border border-bull/15 p-2 flex justify-between tabular">
            <span className="text-muted-foreground">Bid</span>
            <span className="text-bull font-medium">${(price * 0.9995).toFixed(dp)}</span>
          </div>
          <div className="rounded-lg bg-bear/5 border border-bear/15 p-2 flex justify-between tabular">
            <span className="text-muted-foreground">Ask</span>
            <span className="text-bear font-medium">${(price * 1.0005).toFixed(dp)}</span>
          </div>
        </div>

        <div className="px-5 mt-2 space-y-3">
          <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
            {ORDER_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={`flex-1 h-8 rounded-md text-[11px] font-medium uppercase tracking-wider ${orderType === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                {t}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Quantity ({coin.symbol.toUpperCase()})</span>
            <input
              inputMode="decimal" value={qty}
              onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-1 w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-base tabular outline-none focus:border-primary/50"
            />
          </label>

          {orderType !== "market" && (
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {orderType === "limit" ? "Limit price" : "Stop trigger"} (USD)
              </span>
              <input
                inputMode="decimal" value={triggerPrice} placeholder={price.toFixed(dp)}
                onChange={(e) => setTriggerPrice(e.target.value.replace(/[^0-9.]/g, ""))}
                className="mt-1 w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-base tabular outline-none focus:border-primary/50"
              />
            </label>
          )}

          <div className="text-[11px] text-muted-foreground tabular">
            Order value ≈ ${(parseFloat(qty || "0") * (orderType === "limit" && triggerPrice ? parseFloat(triggerPrice) : price)).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-5 px-5">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
          <button onClick={() => execute("buy")} className="h-14 rounded-2xl bg-bull text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-bull active:scale-[0.98] transition-transform">
            <ArrowUpRight className="h-5 w-5" /> Buy {coin.symbol.toUpperCase()}
          </button>
          <button onClick={() => execute("sell")} className="h-14 rounded-2xl bg-bear text-white font-semibold flex items-center justify-center gap-2 glow-bear active:scale-[0.98] transition-transform">
            <ArrowDownRight className="h-5 w-5" /> Sell {coin.symbol.toUpperCase()}
          </button>
        </div>
      </div>

      <CoinPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(c) => setCoin(c)} />
      <DepositSheet open={depositOpen} onClose={() => setDepositOpen(false)} />
    </AppShell>
  );
}
