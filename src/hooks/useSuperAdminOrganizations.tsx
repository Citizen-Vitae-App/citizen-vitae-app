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

      // Get member counts for each organization
      const { data: memberCounts, error: countError } = await supabase
        .from('organization_members')
        .select('organization_id');

      if (countError) throw countError;

      // Count members per organization
      const countMap = new Map<string, number>();
      memberCounts?.forEach(member => {
        const current = countMap.get(member.organization_id) || 0;
        countMap.set(member.organization_id, current + 1);
      });

      return (orgs || []).map(org => ({
        ...org,
        member_count: countMap.get(org.id) || 0,
      }));
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
