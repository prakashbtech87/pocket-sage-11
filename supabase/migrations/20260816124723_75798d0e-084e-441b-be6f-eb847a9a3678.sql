CREATE TABLE public.budget_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month date NOT NULL,
  threshold smallint NOT NULL,
  spent_inr numeric NOT NULL DEFAULT 0,
  budget_inr numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, month, threshold)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_alerts TO authenticated;
GRANT ALL ON public.budget_alerts TO service_role;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own budget alerts" ON public.budget_alerts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
SELECT cron.alter_job(1, schedule => '15 18 * * *');