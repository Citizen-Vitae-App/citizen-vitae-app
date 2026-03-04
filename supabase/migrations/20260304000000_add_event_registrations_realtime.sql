-- Add event_registrations to realtime publication for scan status updates
ALTER PUBLICATION supabase_realtime ADD TABLE event_registrations;
