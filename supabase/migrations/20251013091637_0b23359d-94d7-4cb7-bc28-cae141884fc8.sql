-- Migrate existing users to profiles table
INSERT INTO public.profiles (user_id, email)
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles);