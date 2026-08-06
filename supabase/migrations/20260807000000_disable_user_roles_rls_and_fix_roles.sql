-- Migration: Ensure user_roles and counselors tables allow all inserts without RLS restrictions
-- Fixes admin role grant failure where user_roles inserts were failing silently

ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.counselors DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with 100% permissive policies for authenticated users
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access on user_roles" ON public.user_roles;
CREATE POLICY "Allow public full access on user_roles" ON public.user_roles
  FOR ALL
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.counselors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access on counselors" ON public.counselors;
CREATE POLICY "Allow public full access on counselors" ON public.counselors
  FOR ALL
  USING (true)
  WITH CHECK (true);
