import { useState } from "react";
import { CreditCard, Smartphone, Bitcoin, Check, X, ArrowRight } from "lucide-react";

type Method = "card" | "momo" | "crypto";

const momoProviders = [
  { id: "mpesa", name: "M-Pesa", color: "oklch(0.70 0.18 145)" },
  { id: "mtn", name: "MTN MoMo", color: "oklch(0.82 0.16 85)" },
  { id: "airtel", name: "Airtel Money", color: "oklch(0.68 0.22 22)" },
  { id: "orange", name: "Orange Money", color: "oklch(0.75 0.18 55)" },
];

const cryptos = [
  { sym: "BTC", name: "Bitcoin", net: "Bitcoin" },
  { sym: "ETH", name: "Ethereum", net: "ERC-20" },
  { sym: "USDT", name: "Tether", net: "TRC-20" },
  { sym: "SOL", name: "Solana", net: "Solana" },
];

export function DepositSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [method, setMethod] = useState<Method>("card");
  const [amount, setAmount] = useState("250");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md bg-surface border-t border-border rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold">Deposit funds</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Instant • Secured by 256-bit encryption</p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-full bg-accent hover:bg-accent/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Amount */}
        <div className="rounded-2xl bg-background/60 border border-border p-4 mb-5">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">You deposit</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-semibold text-muted-foreground">$</span>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="bg-transparent outline-none text-4xl font-semibold tabular flex-1 min-w-0"
            />
          </div>
          <div className="flex gap-2 mt-3">
            {["100", "250", "500", "1000"].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`flex-1 py-1.5 rounded-lg text-xs tabular border transition-colors ${
                  amount === v
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                ${v}
              </button>
            ))}
          </div>
        </div>

        {/* Method tabs */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <MethodTab active={method === "card"} onClick={() => setMethod("card")} icon={<CreditCard className="h-4 w-4" />} label="Card" />
          <MethodTab active={method === "momo"} onClick={() => setMethod("momo")} icon={<Smartphone className="h-4 w-4" />} label="Mobile" />
          <MethodTab active={method === "crypto"} onClick={() => setMethod("crypto")} icon={<Bitcoin className="h-4 w-4" />} label="Crypto" />
        </div>

        {method === "card" && (
          <div className="space-y-3">
            <div className="relative rounded-2xl p-5 h-44 overflow-hidden border border-border" style={{
              background: "linear-gradient(135deg, oklch(0.30 0.08 265), oklch(0.22 0.04 260))",
            }}>
              <div className="flex items-start justify-between">
                <div className="text-xs text-muted-foreground">Visa Debit</div>
                <div className="text-white/90 font-bold italic text-lg tracking-tight">VISA</div>
              </div>
              <div className="absolute bottom-12 left-5 right-5 font-mono text-lg tracking-widest text-white/90">
                •••• •••• •••• 4242
              </div>
              <div className="absolute bottom-4 left-5 right-5 flex justify-between text-[10px] uppercase text-muted-foreground">
                <span>Cardholder</span>
                <span>12 / 28</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="CVV" placeholder="•••" />
              <Field label="ZIP" placeholder="00000" />
            </div>
          </div>
        )}

        {method === "momo" && (
          <div className="grid grid-cols-2 gap-2">
            {momoProviders.map((p) => (
              <button key={p.id} className="rounded-xl border border-border bg-background/50 p-3 text-left hover:border-primary/40 transition-colors">
                <div className="h-8 w-8 rounded-full mb-2" style={{ background: p.color }} />
                <div className="text-sm font-medium">{p.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Instant • 0% fee</div>
              </button>
            ))}
            <div className="col-span-2 mt-1">
              <Field label="Phone number" placeholder="+254 7•• ••• •••" />
            </div>
          </div>
        )}

        {method === "crypto" && (
          <div className="space-y-2">
            {cryptos.map((c) => (
              <button key={c.sym} className="w-full flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3 hover:border-primary/40 transition-colors">
                <div className="h-10 w-10 grid place-items-center rounded-full bg-accent font-mono text-xs">
                  {c.sym}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">{c.net} network</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        <button className="mt-5 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 glow-bull">
          <Check className="h-4 w-4" /> Confirm deposit ${amount || 0}
        </button>
      </div>
    </div>
  );
}

function MethodTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`h-12 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors ${
        active ? "bg-primary/10 border-primary/50 text-primary" : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        placeholder={placeholder}
        className="mt-1 w-full bg-background/60 border border-border rounded-lg h-10 px-3 text-sm outline-none focus:border-primary/50 tabular"
      />
    </label>
  );
}
