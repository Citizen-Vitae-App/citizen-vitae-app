
-- Add slug column to profiles for custom CV URLs
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug) WHERE slug IS NOT NULL;

-- Function to generate a unique slug from first_name and last_name
CREATE OR REPLACE FUNCTION public.generate_profile_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  -- Only generate if slug is null and we have name data
  IF NEW.slug IS NULL AND (NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL) THEN
    -- Build base slug from names
    base_slug := lower(
      regexp_replace(
        unaccent(
          trim(concat_ws('-', COALESCE(NEW.first_name, ''), COALESCE(NEW.last_name, '')))
        ),
        '[^a-z0-9-]', '', 'g'
      )
    );
    
    -- Remove consecutive hyphens and trim
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    -- If empty, use a random string
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'citizen-' || substr(gen_random_uuid()::text, 1, 8);
    END IF;
    
    final_slug := base_slug;
    
    -- Ensure uniqueness
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = final_slug AND id != NEW.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate slug
CREATE TRIGGER trigger_generate_profile_slug
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_profile_slug();

-- Enable unaccent extension if not already
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Backfill existing profiles with slugs
DO $$
DECLARE
  rec RECORD;
  base_slug text;
  final_slug text;
  counter int;
BEGIN
  FOR rec IN SELECT id, first_name, last_name FROM public.profiles WHERE slug IS NULL LOOP
    base_slug := lower(
      regexp_replace(
        unaccent(
          trim(concat_ws('-', COALESCE(rec.first_name, ''), COALESCE(rec.last_name, '')))
        ),
        '[^a-z0-9-]', '', 'g'
      )
    );
    base_slug := regexp_replace(base_slug, '-+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'citizen-' || substr(gen_random_uuid()::text, 1, 8);
    END IF;
    
    final_slug := base_slug;
    counter := 0;
    
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = final_slug AND id != rec.id) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    UPDATE public.profiles SET slug = final_slug WHERE id = rec.id;
  END LOOP;
END;
$$;
