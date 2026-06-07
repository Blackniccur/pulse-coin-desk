import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Smartphone, KeyRound, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/security")({ component: SecurityPage });

function SecurityPage() {
  const [factors, setFactors] = useState<any[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [newPwd, setNewPwd] = useState("");

  async function refresh() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  }
  useEffect(() => { refresh(); }, []);

  async function startEnroll() {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Authenticator ${Date.now()}` });
      if (error) throw error;
      setQr(data.totp.qr_code);
      setFactorId(data.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Enroll failed");
      setEnrolling(false);
    }
  }

  async function verify() {
    if (!factorId) return;
    try {
      const { data: ch, error: e1 } = await supabase.auth.mfa.challenge({ factorId });
      if (e1) throw e1;
      const { error: e2 } = await supabase.auth.mfa.verify({ factorId, challengeId: ch.id, code });
      if (e2) throw e2;
      await supabase.from("profiles").update({ two_factor_enabled: true }).eq("id", (await supabase.auth.getUser()).data.user!.id);
      toast.success("2FA enabled");
      setQr(null); setFactorId(null); setCode(""); setEnrolling(false);
      refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Invalid code");
    }
  }

  async function unenroll(id: string) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) return toast.error(error.message);
    await supabase.from("profiles").update({ two_factor_enabled: false }).eq("id", (await supabase.auth.getUser()).data.user!.id);
    toast.success("2FA disabled");
    refresh();
  }

  async function updatePassword() {
    if (newPwd.length < 8) return toast.error("Min 8 characters");
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setNewPwd("");
  }

  return (
    <AppShell title="Security">
      <div className="p-4 pb-16 space-y-4">
        <div className="rounded-2xl bg-surface border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Two-factor authentication</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Add a layer of security using an authenticator app (Google Authenticator, 1Password, Authy).
          </p>

          {factors.filter((f) => f.status === "verified").map((f) => (
            <div key={f.id} className="mt-3 flex items-center gap-3 rounded-xl bg-background/60 border border-border p-3">
              <Smartphone className="h-4 w-4 text-primary" />
              <div className="flex-1 text-sm">{f.friendly_name || "Authenticator"}</div>
              <button onClick={() => unenroll(f.id)} className="text-bear"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}

          {!enrolling && (
            <button onClick={startEnroll} className="mt-4 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold">
              Enable 2FA
            </button>
          )}

          {qr && (
            <div className="mt-4 space-y-3">
              <div className="text-xs text-muted-foreground">Scan with your authenticator app:</div>
              <div className="bg-white p-3 rounded-xl mx-auto w-fit" dangerouslySetInnerHTML={{ __html: qr }} />
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit code" className="w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-center text-lg tabular tracking-widest outline-none" />
              <button onClick={verify} disabled={code.length !== 6} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {enrolling && <Loader2 className="h-4 w-4 animate-spin" />} Verify & enable
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-surface border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Change password</h2>
          </div>
          <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="New password (min 8)" className="w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-sm outline-none mb-3" />
          <button onClick={updatePassword} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold">
            Update password
          </button>
        </div>
      </div>
    </AppShell>
  );
}
