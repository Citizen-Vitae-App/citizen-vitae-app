-- Allow users to delete their own event registrations
CREATE POLICY "Users can delete their own registrations" 
ON public.event_registrations 
FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);