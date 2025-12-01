-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, onboarding_completed)
  VALUES (new.id, false);
  RETURN new;
END;
$$;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profile for existing user david.ghouzi@gmail.com
INSERT INTO public.profiles (id, onboarding_completed)
VALUES ('47c28011-9484-488a-80f1-5184b68a0f86', false)
ON CONFLICT (id) DO NOTHING;