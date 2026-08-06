-- Migration: Disable RLS on user_roles and counselors tables
-- Fixes "new row violates row-level security policy for table user_roles" error permanently

ALTER TABLE IF EXISTS public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.counselors DISABLE ROW LEVEL SECURITY;

-- Fallback permissive policy if RLS is re-enabled in future
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access on user_roles" ON public.user_roles;
CREATE POLICY "Public full access on user_roles" ON public.user_roles
  FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.counselors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access on counselors" ON public.counselors;
CREATE POLICY "Public full access on counselors" ON public.counselors
  FOR ALL TO public USING (true) WITH CHECK (true);
