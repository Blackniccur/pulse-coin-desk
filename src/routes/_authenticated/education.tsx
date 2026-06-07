import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, ChevronRight, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/education")({ component: EducationPage });

const LESSONS = [
  {
    id: "candles", title: "Reading Candlestick Charts", level: "Beginner",
    body: `Candlesticks show four prices in a chosen time window: open, high, low, and close.
A green (bull) candle closes higher than it opened; a red (bear) candle closes lower.
The thin "wicks" show the full range traded; the thick body shows where the period opened and closed.
Long wicks signal volatility; small bodies signal indecision.`,
  },
  {
    id: "risk", title: "Risk Management 101", level: "Essential",
    body: `Never risk more than 1-2% of your account on a single trade.
Always set a stop-loss before you enter. Position size = (risk in $) / (entry - stop).
Losing streaks happen — capital preservation is the only edge that compounds.`,
  },
  {
    id: "orders", title: "Market, Limit & Stop Orders", level: "Beginner",
    body: `Market orders fill immediately at the best available price (you accept slippage).
Limit orders only fill at your specified price or better (you may not fill at all).
Stop orders trigger a market order once a price is touched — used for stop-losses and breakouts.`,
  },
  {
    id: "volume", title: "What Volume Tells You", level: "Intermediate",
    body: `Volume measures conviction. A breakout on rising volume is more credible than one on thin volume.
Divergence (price up, volume down) often warns of weakening trends.
Compare current volume to its 20-period average for context.`,
  },
  {
    id: "wallets", title: "Crypto Wallets 101", level: "Beginner",
    body: `Custodial wallets (exchanges) hold your keys for you — convenient, but you trust the platform.
Self-custody wallets (Ledger, MetaMask) give you full control via a seed phrase — never share it.
For long-term holdings, prefer hardware wallets. For active trading, use exchange wallets you trust.`,
  },
  {
    id: "scams", title: "Avoiding Common Scams", level: "Essential",
    body: `Nobody legitimate will DM you offering guaranteed returns. Block them.
Verify URLs and contract addresses — phishing sites copy real ones pixel-perfect.
"Pig butchering" scams build trust over weeks before asking you to deposit. Walk away.
Enable 2FA, use a unique password, and never reuse your seed phrase anywhere.`,
  },
];

function EducationPage() {
  const [open, setOpen] = useState<string | null>(null);
  const lesson = LESSONS.find((l) => l.id === open);

  if (lesson) {
    return (
      <AppShell title={lesson.title}>
        <div className="p-4 pb-16">
          <button onClick={() => setOpen(null)} className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <ArrowLeft className="h-4 w-4" /> All lessons
          </button>
          <div className="text-[10px] uppercase tracking-widest text-primary mb-2">{lesson.level}</div>
          <h1 className="text-2xl font-semibold mb-4">{lesson.title}</h1>
          <div className="rounded-2xl bg-surface border border-border p-5 text-sm leading-relaxed whitespace-pre-line text-foreground/90">
            {lesson.body}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Education">
      <div className="p-4 pb-16 space-y-2">
        <p className="text-xs text-muted-foreground mb-2">Short lessons to sharpen your edge.</p>
        {LESSONS.map((l) => (
          <button key={l.id} onClick={() => setOpen(l.id)} className="w-full rounded-xl bg-surface border border-border p-4 flex items-center gap-3 hover:border-primary/40 text-left">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{l.title}</div>
              <div className="text-[11px] text-muted-foreground">{l.level}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </AppShell>
  );
}
