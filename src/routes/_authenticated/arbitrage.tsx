import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bot, Zap, TrendingUp, ArrowRight, Play, Pause, CheckCircle2, X, Sparkles, Activity } from "lucide-react";
import { AppShell, useMe } from "@/components/AppShell";
import { fetchTopCoins } from "@/lib/coingecko";
import { scanArbitrage, listSignals, executeSignal, dismissSignal } from "@/lib/arbitrage.functions";

export const Route = createFileRoute("/_authenticated/arbitrage")({
  component: ArbitragePage,
});

function ArbitragePage() {
  const qc = useQueryClient();
  const me = useMe();
  const [auto, setAuto] = useState(false);
  const [scanning, setScanning] = useState(false);

  const scan = useServerFn(scanArbitrage);
  const list = useServerFn(listSignals);
  const execute = useServerFn(executeSignal);
  const dismiss = useServerFn(dismissSignal);

  const coins = useQuery({ queryKey: ["topCoins10"], queryFn: () => fetchTopCoins(10), staleTime: 60_000 });
  const signals = useQuery({ queryKey: ["arbSignals"], queryFn: () => list(), refetchInterval: 5_000 });

  async function runScan() {
    if (!coins.data) return;
    setScanning(true);
    try {
      await scan({ data: { coins: coins.data.map((c) => ({ symbol: c.symbol, price: c.current_price })) } });
      await qc.invalidateQueries({ queryKey: ["arbSignals"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => { runScan(); }, 15_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, coins.data]);

  const open = useMemo(() => (signals.data ?? []).filter((s) => s.status === "open"), [signals.data]);
  const recent = useMemo(() => (signals.data ?? []).filter((s) => s.status !== "open").slice(0, 10), [signals.data]);

  const isReal = me.data?.profile?.active_account === "real";

  async function onExecute(id: string) {
    try {
      const res = await execute({ data: { id } });
      toast.success(`${res.kind === "real" ? "Real" : "Demo"} trade closed: ${res.pnl >= 0 ? "+" : ""}$${res.pnl.toFixed(2)}`);
      await qc.invalidateQueries({ queryKey: ["arbSignals"] });
      await qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Execution failed");
    }
  }
  async function onDismiss(id: string) {
    await dismiss({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["arbSignals"] });
  }

  return (
    <AppShell title="AI Arbitrage Bot">
      <div className="px-5 py-4 pb-24 space-y-4 max-w-md mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/30 p-5">
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/20 grid place-items-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  AI Arbitrage Engine
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Scanning 7 exchanges across {coins.data?.length ?? "–"} pairs
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <Stat label="Open" value={open.length} accent="bg-primary/10 text-primary" />
              <Stat label="Executed" value={(signals.data ?? []).filter((s) => s.action === "executed").length} accent="bg-bull/10 text-bull" />
              <Stat label="Avg spread" value={`${avg(open.map((s) => Number(s.spread_pct))).toFixed(2)}%`} accent="bg-surface text-foreground" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={runScan} disabled={scanning || !coins.data}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                <Zap className="h-4 w-4" /> {scanning ? "Scanning…" : "Scan now"}
              </button>
              <button onClick={() => setAuto((a) => !a)}
                className={`h-11 px-4 rounded-xl border flex items-center gap-2 text-sm font-medium ${auto ? "bg-bull/15 border-bull/40 text-bull" : "bg-surface border-border"}`}>
                {auto ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                Auto
              </button>
            </div>
          </div>
        </div>

        {isReal && (
          <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-3 text-xs text-yellow-200">
            ⚠ You're on the <strong>Real account</strong>. Executing a signal will settle PnL against your real balance.
          </div>
        )}

        <div className="space-y-2">
          <SectionHeader title="Live opportunities" icon={Activity} />
          {open.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              {signals.isLoading ? "Loading…" : "No active opportunities. Tap Scan to find new ones."}
            </div>
          )}
          {open.map((s) => (
            <SignalCard key={s.id} s={s} onExecute={() => onExecute(s.id)} onDismiss={() => onDismiss(s.id)} isReal={isReal} />
          ))}
        </div>

        {recent.length > 0 && (
          <div className="space-y-2">
            <SectionHeader title="Recent activity" icon={TrendingUp} />
            {recent.map((s) => (
              <div key={s.id} className="rounded-xl bg-surface border border-border p-3 flex items-center gap-3 text-xs">
                <div className={`h-7 w-7 rounded-lg grid place-items-center ${s.action === "executed" ? "bg-bull/15 text-bull" : "bg-muted text-muted-foreground"}`}>
                  {s.action === "executed" ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{s.symbol} <span className="text-muted-foreground">· {s.exchange_buy} → {s.exchange_sell}</span></div>
                  <div className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleTimeString()}</div>
                </div>
                <div className={`tabular font-semibold ${Number(s.estimated_pnl) >= 0 ? "text-bull" : "text-bear"}`}>
                  {s.action === "executed" ? (Number(s.estimated_pnl) >= 0 ? "+" : "") + "$" + Number(s.estimated_pnl).toFixed(2) : "skipped"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className={`rounded-lg ${accent} px-2 py-2`}>
      <div className="text-base font-semibold tabular">{value}</div>
      <div className="text-[9px] uppercase tracking-widest opacity-70">{label}</div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: typeof Activity }) {
  return (
    <div className="flex items-center gap-2 px-1 pt-1">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</div>
    </div>
  );
}

type Signal = {
  id: string; symbol: string; exchange_buy: string; exchange_sell: string;
  price_buy: number | string; price_sell: number | string; spread_pct: number | string;
  estimated_pnl: number | string; confidence: number | string; qty: number | string;
};
function SignalCard({ s, onExecute, onDismiss, isReal }: { s: Signal; onExecute: () => void; onDismiss: () => void; isReal: boolean }) {
  const spread = Number(s.spread_pct);
  const pnl = Number(s.estimated_pnl);
  const conf = Math.round(Number(s.confidence) * 100);
  return (
    <div className="rounded-2xl bg-surface border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-base font-semibold">{s.symbol}</div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${spread > 0.5 ? "bg-bull/15 text-bull" : "bg-primary/15 text-primary"}`}>
            +{spread.toFixed(2)}% spread
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">{conf}% conf.</div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <div className="flex-1 rounded-lg bg-bull/10 border border-bull/20 p-2">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Buy</div>
          <div className="text-sm font-semibold">{s.exchange_buy}</div>
          <div className="tabular text-bull text-xs">${Number(s.price_buy).toFixed(4)}</div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 rounded-lg bg-bear/10 border border-bear/20 p-2">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Sell</div>
          <div className="text-sm font-semibold">{s.exchange_sell}</div>
          <div className="tabular text-bear text-xs">${Number(s.price_sell).toFixed(4)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">Est. PnL on {Number(s.qty).toFixed(4)} {s.symbol}</span>
        <span className={`tabular font-semibold ${pnl >= 0 ? "text-bull" : "text-bear"}`}>{pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}</span>
      </div>

      <div className="flex gap-2">
        <button onClick={onExecute}
          className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">
          {isReal ? "Execute on real" : "Execute on demo"}
        </button>
        <button onClick={onDismiss} className="h-10 px-4 rounded-lg bg-accent text-xs text-muted-foreground">Skip</button>
      </div>
    </div>
  );
}

function avg(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
