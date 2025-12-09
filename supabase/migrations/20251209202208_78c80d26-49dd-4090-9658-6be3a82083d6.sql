-- Enable REPLICA IDENTITY FULL for realtime DELETE events
ALTER TABLE public.user_favorites REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_favorites;