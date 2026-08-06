-- Migration: Enable RLS Policies on user_roles and counselors tables for role management
-- Allows authenticated users/admins to insert/update roles and counselor profiles without RLS errors

ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.counselors ENABLE ROW LEVEL SECURITY;

-- 1. Policies for user_roles
DROP POLICY IF EXISTS "Allow authenticated read user_roles" ON public.user_roles;
CREATE POLICY "Allow authenticated read user_roles" ON public.user_roles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert user_roles" ON public.user_roles;
CREATE POLICY "Allow authenticated insert user_roles" ON public.user_roles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update user_roles" ON public.user_roles;
CREATE POLICY "Allow authenticated update user_roles" ON public.user_roles
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated delete user_roles" ON public.user_roles;
CREATE POLICY "Allow authenticated delete user_roles" ON public.user_roles
  FOR DELETE USING (auth.role() = 'authenticated');

-- 2. Policies for counselors
DROP POLICY IF EXISTS "Allow authenticated read counselors" ON public.counselors;
CREATE POLICY "Allow authenticated read counselors" ON public.counselors
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert counselors" ON public.counselors;
CREATE POLICY "Allow authenticated insert counselors" ON public.counselors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update counselors" ON public.counselors;
CREATE POLICY "Allow authenticated update counselors" ON public.counselors
  FOR UPDATE USING (auth.role() = 'authenticated');
