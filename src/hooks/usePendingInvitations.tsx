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
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PendingInvitation[];
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

  return {
    invitations: invitations || [],
    isLoading,
    cancelInvitation,
    resendInvitation,
  };
};
