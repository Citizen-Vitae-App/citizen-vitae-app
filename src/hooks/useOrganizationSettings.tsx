import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface OrganizationSettings {
  id: string;
  name: string;
  description: string | null;
  bio: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  slug: string | null;
  visibility: 'public' | 'private' | 'invite_only';
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  sector: string | null;
  employee_count: number | null;
  type: string | null;
  is_verified: boolean;
  siret: string | null;
}

export interface CauseTheme {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface OrganizationCauseTheme {
  id: string;
  cause_theme_id: string;
  cause_themes: CauseTheme;
}

const SECTORS = [
  'Technology',
  'Education',
  'Healthcare',
  'Non-profit / NGO',
  'Finance',
  'Retail',
  'Manufacturing',
  'Media & Entertainment',
  'Real Estate',
  'Transportation',
  'Energy',
  'Agriculture',
  'Government',
  'Other',
];

export function useOrganizationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get user's organization where they are admin
  const { data: membership, isLoading: isMembershipLoading } = useQuery({
    queryKey: ['organization-membership', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const organizationId = membership?.organization_id;
  const isAdmin = membership?.role === 'admin';

  // Get organization settings
  const { data: organization, isLoading: isOrgLoading } = useQuery({
    queryKey: ['organization-settings', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();
      
      if (error) throw error;
      return data as OrganizationSettings;
    },
    enabled: !!organizationId,
  });

  // Get organization's cause themes
  const { data: organizationCauses, isLoading: isCausesLoading } = useQuery({
    queryKey: ['organization-causes', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('organization_cause_themes')
        .select(`
          id,
          cause_theme_id,
          cause_themes (
            id,
            name,
            icon,
            color
          )
        `)
        .eq('organization_id', organizationId);
      
      if (error) throw error;
      return data as unknown as OrganizationCauseTheme[];
    },
    enabled: !!organizationId,
  });

  // Get all available cause themes
  const { data: allCauseThemes } = useQuery({
    queryKey: ['cause-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cause_themes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as CauseTheme[];
    },
  });

  // Update organization settings
  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<OrganizationSettings>) => {
      if (!organizationId) throw new Error('No organization found');
      
      const { error } = await supabase
        .from('organizations')
        .update(updates)
        .eq('id', organizationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings', organizationId] });
      toast.success('Paramètres enregistrés');
    },
    onError: (error) => {
      console.error('Error updating organization:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  // Check if slug is available
  const checkSlugAvailability = async (slug: string): Promise<boolean> => {
    if (!slug) return false;
    
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .neq('id', organizationId || '')
      .maybeSingle();
    
    if (error) {
      console.error('Error checking slug:', error);
      return false;
    }
    
    return !data;
  };

  // Generate slug from name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Update organization causes
  const updateCauses = useMutation({
    mutationFn: async (causeThemeIds: string[]) => {
      if (!organizationId) throw new Error('No organization found');
      
      // Delete existing causes
      const { error: deleteError } = await supabase
        .from('organization_cause_themes')
        .delete()
        .eq('organization_id', organizationId);
      
      if (deleteError) throw deleteError;
      
      // Insert new causes
      if (causeThemeIds.length > 0) {
        const { error: insertError } = await supabase
          .from('organization_cause_themes')
          .insert(
            causeThemeIds.map(causeThemeId => ({
              organization_id: organizationId,
              cause_theme_id: causeThemeId,
            }))
          );
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-causes', organizationId] });
      toast.success('Causes mises à jour');
    },
    onError: (error) => {
      console.error('Error updating causes:', error);
      toast.error('Erreur lors de la mise à jour des causes');
    },
  });

  // Upload image (logo or cover)
  const uploadImage = async (file: File, type: 'logo' | 'cover'): Promise<string | null> => {
    if (!organizationId) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${organizationId}/${type}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('organization-assets')
      .upload(fileName, file, { upsert: true });
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      
      // Check if error is related to file size
      if (uploadError.message?.toLowerCase().includes('size') || 
          uploadError.message?.toLowerCase().includes('too large') ||
          uploadError.statusCode === '413') {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        toast.error(`L'image est trop volumineuse (${fileSizeMB} Mo). La taille maximale autorisée est de 2 Mo. Veuillez compresser ou choisir une autre image.`);
      } else {
        toast.error('Erreur lors du téléchargement. Veuillez réessayer.');
      }
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('organization-assets')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  return {
    organization,
    organizationId,
    isAdmin,
    isLoading: isMembershipLoading || isOrgLoading || isCausesLoading,
    organizationCauses: organizationCauses || [],
    allCauseThemes: allCauseThemes || [],
    sectors: SECTORS,
    updateSettings,
    updateCauses,
    uploadImage,
    checkSlugAvailability,
    generateSlug,
  };
}
