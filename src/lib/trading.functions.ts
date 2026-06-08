import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Me / accounts ----------
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: accounts }, { count: unread }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("accounts").select("*").eq("user_id", userId).order("kind"),
      supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("read", false),
    ]);
    return { profile, accounts: accounts ?? [], unread: unread ?? 0 };
  });

export const setActiveAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kind: z.enum(["real", "demo"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ active_account: data.kind, updated_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Trades ----------
export const placeTrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      symbol: z.string().min(1).max(20),
      side: z.enum(["buy", "sell"]),
      qty: z.number().positive().max(1_000_000),
      price: z.number().positive(),
      order_type: z.enum(["market", "limit", "stop"]).default("market"),
      trigger_price: z.number().positive().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("active_account").eq("id", userId).maybeSingle();
    const kind = profile?.active_account ?? "demo";
    const { data: acct } = await supabase.from("accounts").select("*").eq("user_id", userId).eq("kind", kind).maybeSingle();
    if (!acct) throw new Error("Account not found");

    const isMarket = data.order_type === "market";
    const cost = data.qty * data.price;
    const balance = Number(acct.balance);

    if (isMarket) {
      if (data.side === "buy" && cost > balance) throw new Error("Insufficient balance");
      const newBalance = data.side === "buy" ? balance - cost : balance + cost;
      await supabase.from("accounts").update({ balance: newBalance }).eq("id", acct.id);
      const { error } = await supabase.from("trades").insert({
        user_id: userId, account_id: acct.id, symbol: data.symbol, side: data.side,
        qty: data.qty, price: data.price, status: "closed", order_type: "market",
      });
      if (error) throw new Error(error.message);
      return { ok: true, balance: newBalance };
    }

    // limit / stop → store as open order, no balance change yet
    if (!data.trigger_price) throw new Error("Trigger price required");
    const { error } = await supabase.from("trades").insert({
      user_id: userId, account_id: acct.id, symbol: data.symbol, side: data.side,
      qty: data.qty, price: data.price, status: "open",
      order_type: data.order_type, trigger_price: data.trigger_price,
    });
    if (error) throw new Error(error.message);
    return { ok: true, balance, pending: true };
  });


export const listTrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("trades")
      .select("*, accounts(kind)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

// ---------- Cashier ----------
const cashierSchema = z.object({
  amount: z.number().positive().max(1_000_000),
  method: z.string().min(1).max(40),
});

export const createDeposit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => cashierSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("active_account").eq("id", userId).maybeSingle();
    const kind = profile?.active_account ?? "demo";
    const { data: acct } = await supabase.from("accounts").select("*").eq("user_id", userId).eq("kind", kind).maybeSingle();
    if (!acct) throw new Error("Account not found");
    const newBalance = Number(acct.balance) + data.amount;
    await supabase.from("accounts").update({ balance: newBalance }).eq("id", acct.id);
    const { error } = await supabase.from("transactions").insert({
      user_id: userId, account_id: acct.id, type: "deposit", method: data.method, amount: data.amount, status: "completed",
    });
    if (error) throw new Error(error.message);
    return { ok: true, balance: newBalance };
  });

export const createWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => cashierSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("active_account").eq("id", userId).maybeSingle();
    const kind = profile?.active_account ?? "demo";
    if (kind === "demo") throw new Error("Withdrawals are disabled on demo accounts");
    const { data: acct } = await supabase.from("accounts").select("*").eq("user_id", userId).eq("kind", kind).maybeSingle();
    if (!acct) throw new Error("Account not found");
    if (data.amount > Number(acct.balance)) throw new Error("Insufficient balance");
    const newBalance = Number(acct.balance) - data.amount;
    await supabase.from("accounts").update({ balance: newBalance }).eq("id", acct.id);
    const { error } = await supabase.from("transactions").insert({
      user_id: userId, account_id: acct.id, type: "withdraw", method: data.method, amount: data.amount, status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true, balance: newBalance };
  });

export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("transactions")
      .select("*, accounts(kind)")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

// ---------- Alerts ----------
export const listAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("price_alerts").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    return data ?? [];
  });

export const createAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      symbol: z.string().min(1).max(20),
      condition: z.enum(["above", "below"]),
      target_price: z.number().positive(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("price_alerts").insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("price_alerts").delete().eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

// ---------- Support ----------
export const listTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("support_tickets").select("*").eq("user_id", context.userId).order("created_at", { ascending: false });
    return data ?? [];
  });

export const createTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      subject: z.string().min(3).max(150),
      category: z.string().min(1).max(40),
      message: z.string().min(5).max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("support_tickets").insert({ ...data, user_id: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Notifications ----------
export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notifications").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(50);
    return data ?? [];
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.from("notifications").update({ read: true }).eq("user_id", context.userId).eq("read", false);
    return { ok: true };
  });

export const createNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ title: z.string().min(1).max(120), body: z.string().max(500).optional(), kind: z.string().max(30).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await context.supabase.from("notifications").insert({ ...data, user_id: context.userId });
    return { ok: true };
  });

// ---------- Reports ----------
export const getReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [{ data: trades }, { data: txs }] = await Promise.all([
      supabase.from("trades").select("*").eq("user_id", userId).gte("created_at", since),
      supabase.from("transactions").select("*").eq("user_id", userId).gte("created_at", since),
    ]);
    const t = trades ?? [];
    const volume = t.reduce((s, x) => s + Number(x.qty) * Number(x.price), 0);
    const pnl = t.reduce((s, x) => s + Number(x.pnl), 0);
    const wins = t.filter((x) => Number(x.pnl) > 0).length;
    const losses = t.filter((x) => Number(x.pnl) < 0).length;
    const winRate = t.length ? (wins / t.length) * 100 : 0;
    const deposits = (txs ?? []).filter((x) => x.type === "deposit").reduce((s, x) => s + Number(x.amount), 0);
    const withdrawals = (txs ?? []).filter((x) => x.type === "withdraw").reduce((s, x) => s + Number(x.amount), 0);
    return { volume, pnl, wins, losses, winRate, deposits, withdrawals, trades: t.length };
  });
