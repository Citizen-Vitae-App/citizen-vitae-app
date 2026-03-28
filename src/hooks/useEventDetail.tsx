import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CauseTheme {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface EventWithOrganization {
  id: string;
  name: string;
  description: string | null;
  location: string;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  organization_id: string;
  allow_self_certification: boolean | null;
  organizations: {
    id: string;
    name: string;
    logo_url: string | null;
    description: string | null;
  };
  event_cause_themes?: {
    cause_themes: CauseTheme;
  }[];
}

export function useEventDetail(eventId?: string) {
  return useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizations!inner (
            id,
            name,
            logo_url,
            description
          ),
          event_cause_themes (
            cause_themes (
              id,
              name,
              color,
              icon
            )
          )
        `)
        .eq('id', eventId!)
        .eq('is_public', true)
        .maybeSingle();

      if (error) throw error;
      return data as EventWithOrganization | null;
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
  });
}
