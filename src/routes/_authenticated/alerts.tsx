import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BellRing, Trash2, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { listAlerts, createAlert, deleteAlert } from "@/lib/trading.functions";

export const Route = createFileRoute("/_authenticated/alerts")({ component: AlertsPage });

function AlertsPage() {
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [target, setTarget] = useState("70000");

  const list = useServerFn(listAlerts);
  const create = useServerFn(createAlert);
  const del = useServerFn(deleteAlert);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["alerts"], queryFn: () => list() });

  async function add() {
    const t = parseFloat(target);
    if (!t || t <= 0) return toast.error("Enter a valid target");
    try {
      await create({ data: { symbol, condition, target_price: t } });
      await qc.invalidateQueries({ queryKey: ["alerts"] });
      toast.success("Alert created");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function remove(id: string) {
    await del({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["alerts"] });
  }

  return (
    <AppShell title="Price Alerts">
      <div className="p-4 pb-16">
        <div className="rounded-2xl bg-surface border border-border p-4 mb-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">New alert</div>
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full bg-background/60 border border-border rounded-lg h-10 px-3 text-sm outline-none mb-2" placeholder="Symbol" />
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button onClick={() => setCondition("above")} className={`h-10 rounded-lg text-sm font-medium border ${condition === "above" ? "bg-bull/15 border-bull/40 text-bull" : "border-border text-muted-foreground"}`}>Above</button>
            <button onClick={() => setCondition("below")} className={`h-10 rounded-lg text-sm font-medium border ${condition === "below" ? "bg-bear/15 border-bear/40 text-bear" : "border-border text-muted-foreground"}`}>Below</button>
          </div>
          <input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^0-9.]/g, ""))} className="w-full bg-background/60 border border-border rounded-lg h-10 px-3 text-sm tabular outline-none mb-3" placeholder="Target price" />
          <button onClick={add} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" /> Create alert
          </button>
        </div>

        <div className="space-y-2">
          {data?.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No alerts yet.</div>}
          {data?.map((a: any) => (
            <div key={a.id} className="rounded-xl bg-surface border border-border p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center">
                <BellRing className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{a.symbol}</div>
                <div className="text-[11px] text-muted-foreground tabular">
                  When price goes {a.condition} ${Number(a.target_price).toFixed(2)}
                </div>
              </div>
              <button onClick={() => remove(a.id)} className="h-8 w-8 grid place-items-center rounded-full hover:bg-bear/10 text-bear">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
