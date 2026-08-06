-- Migration: Enable RLS Policies on grades and cgpa_summary tables
-- Allows authenticated students and admins to read and insert grades/CGPA records without RLS blockers

ALTER TABLE IF EXISTS public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.cgpa_summary ENABLE ROW LEVEL SECURITY;

-- 1. Policies for grades table
DROP POLICY IF EXISTS "Allow public read on grades" ON public.grades;
CREATE POLICY "Allow public read on grades" ON public.grades
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on grades" ON public.grades;
CREATE POLICY "Allow authenticated insert on grades" ON public.grades
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update on grades" ON public.grades;
CREATE POLICY "Allow authenticated update on grades" ON public.grades
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 2. Policies for cgpa_summary table
DROP POLICY IF EXISTS "Allow public read on cgpa_summary" ON public.cgpa_summary;
CREATE POLICY "Allow public read on cgpa_summary" ON public.cgpa_summary
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on cgpa_summary" ON public.cgpa_summary;
CREATE POLICY "Allow authenticated insert on cgpa_summary" ON public.cgpa_summary
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update on cgpa_summary" ON public.cgpa_summary;
CREATE POLICY "Allow authenticated update on cgpa_summary" ON public.cgpa_summary
  FOR UPDATE USING (auth.role() = 'authenticated');
