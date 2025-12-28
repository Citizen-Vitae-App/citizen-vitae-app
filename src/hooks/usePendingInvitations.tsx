import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PendingInvitation {
  id: string;
  email: string;
  organization_id: string;
  status: string;
  created_at: string;
  invited_by: string | null;
  role: string | null;
  custom_role_title: string | null;
  team_id: string | null;
  team?: {
    id: string;
    name: string;
  } | null;
}

export const usePendingInvitations = (organizationId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['pending-invitations', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          id,
          email,
          organization_id,
          status,
          created_at,
          invited_by,
          role,
          custom_role_title,
          team_id
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch team info for invitations with team_id
      const teamIds = data.filter(inv => inv.team_id).map(inv => inv.team_id as string);
      let teamsMap = new Map<string, { id: string; name: string }>();
      
      if (teamIds.length > 0) {
        const { data: teams } = await supabase
          .from('teams')
          .select('id, name')
          .in('id', teamIds);
        
        if (teams) {
          teams.forEach(t => teamsMap.set(t.id, { id: t.id, name: t.name }));
        }
      }
      
      return data.map(inv => ({
        ...inv,
        team: inv.team_id ? teamsMap.get(inv.team_id) || null : null,
      })) as PendingInvitation[];
    },
    enabled: !!organizationId && !!user,
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('organization_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      toast.success('Invitation annulée');
    },
    onError: () => {
      toast.error('Impossible d\'annuler l\'invitation');
    },
  });

  const resendInvitation = useMutation({
    mutationFn: async ({ invitationId, email, organizationName, organizationLogoUrl }: {
      invitationId: string;
      email: string;
      organizationName?: string;
      organizationLogoUrl?: string;
    }) => {
      // Call the send-invitation function again
      const { error } = await supabase.functions.invoke('send-invitation', {
        body: {
          emails: [email],
          organizationId,
          organizationName: organizationName || 'Votre organisation',
          organizationLogoUrl: organizationLogoUrl || null,
          isCollaboratorInvite: true,
          role: 'member',
          baseUrl: window.location.origin,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Invitation renvoyée');
    },
    onError: () => {
      toast.error('Impossible de renvoyer l\'invitation');
    },
  });

  const updateInvitationTeam = useMutation({
    mutationFn: async ({ invitationId, teamId }: { invitationId: string; teamId: string | null }) => {
      const { error } = await supabase
        .from('organization_invitations')
        .update({ team_id: teamId })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invitations'] });
      toast.success('Équipe mise à jour');
    },
    onError: () => {
      toast.error('Impossible de modifier l\'équipe');
    },
  });

  return {
    invitations: invitations || [],
    isLoading,
    cancelInvitation,
    resendInvitation,
    updateInvitationTeam,
  };
};
