import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, TrendingUp, Bot, ShieldCheck, Zap, BarChart3, Wallet, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/landing-hero.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Vertex — Master the Markets. Unlock Your Edge." },
      { name: "description", content: "Pro-grade crypto trading: live charts, advanced orders, AI arbitrage bot, instant deposits. Real and demo accounts." },
      { property: "og:title", content: "Vertex — Master the Markets" },
      { property: "og:description", content: "Pro-grade crypto trading with AI-powered insights." },
    ],
  }),
});

function Landing() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);
  const primaryHref = signedIn ? "/trade" : "/auth";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/40 grid place-items-center">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Vertex<span className="text-primary">Trade</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
            <a href="#platform" className="hover:text-foreground">Platform</a>
            <a href="#markets" className="hover:text-foreground">Markets</a>
            <a href="#tools" className="hover:text-foreground">Tools</a>
            <a href="#about" className="hover:text-foreground">About</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground px-3 py-2">Login</Link>
            <Link to="/auth" className="text-sm font-semibold bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:opacity-90">Sign Up</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="relative min-h-[560px] md:min-h-[640px] flex items-center"
          style={{
            backgroundImage: `linear-gradient(90deg, hsl(var(--background) / 0.95) 0%, hsl(var(--background) / 0.6) 50%, hsl(var(--background) / 0.3) 100%), url(${heroImg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="max-w-6xl mx-auto px-5 py-16 md:py-24 w-full">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs text-primary mb-6">
                <Sparkles className="h-3.5 w-3.5" /> AI-powered crypto trading
              </div>
              <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
                Master The Markets.<br />
                <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">Unlock Your Edge.</span>
              </h1>
              <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-lg">
                Advanced tools. Precision data. Professional performance — on every device.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={primaryHref} className="group inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold rounded-xl px-6 py-3.5 text-sm tracking-wide hover:opacity-90 shadow-lg shadow-primary/30">
                  START TRADING NOW
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition" />
                </Link>
                <a href="#platform" className="inline-flex items-center gap-2 border border-border bg-surface/60 rounded-xl px-6 py-3.5 text-sm font-medium hover:bg-surface">
                  Explore platform
                </a>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
                <Stat value="500+" label="Coins" />
                <Stat value="7" label="Exchanges" />
                <Stat value="24/7" label="Live data" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="platform" className="max-w-6xl mx-auto px-5 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Platform</div>
          <h2 className="text-3xl md:text-4xl font-bold mt-3">Everything you need to trade smarter</h2>
          <p className="text-muted-foreground mt-3">From live candlesticks to autonomous bots — built for serious traders.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <Feature icon={Bot} title="AI Arbitrage Bot" body="Scan 7 exchanges in real time. Execute on demo, recommend on live." />
          <Feature icon={BarChart3} title="Advanced Orders" body="Market, limit, and stop orders with live trigger management." />
          <Feature icon={Wallet} title="Instant Cashier" body="Card, bank, mobile money, or crypto deposits — funds in seconds." />
          <Feature icon={ShieldCheck} title="2FA & KYC" body="Bank-grade security with full identity and address verification." />
          <Feature icon={Zap} title="Live Market Data" body="Real prices from 500+ coins, streamed and updated every second." />
          <Feature icon={TrendingUp} title="Demo & Real Accounts" body="Practice risk-free, then flip a switch to trade with real capital." />
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="border-t border-border/50">
        <div className="max-w-4xl mx-auto px-5 py-20 text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Ready to trade like a pro?</h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">Open a free demo account in 30 seconds. No card required.</p>
          <Link to={primaryHref} className="mt-8 inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold rounded-xl px-7 py-4 hover:opacity-90 shadow-lg shadow-primary/30">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} VertexTrade. Trading involves risk.
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold tabular">{value}</div>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: typeof Bot; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-6 hover:border-primary/40 hover:bg-surface transition group">
      <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 grid place-items-center text-primary group-hover:bg-primary/20 transition">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4 font-semibold">{title}</div>
      <div className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{body}</div>
    </div>
  );
}
