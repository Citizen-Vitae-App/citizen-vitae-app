import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface FavoriteRow {
  id: string;
  event_id: string;
  created_at: string;
}

export function useMobileFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [] } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('user_favorites').select('*').eq('user_id', user.id);
      if (error) return [];
      return (data as FavoriteRow[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const isFavorite = useCallback(
    (eventId: string) => favorites.some((f) => f.event_id === eventId),
    [favorites]
  );

  const addMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) throw new Error('auth');
      const { data, error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, event_id: eventId })
        .select()
        .single();
      if (error) throw error;
      return data as FavoriteRow;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['favorite-missions', user?.id] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      const { error } = await supabase.from('user_favorites').delete().eq('id', favoriteId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['favorite-missions', user?.id] });
    },
  });

  const toggleFavorite = useCallback(
    async (eventId: string): Promise<{ needsAuth: boolean }> => {
      if (!user?.id) return { needsAuth: true };
      const existing = favorites.find((f) => f.event_id === eventId);
      try {
        if (existing) {
          await removeMutation.mutateAsync(existing.id);
        } else {
          await addMutation.mutateAsync(eventId);
        }
        return { needsAuth: false };
      } catch {
        return { needsAuth: false };
      }
    },
    [user?.id, favorites, addMutation, removeMutation]
  );

  return {
    isFavorite,
    toggleFavorite,
    isPending: addMutation.isPending || removeMutation.isPending,
  };
}
