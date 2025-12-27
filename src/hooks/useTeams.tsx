import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  is_leader: boolean;
  created_at: string;
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
  leader?: TeamMember;
}

export function useTeams(organizationId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all teams for an organization
  const { data: teams, isLoading, error } = useQuery({
    queryKey: ['teams', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data as Team[];
    },
    enabled: !!organizationId,
  });

  // Fetch teams with their members
  const { data: teamsWithMembers, isLoading: isLoadingWithMembers } = useQuery({
    queryKey: ['teams-with-members', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Get teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (teamsError) throw teamsError;

      // Get team members with profiles for each team
      const teamsWithMembersData: TeamWithMembers[] = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { data: membersData, error: membersError } = await supabase
            .from('team_members')
            .select(`
              id,
              team_id,
              user_id,
              is_leader,
              created_at,
              profile:profiles(id, first_name, last_name, email, avatar_url)
            `)
            .eq('team_id', team.id);

          if (membersError) throw membersError;

          const members = (membersData || []).map(m => ({
            ...m,
            profile: Array.isArray(m.profile) ? m.profile[0] : m.profile
          })) as TeamMember[];

          return {
            ...team,
            members,
            leader: members.find(m => m.is_leader),
          };
        })
      );

      return teamsWithMembersData;
    },
    enabled: !!organizationId,
  });

  // Create a new team
  const createTeam = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!organizationId) throw new Error('Organization ID is required');

      const { data, error } = await supabase
        .from('teams')
        .insert({
          organization_id: organizationId,
          name,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['teams-with-members', organizationId] });
      toast({
        title: 'Équipe créée',
        description: 'L\'équipe a été créée avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update a team
  const updateTeam = useMutation({
    mutationFn: async ({ teamId, name, description }: { teamId: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('teams')
        .update({
          name,
          description: description || null,
        })
        .eq('id', teamId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['teams-with-members', organizationId] });
      toast({
        title: 'Équipe modifiée',
        description: 'L\'équipe a été modifiée avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete a team
  const deleteTeam = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['teams-with-members', organizationId] });
      toast({
        title: 'Équipe supprimée',
        description: 'L\'équipe a été supprimée avec succès.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Add a member to a team
  const addTeamMember = useMutation({
    mutationFn: async ({ teamId, userId, isLeader = false }: { teamId: string; userId: string; isLeader?: boolean }) => {
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          is_leader: isLeader,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams-with-members', organizationId] });
      toast({
        title: 'Membre ajouté',
        description: 'Le membre a été ajouté à l\'équipe.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove a member from a team
  const removeTeamMember = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams-with-members', organizationId] });
      toast({
        title: 'Membre retiré',
        description: 'Le membre a été retiré de l\'équipe.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Set a member as team leader
  const setTeamLeader = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      // First, remove leader status from all members of this team
      await supabase
        .from('team_members')
        .update({ is_leader: false })
        .eq('team_id', teamId);

      // Then set the new leader
      const { data, error } = await supabase
        .from('team_members')
        .update({ is_leader: true })
        .eq('team_id', teamId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams-with-members', organizationId] });
      toast({
        title: 'Leader désigné',
        description: 'Le leader de l\'équipe a été mis à jour.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    teams,
    teamsWithMembers,
    isLoading,
    isLoadingWithMembers,
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    removeTeamMember,
    setTeamLeader,
  };
}

// Hook to get user's team and leader status
export function useUserTeam(userId: string | null, organizationId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-team', userId, organizationId],
    queryFn: async () => {
      if (!userId || !organizationId) return null;

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          team_id,
          user_id,
          is_leader,
          team:teams(id, name, organization_id)
        `)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No team found
        throw error;
      }

      // Verify the team belongs to this organization
      const team = Array.isArray(data.team) ? data.team[0] : data.team;
      if (team?.organization_id !== organizationId) return null;

      return {
        teamId: data.team_id,
        teamName: team?.name,
        isLeader: data.is_leader,
      };
    },
    enabled: !!userId && !!organizationId,
  });

  return {
    userTeam: data,
    isLoading,
    isLeader: data?.isLeader ?? false,
  };
}
