-- Custom migration to handle automatic user creation on Supabase Auth signup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_id, display_name)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'display_name', 
      split_part(new.email, '@', 1)
    )
  );
  RETURN new;
END;
$$;

-- Ensure the trigger is clean
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger on auth.users table (Supabase internal)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
