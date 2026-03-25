
-- Table for manual/uncertified citizen experiences
CREATE TABLE public.manual_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  experience_type text NOT NULL,
  organization_name text NOT NULL,
  start_month integer NOT NULL CHECK (start_month BETWEEN 1 AND 12),
  start_year integer NOT NULL CHECK (start_year BETWEEN 1950 AND 2100),
  end_month integer CHECK (end_month BETWEEN 1 AND 12),
  end_year integer CHECK (end_year BETWEEN 1950 AND 2100),
  is_current boolean NOT NULL DEFAULT false,
  location text,
  location_type text CHECK (location_type IN ('onsite', 'hybrid', 'remote')),
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.manual_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own manual experiences"
  ON public.manual_experiences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own manual experiences"
  ON public.manual_experiences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manual experiences"
  ON public.manual_experiences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual experiences"
  ON public.manual_experiences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all manual experiences"
  ON public.manual_experiences FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- Auto-update updated_at
CREATE TRIGGER update_manual_experiences_updated_at
  BEFORE UPDATE ON public.manual_experiences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
