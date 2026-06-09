import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EXCHANGES = ["Binance", "Coinbase", "Kraken", "OKX", "Bybit", "KuCoin", "Bitfinex"];

function pickPair() {
  const a = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
  let b = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
  while (b === a) b = EXCHANGES[Math.floor(Math.random() * EXCHANGES.length)];
  return [a, b] as const;
}

export const scanArbitrage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      coins: z.array(z.object({
        symbol: z.string().min(1).max(20),
        price: z.number().positive(),
      })).min(1).max(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const signals = data.coins.slice(0, 8).map((c) => {
      const [buyEx, sellEx] = pickPair();
      const spreadPct = +(Math.random() * 0.9 + 0.05).toFixed(3); // 0.05 - 0.95%
      const priceBuy = +(c.price * (1 - spreadPct / 200)).toFixed(8);
      const priceSell = +(c.price * (1 + spreadPct / 200)).toFixed(8);
      const qty = +(Math.max(0.001, 100 / c.price)).toFixed(6);
      const estimatedPnl = +((priceSell - priceBuy) * qty).toFixed(4);
      const confidence = +(Math.min(0.99, spreadPct * 1.1 + Math.random() * 0.2)).toFixed(2);
      return {
        user_id: context.userId,
        symbol: c.symbol.toUpperCase(),
        exchange_buy: buyEx,
        exchange_sell: sellEx,
        price_buy: priceBuy,
        price_sell: priceSell,
        spread_pct: spreadPct,
        qty,
        estimated_pnl: estimatedPnl,
        confidence,
        account_kind: "demo",
        action: "recommended",
        status: "open",
      };
    });
    const { data: inserted, error } = await context.supabase
      .from("arbitrage_signals").insert(signals).select();
    if (error) throw new Error(error.message);
    return inserted ?? [];
  });

export const listSignals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("arbitrage_signals").select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(40);
    return data ?? [];
  });

export const executeSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sig } = await supabase.from("arbitrage_signals")
      .select("*").eq("id", data.id).eq("user_id", userId).maybeSingle();
    if (!sig) throw new Error("Signal not found");
    if (sig.status !== "open") throw new Error("Already executed");

    // Execute on the user's currently active account (real or demo)
    const { data: profile } = await supabase.from("profiles")
      .select("active_account").eq("id", userId).maybeSingle();
    const kind = profile?.active_account ?? "demo";
    const { data: acct } = await supabase.from("accounts")
      .select("*").eq("user_id", userId).eq("kind", kind).maybeSingle();
    if (!acct) throw new Error("Account not found");
    const pnl = Number(sig.estimated_pnl);
    const newBal = Number(acct.balance) + pnl;
    await supabase.from("accounts").update({ balance: newBal }).eq("id", acct.id);
    await supabase.from("arbitrage_signals").update({
      action: "executed", status: "closed", account_kind: kind,
    }).eq("id", sig.id);
    await supabase.from("notifications").insert({
      user_id: userId,
      title: `Arb bot ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} on ${sig.symbol} (${kind})`,
      body: `Bought on ${sig.exchange_buy}, sold on ${sig.exchange_sell} (${sig.spread_pct}% spread).`,
      kind: "arbitrage",
    });
    return { ok: true, pnl, balance: newBal, kind };
  });

export const dismissSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("arbitrage_signals")
      .update({ action: "skipped", status: "closed" })
      .eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });
