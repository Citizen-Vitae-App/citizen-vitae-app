import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface OrganizationMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  custom_role_title: string | null;
  created_at: string | null;
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export const useOrganizationMembers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get current user's organization
  const { data: membership } = useQuery({
    queryKey: ['user-organization-membership', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isAdmin = membership?.role === 'admin';
  const organizationId = membership?.organization_id;

  // Fetch all members of the organization
  const { data: members, isLoading, error } = useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          id,
          user_id,
          organization_id,
          role,
          custom_role_title,
          created_at
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles for each member
      const memberIds = data.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', memberIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(member => ({
        ...member,
        profile: profileMap.get(member.user_id) || null,
      })) as OrganizationMember[];
    },
    enabled: !!organizationId,
  });

  // Update member role
  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role, customRoleTitle }: { 
      memberId: string; 
      role: string; 
      customRoleTitle?: string | null;
    }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ 
          role, 
          custom_role_title: customRoleTitle ?? null 
        })
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast({
        title: 'Membre mis à jour',
        description: 'Le rôle du membre a été modifié avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le rôle du membre.',
        variant: 'destructive',
      });
      console.error('Error updating member:', error);
    },
  });

  // Remove member from organization
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast({
        title: 'Membre supprimé',
        description: 'Le membre a été retiré de l\'organisation.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le membre.',
        variant: 'destructive',
      });
      console.error('Error removing member:', error);
    },
  });

  // Add new member by email
  const addMember = useMutation({
    mutationFn: async ({ email, role, customRoleTitle }: { 
      email: string; 
      role: string;
      customRoleTitle?: string;
    }) => {
      if (!organizationId) throw new Error('No organization found');

      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Aucun utilisateur trouvé avec cet email');

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (existingMember) {
        throw new Error('Cet utilisateur est déjà membre de l\'organisation');
      }

      // Add member
      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: profile.id,
          role,
          custom_role_title: customRoleTitle || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members'] });
      toast({
        title: 'Membre ajouté',
        description: 'Le nouveau membre a été ajouté à l\'organisation.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter le membre.',
        variant: 'destructive',
      });
      console.error('Error adding member:', error);
    },
  });

  return {
    members,
    isLoading,
    error,
    isAdmin,
    organizationId,
    updateMemberRole,
    removeMember,
    addMember,
    currentUserId: user?.id,
  };
};
