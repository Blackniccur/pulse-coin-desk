import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { setActiveAccount } from "@/lib/trading.functions";
import { useMe } from "@/components/AppShell";

export function AccountSwitcher({ className = "" }: { className?: string }) {
  const me = useMe();
  const qc = useQueryClient();
  const setActive = useServerFn(setActiveAccount);
  const accounts = me.data?.accounts ?? [];
  const active = me.data?.profile?.active_account ?? "demo";
  const real = accounts.find((a) => a.kind === "real");
  const demo = accounts.find((a) => a.kind === "demo");

  async function switchTo(kind: "real" | "demo") {
    if (kind === active) return;
    try {
      await setActive({ data: { kind } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(`Switched to ${kind === "real" ? "Real" : "Demo"} account`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className={`flex gap-1 bg-surface border border-border rounded-lg p-1 ${className}`}>
      <Tab
        active={active === "demo"}
        onClick={() => switchTo("demo")}
        label="Demo"
        balance={Number(demo?.balance ?? 0)}
      />
      <Tab
        active={active === "real"}
        onClick={() => switchTo("real")}
        label="Real"
        balance={Number(real?.balance ?? 0)}
        isReal
      />
    </div>
  );
}

function Tab({
  active, onClick, label, balance, isReal,
}: { active: boolean; onClick: () => void; label: string; balance: number; isReal?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-10 rounded-md px-2 flex flex-col items-center justify-center transition-colors ${
        active
          ? isReal
            ? "bg-bull text-primary-foreground"
            : "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <span className="text-[9px] uppercase tracking-widest leading-none">{label}</span>
      <span className="text-xs font-semibold tabular leading-tight mt-0.5">
        ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </button>
  );
}
