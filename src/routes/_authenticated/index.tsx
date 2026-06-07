import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, ArrowDownRight, ChevronDown, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CandlestickChart, useLiveCandles } from "@/components/CandlestickChart";
import { DepositSheet } from "@/components/DepositSheet";
import { AppShell, useMe } from "@/components/AppShell";
import { placeTrade } from "@/lib/trading.functions";

export const Route = createFileRoute("/_authenticated/")({
  component: TradeScreen,
});

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"] as const;

function TradeScreen() {
  const candles = useLiveCandles(67420);
  const [tf, setTf] = useState<(typeof TIMEFRAMES)[number]>("1m");
  const [depositOpen, setDepositOpen] = useState(false);
  const [qty, setQty] = useState("0.01");
  const me = useMe();
  const qc = useQueryClient();
  const trade = useServerFn(placeTrade);

  const stats = useMemo(() => {
    const last = candles[candles.length - 1];
    const first = candles[0];
    const change = ((last.c - first.o) / first.o) * 100;
    const high = Math.max(...candles.map((c) => c.h));
    const low = Math.min(...candles.map((c) => c.l));
    return { price: last.c, change, high, low, bull: change >= 0 };
  }, [candles]);

  const isDemo = me.data?.profile?.active_account === "demo";

  async function execute(side: "buy" | "sell") {
    const q = parseFloat(qty);
    if (!q || q <= 0) return toast.error("Enter a valid quantity");
    try {
      await trade({ data: { symbol: "BTC/USDT", side, qty: q, price: stats.price } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(`${side === "buy" ? "Bought" : "Sold"} ${q} BTC at $${stats.price.toFixed(2)}`);
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
      <div className="pb-40">
        <div className="px-5 pt-3 pb-3">
          {isDemo && (
            <div className="mb-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-bear bg-bear/10 border border-bear/30 px-2 py-1 rounded-full">
              Demo mode • virtual funds
            </div>
          )}
          <button className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-full bg-[oklch(0.75_0.16_60)] grid place-items-center text-xs font-bold text-black">₿</div>
            <div className="text-lg font-semibold">BTC<span className="text-muted-foreground">/USDT</span></div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-baseline gap-3 mt-2">
            <div className="text-4xl font-semibold tabular tracking-tight">
              ${stats.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium tabular px-2 py-0.5 rounded-md ${stats.bull ? "text-bull bg-bull/10" : "text-bear bg-bear/10"}`}>
              {stats.bull ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {stats.bull ? "+" : ""}{stats.change.toFixed(2)}%
            </div>
          </div>
          <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground">
            <span>24h High <span className="text-foreground tabular ml-1">${stats.high.toFixed(0)}</span></span>
            <span>24h Low <span className="text-foreground tabular ml-1">${stats.low.toFixed(0)}</span></span>
            <span>Vol <span className="text-foreground tabular ml-1">2.4B</span></span>
          </div>
        </div>

        <div className="px-5 flex gap-1.5 mb-2">
          {TIMEFRAMES.map((t) => (
            <button key={t} onClick={() => setTf(t)} className={`h-7 px-2.5 rounded-md text-[11px] font-medium tabular ${tf === t ? "bg-accent text-foreground" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="h-[340px] px-2 grid-bg">
          <CandlestickChart candles={candles} />
        </div>

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

        <div className="px-5 mt-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Quantity (BTC)</span>
            <input
              inputMode="decimal" value={qty}
              onChange={(e) => setQty(e.target.value.replace(/[^0-9.]/g, ""))}
              className="mt-1 w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-base tabular outline-none focus:border-primary/50"
            />
          </label>
          <div className="text-[11px] text-muted-foreground mt-1.5 tabular">
            Order value ≈ ${(parseFloat(qty || "0") * stats.price).toFixed(2)}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-gradient-to-t from-background via-background to-transparent pt-6 pb-5 px-5">
        <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
          <button onClick={() => execute("buy")} className="h-14 rounded-2xl bg-bull text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-bull active:scale-[0.98] transition-transform">
            <ArrowUpRight className="h-5 w-5" /> Buy
          </button>
          <button onClick={() => execute("sell")} className="h-14 rounded-2xl bg-bear text-white font-semibold flex items-center justify-center gap-2 glow-bear active:scale-[0.98] transition-transform">
            <ArrowDownRight className="h-5 w-5" /> Sell
          </button>
        </div>
      </div>

      <DepositSheet open={depositOpen} onClose={() => setDepositOpen(false)} />
    </AppShell>
  );
}
