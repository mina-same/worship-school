-- Fix security definer functions by setting search_path
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT role FROM public.users WHERE id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.users (id, email, role, metadata)
  VALUES (new.id, new.email, 'user', '{}');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_profile_from_auth()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update user profile with Google auth data if available
  UPDATE public.users 
  SET 
    display_name = COALESCE(display_name, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    avatar_url = COALESCE(avatar_url, NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;