-- =============================================
-- NOTIFICATION SYSTEM FOR CITIZENVITAE
-- =============================================

-- 1. Create notification_status enum
DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_preferences table
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en')),
  email_opt_in BOOLEAN NOT NULL DEFAULT true,
  sms_opt_in BOOLEAN NOT NULL DEFAULT false,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  message_fr TEXT NOT NULL,
  message_en TEXT NOT NULL,
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  status notification_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create index for fast unread notifications lookup
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

-- 5. Enable RLS on both tables
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for user_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Super admins can manage all notifications (for system-sent notifications)
CREATE POLICY "Super admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- 8. Trigger to update updated_at on user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Modify handle_new_user to also create user_preferences
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  full_name_value TEXT;
  first_name_value TEXT;
  last_name_value TEXT;
  avatar_value TEXT;
BEGIN
  -- Récupérer le nom complet (Google: full_name ou name)
  full_name_value := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );
  
  -- Parser le prénom et nom depuis le full_name
  IF full_name_value IS NOT NULL AND full_name_value != '' THEN
    first_name_value := split_part(full_name_value, ' ', 1);
    last_name_value := NULLIF(
      trim(substring(full_name_value from position(' ' in full_name_value) + 1)),
      ''
    );
  END IF;
  
  -- Récupérer l'avatar (Google: avatar_url ou picture)
  avatar_value := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );
  
  -- Créer le profil avec les données extraites
  INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, onboarding_completed)
  VALUES (
    new.id,
    new.email,
    first_name_value,
    last_name_value,
    avatar_value,
    false
  );
  
  -- Créer les préférences utilisateur par défaut
  INSERT INTO public.user_preferences (user_id, language, email_opt_in, sms_opt_in)
  VALUES (new.id, 'fr', true, false);
  
  RETURN new;
END;
$$;

-- 10. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;