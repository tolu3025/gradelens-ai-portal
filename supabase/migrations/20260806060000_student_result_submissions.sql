-- Migration: Create result_submissions table and status tracking for grades
-- Enables students to submit semester results for admin approval

CREATE TABLE IF NOT EXISTS public.result_submissions (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  matric_no TEXT NOT NULL,
  student_name TEXT,
  level INT NOT NULL,
  semester INT NOT NULL,
  courses_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT
);

-- Add status column to grades table if not present
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'grades' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.grades ADD COLUMN status TEXT NOT NULL DEFAULT 'APPROVED';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE IF EXISTS public.result_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on result_submissions" ON public.result_submissions;
CREATE POLICY "Allow public select on result_submissions" ON public.result_submissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on result_submissions" ON public.result_submissions;
CREATE POLICY "Allow authenticated insert on result_submissions" ON public.result_submissions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update on result_submissions" ON public.result_submissions;
CREATE POLICY "Allow authenticated update on result_submissions" ON public.result_submissions
  FOR UPDATE USING (auth.role() = 'authenticated');
