import { useQuery } from "@tanstack/react-query";
import { Search, TrendingUp, TrendingDown, X } from "lucide-react";
import { useState } from "react";
import { fetchTopCoins, type CoinMeta } from "@/lib/coingecko";

export function CoinPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (coin: CoinMeta) => void;
}) {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["topCoins"],
    queryFn: () => fetchTopCoins(50),
    staleTime: 60_000,
    enabled: open,
  });

  if (!open) return null;
  const list = (data ?? []).filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.symbol.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="absolute inset-x-0 bottom-0 top-16 bg-surface border-t border-border rounded-t-3xl flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="p-4 flex items-center gap-2 border-b border-border">
          <div className="flex-1 flex items-center gap-2 bg-background/60 border border-border rounded-xl px-3 h-11">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search coins"
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>
          <button onClick={onClose} className="h-11 w-11 grid place-items-center rounded-full bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading && <div className="p-6 text-center text-sm text-muted-foreground">Loading markets…</div>}
          {list.map((c) => {
            const bull = (c.price_change_percentage_24h ?? 0) >= 0;
            return (
              <button
                key={c.id}
                onClick={() => {
                  onSelect(c);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 border-b border-border/40"
              >
                <img src={c.image} alt={c.symbol} className="h-8 w-8 rounded-full" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold uppercase">{c.symbol}<span className="text-muted-foreground font-normal">/USDT</span></div>
                  <div className="text-[11px] text-muted-foreground">{c.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm tabular">${c.current_price?.toLocaleString(undefined, { maximumFractionDigits: c.current_price < 1 ? 6 : 2 })}</div>
                  <div className={`text-[11px] tabular flex items-center justify-end gap-0.5 ${bull ? "text-bull" : "text-bear"}`}>
                    {bull ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {(c.price_change_percentage_24h ?? 0).toFixed(2)}%
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
