import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Check } from "lucide-react";
import { AppShell, useMe } from "@/components/AppShell";
import { createDeposit, createWithdrawal, listTransactions } from "@/lib/trading.functions";

export const Route = createFileRoute("/_authenticated/cashier")({ component: CashierPage });

const METHODS = ["Visa Card", "M-Pesa", "MTN MoMo", "Bitcoin", "USDT (TRC-20)", "Bank Transfer"];

function CashierPage() {
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("250");
  const [method, setMethod] = useState(METHODS[0]);
  const me = useMe();
  const qc = useQueryClient();
  const listFn = useServerFn(listTransactions);
  const dep = useServerFn(createDeposit);
  const wd = useServerFn(createWithdrawal);
  const { data: txs } = useQuery({ queryKey: ["txs"], queryFn: () => listFn() });

  const isDemo = me.data?.profile?.active_account === "demo";

  async function submit() {
    const a = parseFloat(amount);
    if (!a || a <= 0) return toast.error("Enter a valid amount");
    try {
      if (tab === "deposit") await dep({ data: { amount: a, method } });
      else await wd({ data: { amount: a, method } });
      await Promise.all([qc.invalidateQueries({ queryKey: ["txs"] }), qc.invalidateQueries({ queryKey: ["me"] })]);
      toast.success(`${tab === "deposit" ? "Deposit" : "Withdrawal"} of $${a} ${tab === "deposit" ? "completed" : "submitted"}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <AppShell title="Cashier">
      <div className="p-4 pb-16">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button onClick={() => setTab("deposit")} className={`h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium ${tab === "deposit" ? "bg-bull/15 text-bull border border-bull/40" : "bg-surface border border-border text-muted-foreground"}`}>
            <ArrowDownToLine className="h-4 w-4" /> Deposit
          </button>
          <button onClick={() => setTab("withdraw")} className={`h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-medium ${tab === "withdraw" ? "bg-bear/15 text-bear border border-bear/40" : "bg-surface border border-border text-muted-foreground"}`}>
            <ArrowUpFromLine className="h-4 w-4" /> Withdraw
          </button>
        </div>

        {isDemo && tab === "withdraw" && (
          <div className="mb-4 text-xs bg-bear/10 border border-bear/30 text-bear rounded-lg p-3">
            Withdrawals are disabled on demo accounts. Switch to your real account from the menu.
          </div>
        )}

        <div className="rounded-2xl bg-surface border border-border p-4 mb-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Amount</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl text-muted-foreground">$</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="bg-transparent outline-none text-4xl font-semibold tabular flex-1 min-w-0" />
          </div>
          <div className="flex gap-2 mt-3">
            {["100", "250", "500", "1000"].map((v) => (
              <button key={v} onClick={() => setAmount(v)} className={`flex-1 py-1.5 rounded-lg text-xs tabular border ${amount === v ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>${v}</button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-surface border border-border p-4 mb-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Method</div>
          <div className="grid grid-cols-2 gap-2">
            {METHODS.map((m) => (
              <button key={m} onClick={() => setMethod(m)} className={`h-11 rounded-lg text-xs font-medium border ${method === m ? "bg-primary/10 border-primary/40 text-primary" : "bg-background/40 border-border text-muted-foreground"}`}>{m}</button>
            ))}
          </div>
        </div>

        <button onClick={submit} disabled={isDemo && tab === "withdraw"} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          <Check className="h-4 w-4" /> Confirm {tab} ${amount || 0}
        </button>

        <div className="mt-6">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Recent activity</div>
          <div className="space-y-2">
            {txs?.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No transactions yet.</div>}
            {txs?.map((t: any) => (
              <div key={t.id} className="rounded-xl bg-surface border border-border p-3 flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full grid place-items-center ${t.type === "deposit" ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear"}`}>
                  {t.type === "deposit" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium capitalize">{t.type} • {t.method}</div>
                  <div className="text-[11px] text-muted-foreground tabular">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold tabular ${t.type === "deposit" ? "text-bull" : "text-bear"}`}>
                    {t.type === "deposit" ? "+" : "-"}${Number(t.amount).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase">{t.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
