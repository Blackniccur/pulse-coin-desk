import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, User, Mail, ShieldCheck, Save } from "lucide-react";
import { AppShell, useMe } from "@/components/AppShell";
import { updateProfile } from "@/lib/trading.functions";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const me = useMe();
  const qc = useQueryClient();
  const save = useServerFn(updateProfile);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (me.data?.profile) {
      setDisplayName(me.data.profile.display_name ?? "");
      setAvatarUrl(me.data.profile.avatar_url ?? "");
    }
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, [me.data]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await save({ data: { display_name: displayName.trim(), avatar_url: avatarUrl.trim() } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile updated");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const initial = (displayName || email || "V").charAt(0).toUpperCase();
  const twoFA = me.data?.profile?.two_factor_enabled;

  return (
    <AppShell title="Profile">
      <div className="px-5 py-4 pb-24 space-y-5 max-w-md mx-auto">
        <div className="rounded-2xl bg-surface border border-border p-5 flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border border-border" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/40 grid place-items-center text-primary-foreground text-2xl font-bold">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold truncate">{displayName || "Trader"}</div>
            <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
              <Mail className="h-3 w-3" /> {email}
            </div>
          </div>
        </div>

        <form onSubmit={onSave} className="rounded-2xl bg-surface border border-border p-5 space-y-4">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Personal details</div>

          <label className="block">
            <span className="text-xs text-muted-foreground">Display name</span>
            <div className="mt-1 flex items-center gap-2 bg-background/60 border border-border rounded-lg h-11 px-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
                required
                className="flex-1 bg-transparent outline-none text-sm"
                placeholder="Your name"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs text-muted-foreground">Avatar URL (optional)</span>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              maxLength={500}
              placeholder="https://…"
              className="mt-1 w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-sm outline-none focus:border-primary/50"
            />
          </label>

          <button
            disabled={saving}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </button>
        </form>

        <div className="rounded-2xl bg-surface border border-border p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Security</div>
          <Link to="/security" className="flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg hover:bg-accent">
            <ShieldCheck className={`h-5 w-5 ${twoFA ? "text-bull" : "text-muted-foreground"}`} />
            <div className="flex-1">
              <div className="text-sm font-medium">Two-factor authentication</div>
              <div className="text-[11px] text-muted-foreground">{twoFA ? "Enabled" : "Not configured"}</div>
            </div>
            <div className="text-xs text-primary">Manage</div>
          </Link>
          <Link to="/verification" className="flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg hover:bg-accent">
            <User className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="text-sm font-medium">Identity verification (KYC)</div>
              <div className="text-[11px] text-muted-foreground">Proof of identity & address</div>
            </div>
            <div className="text-xs text-primary">Open</div>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
