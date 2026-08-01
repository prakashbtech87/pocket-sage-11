ALTER TABLE public.profiles ALTER COLUMN report_email DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, report_email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $function$;

UPDATE public.profiles p
SET report_email = u.email
FROM auth.users u
WHERE u.id = p.id
  AND p.report_email = 'prakashbtech87@gmail.com'
  AND u.email IS NOT NULL
  AND u.email <> 'prakashbtech87@gmail.com';