import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, Upload, CheckCircle2, Clock, XCircle, FileText, Home, User } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getMyKyc, submitKyc } from "@/lib/kyc.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/verification")({
  component: VerificationPage,
});

type DocKind = "id_doc" | "address_doc" | "selfie";

function VerificationPage() {
  const qc = useQueryClient();
  const fetchKyc = useServerFn(getMyKyc);
  const submit = useServerFn(submitKyc);
  const kyc = useQuery({ queryKey: ["kyc"], queryFn: () => fetchKyc() });

  const [form, setForm] = useState({
    full_name: "", date_of_birth: "", country: "", address_line: "",
    city: "", postal_code: "", id_doc_type: "passport" as "passport" | "id_card" | "drivers_license",
  });
  const [paths, setPaths] = useState<Record<DocKind, string | undefined>>({
    id_doc: undefined, address_doc: undefined, selfie: undefined,
  });
  const [uploading, setUploading] = useState<DocKind | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function uploadDoc(kind: DocKind, file: File) {
    setUploading(kind);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${uid}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("kyc-docs").upload(path, file, { upsert: true });
      if (error) throw error;
      setPaths((p) => ({ ...p, [kind]: path }));
      toast.success(`${kind.replace("_", " ")} uploaded`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function onSubmit() {
    if (!paths.id_doc || !paths.address_doc) {
      return toast.error("Upload both proof of identity and proof of address");
    }
    if (!form.full_name || !form.country || !form.address_line || !form.city) {
      return toast.error("Fill all required fields");
    }
    setSubmitting(true);
    try {
      await submit({ data: {
        ...form,
        id_doc_path: paths.id_doc,
        address_doc_path: paths.address_doc,
        selfie_path: paths.selfie,
      }});
      await qc.invalidateQueries({ queryKey: ["kyc"] });
      toast.success("Verification submitted — review in 24-48h");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  const status = kyc.data?.status;

  return (
    <AppShell title="Verification">
      <div className="px-5 py-4 pb-24 space-y-4 max-w-md mx-auto">
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div className="text-sm font-semibold">Identity & Address Verification</div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Required to unlock real-money trading, withdrawals, and higher limits. Encrypted &amp; private.
          </p>
        </div>

        {status && (
          <div className={`rounded-xl border p-3 flex items-center gap-3 text-sm ${
            status === "approved" ? "border-bull/40 bg-bull/10 text-bull"
            : status === "rejected" ? "border-bear/40 bg-bear/10 text-bear"
            : "border-yellow-500/40 bg-yellow-500/10 text-yellow-500"
          }`}>
            {status === "approved" ? <CheckCircle2 className="h-4 w-4" /> :
             status === "rejected" ? <XCircle className="h-4 w-4" /> :
             <Clock className="h-4 w-4" />}
            <div className="flex-1">
              <div className="font-semibold capitalize">{status}</div>
              {kyc.data?.notes && <div className="text-xs opacity-80">{kyc.data.notes}</div>}
            </div>
          </div>
        )}

        {status !== "approved" && status !== "pending" && (
          <>
            <Section title="Personal information" icon={User}>
              <Field label="Full legal name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} />
              <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={(v) => setForm({ ...form, date_of_birth: v })} />
              <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
            </Section>

            <Section title="Residential address" icon={Home}>
              <Field label="Street address" value={form.address_line} onChange={(v) => setForm({ ...form, address_line: v })} />
              <div className="grid grid-cols-2 gap-2">
                <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <Field label="Postal code" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
              </div>
            </Section>

            <Section title="Documents" icon={FileText}>
              <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">ID document type</label>
              <select
                value={form.id_doc_type}
                onChange={(e) => setForm({ ...form, id_doc_type: e.target.value as typeof form.id_doc_type })}
                className="w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-sm mb-3"
              >
                <option value="passport">Passport</option>
                <option value="id_card">National ID Card</option>
                <option value="drivers_license">Driver's License</option>
              </select>

              <DocUpload label="Proof of Identity" desc="Photo of your ID/passport" kind="id_doc"
                done={!!paths.id_doc} uploading={uploading === "id_doc"} onFile={(f) => uploadDoc("id_doc", f)} />
              <DocUpload label="Proof of Address" desc="Utility bill or bank statement (last 3 months)" kind="address_doc"
                done={!!paths.address_doc} uploading={uploading === "address_doc"} onFile={(f) => uploadDoc("address_doc", f)} />
              <DocUpload label="Selfie (optional)" desc="Holding your ID next to your face" kind="selfie"
                done={!!paths.selfie} uploading={uploading === "selfie"} onFile={(f) => uploadDoc("selfie", f)} />
            </Section>

            <button
              onClick={onSubmit} disabled={submitting}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">{title}</div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block mb-2">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-sm outline-none focus:border-primary/50" />
    </label>
  );
}

function DocUpload({ label, desc, kind, done, uploading, onFile }: {
  label: string; desc: string; kind: DocKind; done: boolean; uploading: boolean; onFile: (f: File) => void;
}) {
  return (
    <label className={`mt-2 flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${done ? "border-bull/40 bg-bull/5" : "border-dashed border-border bg-background/40 hover:border-primary/40"}`}>
      <div className={`h-9 w-9 rounded-lg grid place-items-center ${done ? "bg-bull/20 text-bull" : "bg-accent text-muted-foreground"}`}>
        {done ? <CheckCircle2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate">{uploading ? "Uploading…" : done ? "Uploaded" : desc}</div>
      </div>
      <input type="file" accept="image/*,application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        data-kind={kind} />
    </label>
  );
}
