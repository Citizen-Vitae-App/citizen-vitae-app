import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationRow {
  id: string;
  user_id: string;
  event_id: string | null;
  type: string;
  message_fr: string;
  message_en: string;
  action_url: string | null;
  is_read: boolean;
  status: 'pending' | 'sent' | 'error';
  sent_at: string | null;
  created_at: string;
  event?: {
    id: string;
    name: string;
    cover_image_url: string | null;
    start_date: string;
    end_date: string;
  } | null;
}

export function useNotificationsList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select(
          `
          *,
          event:events(id, name, cover_image_url, start_date, end_date)
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as NotificationRow[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
