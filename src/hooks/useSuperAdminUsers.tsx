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
  is_pending_invitation: boolean;
  pending_invitation_id?: string;
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

      // Get pending invitations (users who haven't signed up yet)
      const { data: pendingInvitations, error: invError } = await supabase
        .from('organization_invitations')
        .select('id, email, created_at, organization_id, organizations(id, name, type)')
        .eq('status', 'pending');

      if (invError) throw invError;

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

      // Build set of existing user emails to exclude from pending invitations
      const existingEmails = new Set(
        (profiles || []).map(p => p.email?.toLowerCase()).filter(Boolean)
      );

      // Create pseudo-users from pending invitations (for users who haven't signed up yet)
      const pendingUsers: User[] = (pendingInvitations || [])
        .filter(inv => !existingEmails.has(inv.email.toLowerCase()))
        .map(inv => {
          const org = inv.organizations as unknown as { id: string; name: string; type: string | null } | null;
          return {
            id: `pending-${inv.id}`,
            full_name: inv.email.split('@')[0],
            email: inv.email,
            avatar_url: null,
            created_at: inv.created_at,
            is_super_admin: false,
            is_org_admin: false,
            is_org_owner: false,
            is_team_leader: false,
            is_suspended: false,
            is_pending_invitation: true,
            pending_invitation_id: inv.id,
            organizations: org ? [org] : [],
            registrations: [],
            registration_count: 0,
            certification_count: 0,
          };
        });

      // Build regular users from profiles
      const regularUsers: User[] = (profiles || []).map(profile => {
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
          is_pending_invitation: false,
          organizations: orgData?.organizations || [],
          registrations: userRegs,
          registration_count: userRegs.length,
          // Only count actual certifications (certificate_data populated, not just certificate_id)
          certification_count: userRegs.filter(r => r.has_certificate_data).length,
        };
      });

      // Return pending users first, then regular users
      return [...pendingUsers, ...regularUsers];
    },
  });

  return { users, isLoading };
}
