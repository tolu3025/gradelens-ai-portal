-- Migration: Sync matric_no and level from auth.users metadata into profiles table
-- This fixes the disconnect where matric_no exists in auth metadata but is NULL in profiles

-- 1. Patch existing profiles: copy matric_no and level from auth user_metadata
UPDATE public.profiles p
SET
  matric_no = (
    SELECT raw_user_meta_data->>'matric_no'
    FROM auth.users u
    WHERE u.id = p.id
      AND raw_user_meta_data->>'matric_no' IS NOT NULL
      AND raw_user_meta_data->>'matric_no' != ''
  )
WHERE p.matric_no IS NULL;

-- 2. Drop and recreate the handle_new_user trigger function
-- to also copy matric_no, level, and full_name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, matric_no)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'matric_no'
  )
  ON CONFLICT (id) DO UPDATE
    SET
      email     = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      matric_no = COALESCE(EXCLUDED.matric_no, profiles.matric_no);

  -- Also upsert into public.students if matric_no was provided
  IF NEW.raw_user_meta_data->>'matric_no' IS NOT NULL
     AND NEW.raw_user_meta_data->>'matric_no' != '' THEN
    INSERT INTO public.students (
      matric_no,
      student_name,
      level,
      department,
      programme
    ) VALUES (
      NEW.raw_user_meta_data->>'matric_no',
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE((NEW.raw_user_meta_data->>'level')::integer, 100),
      'Software Engineering',
      'B.Sc. Software Engineering'
    )
    ON CONFLICT (matric_no) DO UPDATE
      SET
        student_name = COALESCE(EXCLUDED.student_name, students.student_name),
        level        = COALESCE(EXCLUDED.level, students.level);
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Recreate the trigger (drop first in case it already exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Also patch students table from current auth metadata for all users
-- who have a matric_no in metadata but no students row yet
INSERT INTO public.students (matric_no, student_name, level, department, programme)
SELECT
  u.raw_user_meta_data->>'matric_no',
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  COALESCE((u.raw_user_meta_data->>'level')::integer, 100),
  'Software Engineering',
  'B.Sc. Software Engineering'
FROM auth.users u
WHERE u.raw_user_meta_data->>'matric_no' IS NOT NULL
  AND u.raw_user_meta_data->>'matric_no' != ''
ON CONFLICT (matric_no) DO UPDATE
  SET
    student_name = COALESCE(EXCLUDED.student_name, students.student_name),
    level        = COALESCE(EXCLUDED.level, students.level);
