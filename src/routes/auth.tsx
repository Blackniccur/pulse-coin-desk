import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Vertex" },
      { name: "description", content: "Sign in or create your Vertex trading account." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse({ email, password });
    if (!p.success) return toast.error(p.error.issues[0].message);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: p.data.email,
          password: p.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created — signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword(p.data);
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) toast.error("Google sign-in failed");
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/40 grid place-items-center text-primary-foreground font-bold">V</div>
          <div className="text-xl font-semibold">Vertex</div>
        </div>
        <div className="rounded-3xl bg-surface border border-border p-6">
          <h1 className="text-xl font-semibold">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === "signin" ? "Sign in to access your portfolio" : "Get a free $10,000 demo account"}
          </p>
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Email</span>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-sm outline-none focus:border-primary/50"
                autoComplete="email" required
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Password</span>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-sm outline-none focus:border-primary/50"
                autoComplete={mode === "signin" ? "current-password" : "new-password"} required minLength={8}
              />
            </label>
            <button
              disabled={loading}
              className="mt-2 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <div className="flex items-center gap-3 my-4 text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>
          <button
            onClick={google}
            className="w-full h-11 rounded-xl bg-background border border-border font-medium text-sm flex items-center justify-center gap-2 hover:border-primary/40"
          >
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.5 29.1 4.5 24 4.5 16.3 4.5 9.6 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.1 0 9.6-1.9 13-5.1l-6-5.1c-1.9 1.4-4.4 2.3-7 2.3-5.3 0-9.7-3-11.3-7.4l-6.5 5C9.5 39 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.4 4.4-4.6 5.8l6 5.1c-.4.3 6.8-5 6.8-14.9 0-1.2-.1-2.3-.4-3.5z"/></svg>
            Continue with Google
          </button>
          <div className="mt-5 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "Don't have an account?" : "Already have one?"}{" "}
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary font-medium">
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
        <Link to="/" className="mt-6 text-xs text-muted-foreground flex items-center gap-1.5 justify-center">
          <TrendingUp className="h-3.5 w-3.5" /> Vertex — Mobile crypto trading
        </Link>
      </div>
    </div>
  );
}
