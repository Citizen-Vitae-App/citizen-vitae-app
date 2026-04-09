import { useQuery } from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface FavoriteWithEvent {
  id: string;
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

/** Missions en favoris (likées), avec détail événement — pour Mes Missions. */
export function useFavoriteMissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['favorite-missions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(
          `
          id,
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
      const rows = (data as FavoriteWithEvent[]) || [];
      return [...rows].sort(
        (a, b) => parseISO(a.events.start_date).getTime() - parseISO(b.events.start_date).getTime()
      );
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}
