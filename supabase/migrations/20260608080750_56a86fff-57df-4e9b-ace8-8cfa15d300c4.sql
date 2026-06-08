ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'market';
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS trigger_price numeric;