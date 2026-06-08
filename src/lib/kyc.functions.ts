import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyKyc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("kyc_submissions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });

export const submitKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      full_name: z.string().min(2).max(120),
      date_of_birth: z.string().optional(),
      country: z.string().min(2).max(60),
      address_line: z.string().min(3).max(200),
      city: z.string().min(1).max(80),
      postal_code: z.string().max(20).optional(),
      id_doc_type: z.enum(["passport", "id_card", "drivers_license"]),
      id_doc_path: z.string().min(1).max(300),
      address_doc_path: z.string().min(1).max(300),
      selfie_path: z.string().max(300).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("kyc_submissions").insert({
      ...data,
      user_id: context.userId,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
