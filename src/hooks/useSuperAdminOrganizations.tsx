import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  type: string | null;
  logo_url: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  member_count: number;
  owner_email: string | null;
  owner_name: string | null;
}

export function useSuperAdminOrganizations() {
  const queryClient = useQueryClient();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['super-admin-organizations'],
    queryFn: async (): Promise<Organization[]> => {
      // Get all organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, type, logo_url, is_verified, created_at')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;

      // Get all organization members with owner info
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('organization_id, is_owner, user_id');

      if (membersError) throw membersError;

      // Get owner user ids
      const ownerUserIds = members
        ?.filter(m => m.is_owner)
        .map(m => m.user_id) || [];

      // Get profiles for owners
      let ownerProfiles: Record<string, { email: string | null; first_name: string | null; last_name: string | null }> = {};
      if (ownerUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', ownerUserIds);

        profiles?.forEach(p => {
          ownerProfiles[p.id] = { email: p.email, first_name: p.first_name, last_name: p.last_name };
        });
      }

      // Count members per organization and find owner
      const countMap = new Map<string, number>();
      const ownerMap = new Map<string, string>(); // org_id -> user_id

      members?.forEach(member => {
        const current = countMap.get(member.organization_id) || 0;
        countMap.set(member.organization_id, current + 1);
        if (member.is_owner) {
          ownerMap.set(member.organization_id, member.user_id);
        }
      });

      return (orgs || []).map(org => {
        const ownerUserId = ownerMap.get(org.id);
        const ownerProfile = ownerUserId ? ownerProfiles[ownerUserId] : null;
        const ownerName = ownerProfile 
          ? `${ownerProfile.first_name || ''} ${ownerProfile.last_name || ''}`.trim() 
          : null;

        return {
          ...org,
          member_count: countMap.get(org.id) || 0,
          owner_email: ownerProfile?.email || null,
          owner_name: ownerName || null,
        };
      });
    },
  });

  const deleteOrganizationMutation = useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organizationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] });
      toast.success('Organisation supprimée avec succès');
    },
    onError: (error) => {
      console.error('Error deleting organization:', error);
      toast.error('Erreur lors de la suppression de l\'organisation');
    },
  });

  return {
    organizations,
    isLoading,
    deleteOrganization: deleteOrganizationMutation.mutate,
  };
}
