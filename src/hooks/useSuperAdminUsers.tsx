import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Organization {
  id: string;
  name: string;
  type: string | null;
}

interface Registration {
  id: string;
  event_name: string;
  organization_name: string;
  status: string;
  registered_at: string;
  certificate_id: string | null;
  has_certificate_data: boolean;
}

export interface User {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
  is_super_admin: boolean;
  is_org_admin: boolean;
  is_org_owner: boolean;
  is_team_leader: boolean;
  is_suspended: boolean;
  organizations: Organization[];
  registrations: Registration[];
  registration_count: number;
  certification_count: number;
}

export function useSuperAdminUsers() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['super-admin-users'],
    queryFn: async (): Promise<User[]> => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, created_at, is_suspended')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all user roles (super_admin)
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Get organization memberships with organization details
      const { data: orgMembers, error: orgError } = await supabase
        .from('organization_members')
        .select('user_id, role, is_owner, organization_id, organizations(id, name, type)');

      if (orgError) throw orgError;

      // Get team memberships (for leader status)
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('user_id, is_leader');

      if (teamError) throw teamError;

      // Get all registrations with event and organization details
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select('id, user_id, status, registered_at, certificate_id, certificate_data, events(id, name, organization_id, organizations(name))');

      if (regError) throw regError;

      // Build lookup maps
      const superAdminSet = new Set(
        userRoles?.filter(r => r.role === 'super_admin').map(r => r.user_id)
      );

      const orgMemberMap = new Map<string, { isAdmin: boolean; isOwner: boolean; organizations: Organization[] }>();
      orgMembers?.forEach(m => {
        const existing = orgMemberMap.get(m.user_id) || { isAdmin: false, isOwner: false, organizations: [] };
        const org = m.organizations as unknown as { id: string; name: string; type: string | null } | null;
        if (org) {
          existing.organizations.push(org);
        }
        orgMemberMap.set(m.user_id, {
          isAdmin: existing.isAdmin || m.role === 'admin',
          isOwner: existing.isOwner || m.is_owner === true,
          organizations: existing.organizations,
        });
      });

      const teamLeaderSet = new Set(
        teamMembers?.filter(t => t.is_leader).map(t => t.user_id)
      );

      // Group registrations by user
      const userRegistrationsMap = new Map<string, Registration[]>();
      registrations?.forEach(r => {
        const event = r.events as unknown as { id: string; name: string; organization_id: string; organizations: { name: string } | null } | null;
        const reg: Registration = {
          id: r.id,
          event_name: event?.name || 'Événement inconnu',
          organization_name: event?.organizations?.name || 'Organisation inconnue',
          status: r.status,
          registered_at: r.registered_at,
          certificate_id: r.certificate_id,
          // A real certification has certificate_data populated, not just certificate_id (which is auto-generated)
          has_certificate_data: r.certificate_data !== null,
        };
        const existing = userRegistrationsMap.get(r.user_id) || [];
        existing.push(reg);
        userRegistrationsMap.set(r.user_id, existing);
      });

      return (profiles || []).map(profile => {
        const orgData = orgMemberMap.get(profile.id);
        const userRegs = userRegistrationsMap.get(profile.id) || [];
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
          is_suspended: (profile as any).is_suspended ?? false,
          organizations: orgData?.organizations || [],
          registrations: userRegs,
          registration_count: userRegs.length,
          // Only count actual certifications (certificate_data populated, not just certificate_id)
          certification_count: userRegs.filter(r => r.has_certificate_data).length,
        };
      });
    },
  });

  return { users, isLoading };
}
