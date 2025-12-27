import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserOrganization {
  id: string;
  name: string;
  logo_url: string | null;
  type: string | null;
  role: string;
  isOwner: boolean;
  isLeader: boolean;
}

export function useUserOrganizations() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user-organizations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch organization memberships with organization details
      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select(`
          role,
          is_owner,
          organization:organizations(
            id,
            name,
            logo_url,
            type
          )
        `)
        .eq('user_id', user.id);

      if (membershipsError) throw membershipsError;

      // Fetch team memberships to check if user is a leader
      const { data: teamMemberships, error: teamError } = await supabase
        .from('team_members')
        .select(`
          is_leader,
          team:teams(organization_id)
        `)
        .eq('user_id', user.id)
        .eq('is_leader', true);

      if (teamError) throw teamError;

      // Get organization IDs where user is a leader
      const leaderOrgIds = new Set(
        (teamMemberships || [])
          .filter(tm => tm.is_leader && tm.team?.organization_id)
          .map(tm => tm.team!.organization_id)
      );

      // Map memberships to UserOrganization format
      const organizations: UserOrganization[] = (memberships || [])
        .filter(m => m.organization)
        .map(m => ({
          id: m.organization!.id,
          name: m.organization!.name,
          logo_url: m.organization!.logo_url,
          type: m.organization!.type,
          role: m.role,
          isOwner: m.is_owner || false,
          isLeader: leaderOrgIds.has(m.organization!.id),
        }));

      return organizations;
    },
    enabled: !!user?.id,
  });

  const organizations = data ?? [];
  const activeOrganization = organizations[0] || null;
  
  // User can access dashboard if they are admin or leader in at least one organization
  const canAccessDashboard = organizations.some(
    org => org.role === 'admin' || org.isLeader
  );

  return {
    organizations,
    activeOrganization,
    canAccessDashboard,
    isLoading,
  };
}
