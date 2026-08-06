-- Migration: Enable RLS Policies on students table
-- Allows authenticated users to INSERT and UPDATE student records without RLS errors

ALTER TABLE IF EXISTS public.students ENABLE ROW LEVEL SECURITY;

-- 1. Policy for SELECT (allow reading students records)
DROP POLICY IF EXISTS "Allow public read on students" ON public.students;
CREATE POLICY "Allow public read on students" ON public.students
  FOR SELECT USING (true);

-- 2. Policy for INSERT (allow authenticated users to insert student records)
DROP POLICY IF EXISTS "Allow authenticated insert on students" ON public.students;
CREATE POLICY "Allow authenticated insert on students" ON public.students
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. Policy for UPDATE (allow authenticated users to update student records)
DROP POLICY IF EXISTS "Allow authenticated update on students" ON public.students;
CREATE POLICY "Allow authenticated update on students" ON public.students
  FOR UPDATE USING (auth.role() = 'authenticated');
