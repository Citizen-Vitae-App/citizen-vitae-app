import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface RegistrationWithEvent {
  id: string;
  status: string;
  attended_at: string | null;
  event_id: string;
  events: {
    id: string;
    name: string;
    location: string;
    start_date: string;
    end_date: string;
    cover_image_url: string | null;
    organization_id: string;
    organizations: { name: string; logo_url: string | null };
  };
}

export function useMyMissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-missions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(
          `
          id,
          status,
          attended_at,
          event_id,
          events!inner (
            id,
            name,
            location,
            start_date,
            end_date,
            cover_image_url,
            organization_id,
            organizations!inner (name, logo_url)
          )
        `
        )
        .eq('user_id', user!.id);

      if (error) throw error;
      return (data as unknown as RegistrationWithEvent[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}
