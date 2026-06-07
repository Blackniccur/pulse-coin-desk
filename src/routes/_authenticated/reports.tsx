import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { TrendingUp, TrendingDown, BarChart3, ArrowDownToLine, ArrowUpFromLine, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getReport } from "@/lib/trading.functions";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

function ReportsPage() {
  const fn = useServerFn(getReport);
  const { data } = useQuery({ queryKey: ["report"], queryFn: () => fn() });

  const cards = [
    { label: "Total Volume", value: `$${(data?.volume ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, icon: BarChart3, tint: "text-foreground" },
    { label: "Net P&L", value: `${(data?.pnl ?? 0) >= 0 ? "+" : ""}$${(data?.pnl ?? 0).toFixed(2)}`, icon: (data?.pnl ?? 0) >= 0 ? TrendingUp : TrendingDown, tint: (data?.pnl ?? 0) >= 0 ? "text-bull" : "text-bear" },
    { label: "Win Rate", value: `${(data?.winRate ?? 0).toFixed(1)}%`, icon: Trophy, tint: "text-primary" },
    { label: "Trades", value: String(data?.trades ?? 0), icon: BarChart3, tint: "text-foreground" },
    { label: "Deposits", value: `$${(data?.deposits ?? 0).toLocaleString()}`, icon: ArrowDownToLine, tint: "text-bull" },
    { label: "Withdrawals", value: `$${(data?.withdrawals ?? 0).toLocaleString()}`, icon: ArrowUpFromLine, tint: "text-bear" },
  ];

  return (
    <AppShell title="Activity Report">
      <div className="p-4 pb-16">
        <div className="text-xs text-muted-foreground mb-3">Last 30 days</div>
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-2xl bg-surface border border-border p-4">
                <Icon className={`h-4 w-4 ${c.tint}`} />
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2">{c.label}</div>
                <div className={`text-lg font-semibold tabular mt-1 ${c.tint}`}>{c.value}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl bg-surface border border-border p-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Wins / Losses</div>
          <div className="flex items-center gap-2 mt-3 h-3 rounded-full overflow-hidden bg-background/60">
            <div className="h-full bg-bull" style={{ width: `${((data?.wins ?? 0) / Math.max(1, (data?.wins ?? 0) + (data?.losses ?? 0))) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[11px] mt-2 tabular">
            <span className="text-bull">Wins: {data?.wins ?? 0}</span>
            <span className="text-bear">Losses: {data?.losses ?? 0}</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
