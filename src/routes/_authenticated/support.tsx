import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, LifeBuoy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { listTickets, createTicket } from "@/lib/trading.functions";

export const Route = createFileRoute("/_authenticated/support")({ component: SupportPage });

const CATS = ["general", "deposit", "withdrawal", "trading", "account"];

function SupportPage() {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATS[0]);
  const [message, setMessage] = useState("");
  const list = useServerFn(listTickets);
  const create = useServerFn(createTicket);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["tickets"], queryFn: () => list() });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create({ data: { subject, category, message } });
      await qc.invalidateQueries({ queryKey: ["tickets"] });
      setSubject(""); setMessage("");
      toast.success("Ticket submitted — we'll reply by email");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <AppShell title="Contact Support">
      <div className="p-4 pb-16">
        <form onSubmit={submit} className="rounded-2xl bg-surface border border-border p-4 mb-4 space-y-3">
          <input required minLength={3} maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-sm outline-none" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-background/60 border border-border rounded-lg h-11 px-3 text-sm outline-none capitalize">
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea required minLength={5} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue…" rows={5} className="w-full bg-background/60 border border-border rounded-lg p-3 text-sm outline-none resize-none" />
          <button className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2">
            <Send className="h-4 w-4" /> Submit ticket
          </button>
        </form>

        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Your tickets</div>
        <div className="space-y-2">
          {data?.length === 0 && <div className="text-sm text-muted-foreground text-center py-6">No tickets yet.</div>}
          {data?.map((t: any) => (
            <div key={t.id} className="rounded-xl bg-surface border border-border p-3 flex gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center"><LifeBuoy className="h-4 w-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium truncate">{t.subject}</div>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-accent text-muted-foreground">{t.status}</span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.message}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
