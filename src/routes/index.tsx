import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, ArrowDownRight, ChevronDown, Bell, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { CandlestickChart, useLiveCandles } from "@/components/CandlestickChart";
import { DepositSheet } from "@/components/DepositSheet";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vertex — Mobile Crypto Trading" },
      { name: "description", content: "Trade crypto in real time. Buy and sell with live candlesticks, deposit via card, mobile money, or crypto." },
      { property: "og:title", content: "Vertex — Mobile Crypto Trading" },
      { property: "og:description", content: "Trade crypto in real time. Buy and sell with live candlesticks, deposit via card, mobile money, or crypto." },
    ],
  }),
  component: TradeScreen,
});

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"] as const;

function TradeScreen() {
  const candles = useLiveCandles(67420);
  const [tf, setTf] = useState<(typeof TIMEFRAMES)[number]>("1m");
  const [depositOpen, setDepositOpen] = useState(false);

  const stats = useMemo(() => {
    const last = candles[candles.length - 1];
    const first = candles[0];
    const change = ((last.c - first.o) / first.o) * 100;
    const high = Math.max(...candles.map((c) => c.h));
    const low = Math.min(...candles.map((c) => c.l));
    return { price: last.c, change, high, low, bull: change >= 0 };
  }, [candles]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-28">
      {/* Header */}
      <header className="px-5 pt-5 pb-3 flex items-center justify-between">
        <button className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/40 grid place-items-center text-primary-foreground font-bold">V</div>
          <div className="text-left">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground leading-tight">Portfolio</div>
            <div className="text-sm font-semibold tabular leading-tight">$12,847.20</div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button className="h-9 w-9 rounded-full bg-surface border border-border grid place-items-center">
            <Bell className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setDepositOpen(true)}
            className="h-9 px-3 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold flex items-center gap-1.5"
          >
            <Wallet className="h-3.5 w-3.5" /> Deposit
          </button>
        </div>
      </header>

      {/* Symbol */}
      <div className="px-5 pt-2 pb-3">
        <button className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-full bg-[oklch(0.75_0.16_60)] grid place-items-center text-xs font-bold text-black">₿</div>
          <div className="text-lg font-semibold">BTC<span className="text-muted-foreground">/USDT</span></div>
          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
        </button>
        <div className="flex items-baseline gap-3 mt-2">
          <div className="text-4xl font-semibold tabular tracking-tight">
            ${stats.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div
            className={`flex items-center gap-1 text-sm font-medium tabular px-2 py-0.5 rounded-md ${
              stats.bull ? "text-bull bg-bull/10" : "text-bear bg-bear/10"
            }`}
          >
            {stats.bull ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {stats.bull ? "+" : ""}
            {stats.change.toFixed(2)}%
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground">
          <span>24h High <span className="text-foreground tabular ml-1">${stats.high.toFixed(0)}</span></span>
          <span>24h Low <span className="text-foreground tabular ml-1">${stats.low.toFixed(0)}</span></span>
          <span>Vol <span className="text-foreground tabular ml-1">2.4B</span></span>
        </div>
      </div>

      {/* Timeframes */}
      <div className="px-5 flex gap-1.5 mb-2">
        {TIMEFRAMES.map((t) => (
          <button
            key={t}
            onClick={() => setTf(t)}
            className={`h-7 px-2.5 rounded-md text-[11px] font-medium tabular transition-colors ${
              tf === t ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[320px] px-2 grid-bg">
        <CandlestickChart candles={candles} />
      </div>

      {/* Order book strip */}
      <div className="px-5 py-3 grid grid-cols-2 gap-3 text-[11px]">
        <div className="rounded-lg bg-bull/5 border border-bull/15 p-2 flex justify-between tabular">
          <span className="text-muted-foreground">Bid</span>
          <span className="text-bull font-medium">${(stats.price - 1.4).toFixed(2)}</span>
        </div>
        <div className="rounded-lg bg-bear/5 border border-bear/15 p-2 flex justify-between tabular">
          <span className="text-muted-foreground">Ask</span>
          <span className="text-bear font-medium">${(stats.price + 1.4).toFixed(2)}</span>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-5 px-5">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
          <button className="h-14 rounded-2xl bg-bull text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-bull active:scale-[0.98] transition-transform">
            <ArrowUpRight className="h-5 w-5" /> Buy
          </button>
          <button className="h-14 rounded-2xl bg-bear text-white font-semibold flex items-center justify-center gap-2 glow-bear active:scale-[0.98] transition-transform">
            <ArrowDownRight className="h-5 w-5" /> Sell
          </button>
        </div>
      </div>

      <button
        onClick={() => setDepositOpen(true)}
        className="fixed bottom-24 right-5 h-11 w-11 rounded-full bg-surface-elevated border border-border grid place-items-center shadow-lg"
        aria-label="Deposit"
      >
        <ArrowDownToLine className="h-4 w-4" />
      </button>

      <DepositSheet open={depositOpen} onClose={() => setDepositOpen(false)} />
    </div>
  );
}
