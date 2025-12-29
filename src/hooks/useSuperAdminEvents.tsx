import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Event {
  id: string;
  name: string;
  start_date: string;
  location: string;
  is_public: boolean | null;
  organization_name: string;
  participant_count: number;
}

export function useSuperAdminEvents() {
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['super-admin-events'],
    queryFn: async (): Promise<Event[]> => {
      // Get all events with organization info
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          id,
          name,
          start_date,
          location,
          is_public,
          organization_id,
          organizations(name)
        `)
        .order('start_date', { ascending: false });

      if (eventsError) throw eventsError;

      // Get participant counts
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select('event_id');

      if (regError) throw regError;

      // Count participants per event
      const countMap = new Map<string, number>();
      registrations?.forEach(reg => {
        const current = countMap.get(reg.event_id) || 0;
        countMap.set(reg.event_id, current + 1);
      });

      return (eventsData || []).map(event => ({
        id: event.id,
        name: event.name,
        start_date: event.start_date,
        location: event.location,
        is_public: event.is_public,
        organization_name: (event.organizations as any)?.name || 'N/A',
        participant_count: countMap.get(event.id) || 0,
      }));
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-stats'] });
      toast.success('Événement supprimé avec succès');
    },
    onError: (error) => {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression de l\'événement');
    },
  });

  return {
    events,
    isLoading,
    deleteEvent: deleteEventMutation.mutate,
  };
}
