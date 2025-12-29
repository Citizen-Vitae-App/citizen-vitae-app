import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface UserRoleInfo {
  isOwner: boolean;
  isAdmin: boolean;
  isLeader: boolean;
  isMember: boolean;
  userTeamId: string | null;
  organizationId: string | null;
  organizationRole: string | null;
  
  // Derived permissions
  canManageAllEvents: boolean;
  canManageTeamOnly: boolean;
  canViewOrganizationSettings: boolean;
  canManageMembers: boolean;
  canAddMembersToTeam: boolean;
  canCreateTeams: boolean;
  
  isLoading: boolean;
}

export const useUserRole = (): UserRoleInfo => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['user-role-info', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get organization membership
      const { data: membership, error: membershipError } = await supabase
        .from('organization_members')
        .select('organization_id, role, is_owner')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) return null;

      // Get team membership and leader status
      const { data: teamMembership, error: teamError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          is_leader,
          teams!inner(organization_id)
        `)
        .eq('user_id', user.id);

      if (teamError) throw teamError;

      // Find team membership for this organization
      const orgTeamMembership = teamMembership?.find(
        (tm: any) => {
          const team = Array.isArray(tm.teams) ? tm.teams[0] : tm.teams;
          return team?.organization_id === membership.organization_id;
        }
      );

      return {
        organizationId: membership.organization_id,
        organizationRole: membership.role,
        isOwner: membership.is_owner || false,
        isAdmin: membership.role === 'admin',
        isLeader: orgTeamMembership?.is_leader || false,
        userTeamId: orgTeamMembership?.team_id || null,
      };
    },
    enabled: !!user,
  });

  const isOwner = data?.isOwner || false;
  const isAdmin = data?.isAdmin || false;
  const isLeader = data?.isLeader || false;
  const isMember = !isOwner && !isAdmin && !isLeader;
  const userTeamId = data?.userTeamId || null;
  const organizationId = data?.organizationId || null;
  const organizationRole = data?.organizationRole || null;

  // Derived permissions
  const canManageAllEvents = isOwner || isAdmin;
  const canManageTeamOnly = isLeader && !isAdmin && !isOwner;
  const canViewOrganizationSettings = isOwner || isAdmin;
  const canManageMembers = isOwner || isAdmin;
  const canAddMembersToTeam = isOwner || isAdmin || isLeader;
  const canCreateTeams = isOwner || isAdmin;

  return {
    isOwner,
    isAdmin,
    isLeader,
    isMember,
    userTeamId,
    organizationId,
    organizationRole,
    canManageAllEvents,
    canManageTeamOnly,
    canViewOrganizationSettings,
    canManageMembers,
    canAddMembersToTeam,
    canCreateTeams,
    isLoading,
  };
};
