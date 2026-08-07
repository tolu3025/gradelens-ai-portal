-- Migration: Disable RLS on grades and cgpa_summary tables to prevent silent insert failures

ALTER TABLE IF EXISTS public.grades DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cgpa_summary DISABLE ROW LEVEL SECURITY;

-- Fallbacks
ALTER TABLE IF EXISTS public.grades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access on grades" ON public.grades;
CREATE POLICY "Public full access on grades" ON public.grades FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE IF EXISTS public.cgpa_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access on cgpa_summary" ON public.cgpa_summary;
CREATE POLICY "Public full access on cgpa_summary" ON public.cgpa_summary FOR ALL TO public USING (true) WITH CHECK (true);
