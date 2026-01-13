-- 📧 DEBUG: Manually confirm an email address (CORRECTED)
-- Only 'email_confirmed_at' needs to be updated. 'confirmed_at' updates automatically.

-- ⚠️ ATTENTION: Check which email is the correct one.
-- You used 'yprina...' in the UPDATE but 'prina...' in the SELECT.
-- I put both below, run the one that corresponds to your real account.

-- Option 1: If your email starts with 'y'
UPDATE auth.users
SET email_confirmed_at = now(),
    updated_at = now(),
    raw_app_meta_data = raw_app_meta_data || '{"provider": "email", "providers": ["email"]}'::jsonb
WHERE email = 'yprina.e2501242@etud.univ-ubs.fr';

-- Option 2: If your email starts with 'p' (seems more likely)
UPDATE auth.users
SET email_confirmed_at = now(),
    updated_at = now(),
    raw_app_meta_data = raw_app_meta_data || '{"provider": "email", "providers": ["email"]}'::jsonb
WHERE email = 'prina.e2501242@etud.univ-ubs.fr';

-- Verify the user status
SELECT id, email, email_confirmed_at, last_sign_in_at 
FROM auth.users 
WHERE email IN ('yprina.e2501242@etud.univ-ubs.fr', 'prina.e2501242@etud.univ-ubs.fr');
