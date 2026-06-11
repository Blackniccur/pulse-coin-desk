import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import { getMyKyc } from "@/lib/kyc.functions";

export function useKycStatus() {
  const fn = useServerFn(getMyKyc);
  return useQuery({ queryKey: ["myKyc"], queryFn: () => fn(), staleTime: 30_000 });
}

export function KycBanner() {
  const kyc = useKycStatus();
  if (kyc.isLoading) return null;
  const status = kyc.data?.status as string | undefined;
  if (status === "approved") return null;

  const label =
    status === "pending"
      ? "Verification under review"
      : status === "rejected"
      ? "Verification rejected — please resubmit"
      : "Verify identity & address to trade";
  const tone =
    status === "pending"
      ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-200"
      : "bg-bear/10 border-bear/30 text-bear";

  return (
    <Link
      to="/verification"
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs ${tone}`}
    >
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span className="flex-1 font-medium">{label}</span>
      <span className="text-[10px] uppercase tracking-widest opacity-80">Verify →</span>
    </Link>
  );
}

/** Returns true when the user has an approved KYC submission. */
export function useCanTrade() {
  const kyc = useKycStatus();
  return {
    canTrade: kyc.data?.status === "approved",
    status: (kyc.data?.status as string | undefined) ?? "none",
    loading: kyc.isLoading,
  };
}

export function KycLockedCard() {
  const { status, loading } = useCanTrade();
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking verification…
      </div>
    );
  }
  const msg =
    status === "pending"
      ? "Your documents are being reviewed. Trading unlocks once approved (usually within a few minutes)."
      : status === "rejected"
      ? "Your previous submission was rejected. Please resubmit Proof of Identity and Proof of Address."
      : "Submit Proof of Identity and Proof of Address to unlock trading.";
  return (
    <div className="rounded-2xl border border-bear/30 bg-bear/5 p-5 text-center space-y-3">
      <div className="h-10 w-10 mx-auto rounded-full bg-bear/15 grid place-items-center">
        <ShieldCheck className="h-5 w-5 text-bear" />
      </div>
      <div className="text-sm font-semibold">Trading locked</div>
      <p className="text-xs text-muted-foreground">{msg}</p>
      <Link
        to="/verification"
        className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
      >
        Complete verification
      </Link>
    </div>
  );
}
