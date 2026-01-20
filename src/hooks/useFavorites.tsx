import { useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Favorite {
  id: string;
  event_id: string;
  created_at: string;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user favorites avec React Query
  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching favorites:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Realtime subscription - optimisé
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-favorites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_favorites',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Mise à jour directe du cache sans refetch
          queryClient.setQueryData(['favorites', user.id], (old: Favorite[] = []) => {
            if (payload.eventType === 'INSERT') {
              return [...old, payload.new as Favorite];
            } else if (payload.eventType === 'DELETE') {
              return old.filter(f => f.id !== (payload.old as Favorite).id);
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

  const isFavorite = useCallback((eventId: string) => {
    return favorites.some(f => f.event_id === eventId);
  }, [favorites]);

  // Mutation pour ajouter un favori
  const addFavoriteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          event_id: eventId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (eventId) => {
      // Optimistic update
      const tempFavorite: Favorite = {
        id: `temp-${Date.now()}`,
        event_id: eventId,
        created_at: new Date().toISOString()
      };
      
      queryClient.setQueryData(['favorites', user?.id], (old: Favorite[] = []) => 
        [...old, tempFavorite]
      );
      
      return { tempFavorite };
    },
    onSuccess: (data, _, context) => {
      // Remplacer le temp par le vrai
      queryClient.setQueryData(['favorites', user?.id], (old: Favorite[] = []) =>
        old.map(f => f.id === context.tempFavorite.id ? data : f)
      );
      
      toast({
        title: "Ajouté aux favoris",
        description: "L'événement a été ajouté à vos favoris"
      });
    },
    onError: (_, __, context) => {
      // Rollback
      if (context?.tempFavorite) {
        queryClient.setQueryData(['favorites', user?.id], (old: Favorite[] = []) =>
          old.filter(f => f.id !== context.tempFavorite.id)
        );
      }
      
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter aux favoris",
        variant: "destructive"
      });
    },
  });

  // Mutation pour retirer un favori
  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;
    },
    onMutate: async (favoriteId) => {
      // Optimistic update
      const previousFavorites = queryClient.getQueryData(['favorites', user?.id]) as Favorite[];
      const removed = previousFavorites?.find(f => f.id === favoriteId);
      
      queryClient.setQueryData(['favorites', user?.id], (old: Favorite[] = []) =>
        old.filter(f => f.id !== favoriteId)
      );
      
      return { removed };
    },
    onSuccess: () => {
      toast({
        title: "Retiré des favoris",
        description: "L'événement a été retiré de vos favoris"
      });
    },
    onError: (_, __, context) => {
      // Rollback
      if (context?.removed) {
        queryClient.setQueryData(['favorites', user?.id], (old: Favorite[] = []) =>
          [...old, context.removed]
        );
      }
      
      toast({
        title: "Erreur",
        description: "Impossible de retirer des favoris",
        variant: "destructive"
      });
    },
  });

  const toggleFavorite = useCallback(async (eventId: string) => {
    if (!user) {
      return { needsAuth: true };
    }

    const existing = favorites.find(f => f.event_id === eventId);

    if (existing) {
      removeFavoriteMutation.mutate(existing.id);
      return { success: true, added: false };
    } else {
      addFavoriteMutation.mutate(eventId);
      return { success: true, added: true };
    }
  }, [user, favorites, addFavoriteMutation, removeFavoriteMutation]);

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite
  };
};
