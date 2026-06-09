import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Menu, X, TrendingUp, History, Wallet, BarChart3, BellRing,
  LifeBuoy, GraduationCap, ShieldCheck, LogOut, Bell, ChevronRight,
  Bot, FileCheck,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMe, setActiveAccount } from "@/lib/trading.functions";

const NAV = [
  { to: "/trade", label: "Trade", icon: TrendingUp },
  { to: "/arbitrage", label: "AI Arbitrage Bot", icon: Bot },
  { to: "/history", label: "History", icon: History },
  { to: "/cashier", label: "Cashier", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/alerts", label: "Price Alerts", icon: BellRing },
  { to: "/verification", label: "Verification", icon: FileCheck },
  { to: "/support", label: "Support", icon: LifeBuoy },
  { to: "/education", label: "Education", icon: GraduationCap },
  { to: "/security", label: "Security", icon: ShieldCheck },
] as const;

export function useMe() {
  const fn = useServerFn(getMe);
  return useQuery({ queryKey: ["me"], queryFn: () => fn(), staleTime: 10_000 });
}

export function AppShell({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const me = useMe();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const profile = me.data?.profile;
  const accounts = me.data?.accounts ?? [];
  const active = accounts.find((a) => a.kind === profile?.active_account) ?? accounts[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-4 pt-4 pb-3 flex items-center justify-between gap-2 sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60">
        <button onClick={() => setOpen(true)} className="h-10 w-10 rounded-full bg-surface border border-border grid place-items-center" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center">
          {title ? (
            <div className="text-sm font-semibold">{title}</div>
          ) : (
            <div className="flex flex-col items-center leading-tight">
              <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                {profile?.active_account === "real" ? "Real Account" : "Demo Account"}
              </span>
              <span className="text-sm font-semibold tabular">
                ${Number(active?.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {right}
          <Link to="/alerts" className="h-10 w-10 rounded-full bg-surface border border-border grid place-items-center relative" aria-label="Alerts">
            <Bell className="h-4 w-4" />
            {(me.data?.unread ?? 0) > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-bear" />
            )}
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {open && <Drawer onClose={() => setOpen(false)} pathname={pathname} />}
    </div>
  );
}

function Drawer({ onClose, pathname }: { onClose: () => void; pathname: string }) {
  const navigate = useNavigate();
  const me = useMe();
  const qc = useQueryClient();
  const setActive = useServerFn(setActiveAccount);
  const profile = me.data?.profile;
  const accounts = me.data?.accounts ?? [];
  const real = accounts.find((a) => a.kind === "real");
  const demo = accounts.find((a) => a.kind === "demo");

  async function switchTo(kind: "real" | "demo") {
    try {
      await setActive({ data: { kind } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(`Switched to ${kind === "real" ? "Real" : "Demo"} account`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <aside className="absolute left-0 top-0 bottom-0 w-[85%] max-w-[320px] bg-surface border-r border-border flex flex-col animate-in slide-in-from-left duration-200">
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/40 grid place-items-center text-primary-foreground font-bold">
              {(profile?.display_name?.[0] ?? "V").toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight">{profile?.display_name ?? "Trader"}</div>
              <div className="text-[10px] text-muted-foreground">{profile?.two_factor_enabled ? "2FA enabled" : "2FA off"}</div>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-full bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Active account</div>
          <div className="grid grid-cols-2 gap-2">
            <AcctCard kind="real" active={profile?.active_account === "real"} balance={Number(real?.balance ?? 0)} onClick={() => switchTo("real")} />
            <AcctCard kind="demo" active={profile?.active_account === "demo"} balance={Number(demo?.balance ?? 0)} onClick={() => switchTo("demo")} />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = pathname === n.to;
            return (
              <Link
                key={n.to} to={n.to} onClick={onClose}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm ${active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"}`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{n.label}</span>
                <ChevronRight className="h-4 w-4 opacity-40" />
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button onClick={signOut} className="w-full h-11 rounded-xl bg-background border border-border flex items-center justify-center gap-2 text-sm text-bear hover:border-bear/40">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
    </div>
  );
}

function AcctCard({ kind, active, balance, onClick }: { kind: "real" | "demo"; active: boolean; balance: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3 text-left transition-colors ${active ? "bg-primary/10 border-primary/40" : "bg-background/60 border-border hover:border-primary/30"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{kind === "real" ? "Real" : "Demo"}</span>
        {active && <span className="h-2 w-2 rounded-full bg-primary" />}
      </div>
      <div className="text-sm font-semibold tabular mt-1">
        ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </button>
  );
}
