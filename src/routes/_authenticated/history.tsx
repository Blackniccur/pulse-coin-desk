import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { listTrades } from "@/lib/trading.functions";

export const Route = createFileRoute("/_authenticated/history")({ component: HistoryPage });

function HistoryPage() {
  const fn = useServerFn(listTrades);
  const { data, isLoading } = useQuery({ queryKey: ["trades"], queryFn: () => fn() });

  return (
    <AppShell title="Trading History">
      <div className="p-4 space-y-2 pb-16">
        {isLoading && <div className="text-center text-sm text-muted-foreground py-8">Loading…</div>}
        {data && data.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-12">No trades yet. Place your first trade!</div>
        )}
        {data?.map((t: any) => (
          <div key={t.id} className="rounded-xl bg-surface border border-border p-3 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-full grid place-items-center ${t.side === "buy" ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"}`}>
              {t.side === "buy" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium flex items-center gap-2">
                {t.symbol}
                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-accent text-muted-foreground">
                  {t.accounts?.kind ?? ""}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground tabular">
                {new Date(t.created_at).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular">{Number(t.qty).toFixed(4)}</div>
              <div className="text-[11px] text-muted-foreground tabular">@ ${Number(t.price).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
