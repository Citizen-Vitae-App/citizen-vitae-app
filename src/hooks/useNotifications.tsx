import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NotificationEvent {
  id: string;
  name: string;
  cover_image_url: string | null;
  start_date: string;
  end_date: string;
}

export interface Notification {
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
  event?: NotificationEvent | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications with event data
  const { data: notifications = [], isLoading, error } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          event:events(id, name, cover_image_url, start_date, end_date)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - explicite pour éviter les refetch
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Calculate unread count
  useEffect(() => {
    const count = notifications.filter(n => !n.is_read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Real-time subscription - OPTIMISÉ : Mise à jour directe au lieu d'invalidation
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // ✅ Mettre à jour directement les données au lieu d'invalider (évite les refetch)
          queryClient.setQueryData(['notifications', user.id], (old: Notification[] = []) => {
            if (payload.eventType === 'INSERT') {
              // Ajouter la nouvelle notification en haut
              return [payload.new as Notification, ...old].slice(0, 50);
            } else if (payload.eventType === 'UPDATE') {
              // Mettre à jour seulement la notification modifiée
              return old.map(n => 
                n.id === (payload.new as any).id 
                  ? { ...n, ...(payload.new as Notification) }
                  : n
              );
            } else if (payload.eventType === 'DELETE') {
              // Supprimer la notification
              return old.filter(n => n.id !== (payload.old as any).id);
            }
            return old;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Mark single notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: (_, notificationId) => {
      // ✅ Mise à jour optimiste au lieu d'invalidation
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] = []) =>
        old.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      // ✅ Mise à jour optimiste au lieu d'invalidation
      queryClient.setQueryData(['notifications', user?.id], (old: Notification[] = []) =>
        old.map(n => ({ ...n, is_read: true }))
      );
    },
  });

  const markAsRead = useCallback((notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  }, [markAsReadMutation]);

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
  };
};
