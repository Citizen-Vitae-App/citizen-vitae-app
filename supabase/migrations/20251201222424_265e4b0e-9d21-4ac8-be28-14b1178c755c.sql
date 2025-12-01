-- Create event-covers storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-covers', 'event-covers', true);

-- Allow organization members to upload event covers
CREATE POLICY "Organization members can upload event covers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-covers' AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
  )
);

-- Allow everyone to view event covers (public bucket)
CREATE POLICY "Anyone can view event covers"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'event-covers');

-- Allow organization members to update their event covers
CREATE POLICY "Organization members can update event covers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-covers' AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
  )
);

-- Allow organization members to delete their event covers
CREATE POLICY "Organization members can delete event covers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-covers' AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
  )
);