
CREATE TYPE public.kyc_status AS ENUM ('pending','approved','rejected');

CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  date_of_birth date,
  country text NOT NULL,
  address_line text NOT NULL,
  city text NOT NULL,
  postal_code text,
  id_doc_type text NOT NULL,
  id_doc_path text,
  address_doc_path text,
  selfie_path text,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own kyc" ON public.kyc_submissions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.arbitrage_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  exchange_buy text NOT NULL,
  exchange_sell text NOT NULL,
  price_buy numeric NOT NULL,
  price_sell numeric NOT NULL,
  spread_pct numeric NOT NULL,
  qty numeric NOT NULL DEFAULT 0,
  estimated_pnl numeric NOT NULL DEFAULT 0,
  account_kind text NOT NULL DEFAULT 'demo',
  action text NOT NULL DEFAULT 'recommended',  -- recommended | executed | skipped
  status text NOT NULL DEFAULT 'open',         -- open | closed
  confidence numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arbitrage_signals TO authenticated;
GRANT ALL ON public.arbitrage_signals TO service_role;
ALTER TABLE public.arbitrage_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own arb" ON public.arbitrage_signals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
  LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER kyc_touch BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
