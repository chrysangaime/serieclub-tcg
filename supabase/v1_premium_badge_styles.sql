ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_badge text NOT NULL DEFAULT 'star' CHECK (premium_badge IN ('star','crown','diamond','spotlight'));
