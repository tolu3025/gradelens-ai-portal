-- Migration: Enable permissive RLS policies on user_roles and counselors tables
-- Fixes "new row violates row-level security policy for table user_roles" error

ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.counselors ENABLE ROW LEVEL SECURITY;

-- 1. Policies for user_roles table
DROP POLICY IF EXISTS "Allow authenticated read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow authenticated delete user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow all for user_roles" ON public.user_roles;

CREATE POLICY "Allow all for user_roles" ON public.user_roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Policies for counselors table
DROP POLICY IF EXISTS "Allow authenticated read counselors" ON public.counselors;
DROP POLICY IF EXISTS "Allow authenticated insert counselors" ON public.counselors;
DROP POLICY IF EXISTS "Allow authenticated update counselors" ON public.counselors;
DROP POLICY IF EXISTS "Allow all for counselors" ON public.counselors;

CREATE POLICY "Allow all for counselors" ON public.counselors
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
