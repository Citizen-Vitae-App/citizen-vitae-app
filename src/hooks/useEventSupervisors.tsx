import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface EventSupervisor {
  id: string;
  event_id: string;
  user_id: string;
  assigned_by: string | null;
  created_at: string;
  profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export function useEventSupervisors(eventId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch supervisors for an event
  const { data: supervisors, isLoading, error } = useQuery({
    queryKey: ['event-supervisors', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('event_supervisors')
        .select(`
          id,
          event_id,
          user_id,
          assigned_by,
          created_at,
          profile:profiles(id, first_name, last_name, email, avatar_url)
        `)
        .eq('event_id', eventId);

      if (error) throw error;

      return (data || []).map(s => ({
        ...s,
        profile: Array.isArray(s.profile) ? s.profile[0] : s.profile
      })) as EventSupervisor[];
    },
    enabled: !!eventId,
  });

  // Add a supervisor to an event
  const addSupervisor = useMutation({
    mutationFn: async ({ userId, assignedBy }: { userId: string; assignedBy?: string }) => {
      if (!eventId) throw new Error('Event ID is required');

      const { data, error } = await supabase
        .from('event_supervisors')
        .insert({
          event_id: eventId,
          user_id: userId,
          assigned_by: assignedBy || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-supervisors', eventId] });
      toast({
        title: 'Superviseur assigné',
        description: 'Le superviseur a été assigné à cet événement.',
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

  // Remove a supervisor from an event
  const removeSupervisor = useMutation({
    mutationFn: async (userId: string) => {
      if (!eventId) throw new Error('Event ID is required');

      const { error } = await supabase
        .from('event_supervisors')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-supervisors', eventId] });
      toast({
        title: 'Superviseur retiré',
        description: 'Le superviseur a été retiré de cet événement.',
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
    supervisors,
    isLoading,
    error,
    addSupervisor,
    removeSupervisor,
  };
}

// Hook to check if user is a supervisor for any event in the organization
export function useUserSupervisorStatus(userId: string | null, organizationId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-supervisor-status', userId, organizationId],
    queryFn: async () => {
      if (!userId || !organizationId) return { isSupervisor: false, eventIds: [] };

      const { data, error } = await supabase
        .from('event_supervisors')
        .select(`
          event_id,
          event:events(id, organization_id)
        `)
        .eq('user_id', userId);

      if (error) throw error;

      // Filter to only events in this organization
      const orgEventIds = (data || [])
        .filter(s => {
          const event = Array.isArray(s.event) ? s.event[0] : s.event;
          return event?.organization_id === organizationId;
        })
        .map(s => s.event_id);

      return {
        isSupervisor: orgEventIds.length > 0,
        eventIds: orgEventIds,
      };
    },
    enabled: !!userId && !!organizationId,
  });

  return {
    isSupervisor: data?.isSupervisor ?? false,
    supervisedEventIds: data?.eventIds ?? [],
    isLoading,
  };
}

// Hook to get all supervisor user IDs for an organization
export function useOrganizationSupervisors(organizationId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ['organization-supervisors', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('event_supervisors')
        .select(`
          user_id,
          event:events!inner(organization_id)
        `)
        .eq('event.organization_id', organizationId);

      if (error) throw error;

      // Get unique user IDs
      const uniqueUserIds = [...new Set((data || []).map(s => s.user_id))];
      return uniqueUserIds;
    },
    enabled: !!organizationId,
  });

  return {
    supervisorUserIds: data ?? [],
    isLoading,
  };
}

// Hook to fetch contributors (event participants) that can be assigned as supervisors
export function useContributorsForSupervisor(organizationId: string | null) {
  const { data: contributors, isLoading } = useQuery({
    queryKey: ['contributors-for-supervisor', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Get all unique users who have participated in events of this organization
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          user_id,
          profile:profiles(id, first_name, last_name, email, avatar_url),
          event:events!inner(organization_id)
        `)
        .eq('event.organization_id', organizationId)
        .eq('status', 'attended');

      if (error) throw error;

      // Deduplicate by user_id
      const uniqueContributors = new Map();
      (data || []).forEach(reg => {
        const profile = Array.isArray(reg.profile) ? reg.profile[0] : reg.profile;
        if (profile && !uniqueContributors.has(reg.user_id)) {
          uniqueContributors.set(reg.user_id, profile);
        }
      });

      return Array.from(uniqueContributors.values());
    },
    enabled: !!organizationId,
  });

  return {
    contributors,
    isLoading,
  };
}
