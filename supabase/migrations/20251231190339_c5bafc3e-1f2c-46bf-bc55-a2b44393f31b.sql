-- Allow super admins to delete from notifications
CREATE POLICY "Super admins can delete notifications" 
ON public.notifications 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::text));

-- Allow super admins to delete profiles
CREATE POLICY "Super admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::text));

-- Allow super admins to delete user_preferences
CREATE POLICY "Super admins can delete user preferences" 
ON public.user_preferences 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::text));

-- Allow super admins to delete user_cause_themes
CREATE POLICY "Super admins can delete user cause themes" 
ON public.user_cause_themes 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::text));

-- Allow super admins to delete user_favorites
CREATE POLICY "Super admins can delete user favorites" 
ON public.user_favorites 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::text));