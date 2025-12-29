import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
  is_super_admin: boolean;
  is_org_admin: boolean;
  is_org_owner: boolean;
  is_team_leader: boolean;
  organization_count: number;
  certification_count: number;
}

export function useSuperAdminUsers() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['super-admin-users'],
    queryFn: async (): Promise<User[]> => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles (super_admin)
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get organization memberships (for admin/owner status)
      const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select('user_id, role, is_owner');

      if (orgError) throw orgError;

      // Get team memberships (for leader status)
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('user_id, is_leader');

      if (teamError) throw teamError;

      // Get certifications count per user
      const { data: certifications, error: certError } = await supabase
        .from('event_registrations')
        .select('user_id')
        .not('certificate_id', 'is', null);

      if (certError) throw certError;

      // Build lookup maps
      const superAdminSet = new Set(
        userRoles?.filter(r => r.role === 'super_admin').map(r => r.user_id)
      );

      const orgMemberMap = new Map<string, { isAdmin: boolean; isOwner: boolean; count: number }>();
      orgMembers?.forEach(m => {
        const existing = orgMemberMap.get(m.user_id) || { isAdmin: false, isOwner: false, count: 0 };
        orgMemberMap.set(m.user_id, {
          isAdmin: existing.isAdmin || m.role === 'admin',
          isOwner: existing.isOwner || m.is_owner === true,
          count: existing.count + 1,
        });
      });

      const teamLeaderSet = new Set(
        teamMembers?.filter(t => t.is_leader).map(t => t.user_id)
      );

      const certCountMap = new Map<string, number>();
      certifications?.forEach(c => {
        const current = certCountMap.get(c.user_id) || 0;
        certCountMap.set(c.user_id, current + 1);
      });

      return (profiles || []).map(profile => {
        const orgData = orgMemberMap.get(profile.id);
        return {
          id: profile.id,
          full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Sans nom',
          email: profile.email,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          is_super_admin: superAdminSet.has(profile.id),
          is_org_admin: orgData?.isAdmin || false,
          is_org_owner: orgData?.isOwner || false,
          is_team_leader: teamLeaderSet.has(profile.id),
          organization_count: orgData?.count || 0,
          certification_count: certCountMap.get(profile.id) || 0,
        };
      });
    },
  });

  return { users, isLoading };
}
