CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_matric TEXT;
  v_exists BOOLEAN;
BEGIN
  v_matric := NEW.raw_user_meta_data->>'matric_no';
  IF v_matric IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM public.students WHERE matric_no = v_matric) INTO v_exists;
  ELSE
    v_exists := FALSE;
  END IF;

  INSERT INTO public.profiles (id, matric_no, full_name, email)
  VALUES (
    NEW.id,
    CASE WHEN v_exists THEN v_matric ELSE NULL END,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );

  IF v_exists THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();