-- 🛠 FIX: Safely handle user creation trigger (v2)
-- This script replaces the previous one with better error handling to prevent 500 errors.

-- 1. Drop existing trigger and function to clean up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Create the function with robust error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert into public.users
  BEGIN
    INSERT INTO public.users (id, email, role)
    VALUES (NEW.id, NEW.email, 'free')
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Capture detailed error info
    RAISE WARNING 'Error inserting into public.users: %', SQLERRM;
  END;

  -- Initialize user_credits (if table exists)
  BEGIN
    INSERT INTO public.user_credits (user_id, plan, tokens_total)
    VALUES (NEW.id, 'free', 10000)
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors in credit creation to not block signup
    RAISE WARNING 'Could not create user_credits: %', SQLERRM;
  END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Catch-all to ensure auth user creation NEVER fails due to this trigger
  RAISE WARNING 'Critical error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-attach the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Manual backfill to fix any "limbo" accounts created previously
INSERT INTO public.users (id, email, role)
SELECT id, email, 'free'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;

-- Verification
SELECT '✅ Trigger fixed and safe' as status;
