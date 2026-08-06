-- Migration: Fix profiles_matric_no_fkey constraint issue
-- Prevents "violates foreign key constraint profiles_matric_no_fkey" errors when updating user records

-- 1. Drop rigid foreign key constraint if exists
ALTER TABLE IF EXISTS public.profiles 
  DROP CONSTRAINT IF EXISTS profiles_matric_no_fkey;

-- 2. Re-create constraint with non-blocking ON UPDATE CASCADE ON DELETE SET NULL
ALTER TABLE IF EXISTS public.profiles
  ADD CONSTRAINT profiles_matric_no_fkey
  FOREIGN KEY (matric_no)
  REFERENCES public.students(matric_no)
  ON UPDATE CASCADE
  ON DELETE SET NULL
  NOT VALID;
