import { useState, useEffect, useCallback } from 'react';
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
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user favorites
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setIsLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching favorites:', error);
      } else {
        setFavorites(data || []);
      }
      setIsLoading(false);
    };

    fetchFavorites();

    // Realtime subscription
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
          if (payload.eventType === 'INSERT') {
            setFavorites(prev => [...prev, payload.new as Favorite]);
          } else if (payload.eventType === 'DELETE') {
            setFavorites(prev => prev.filter(f => f.id !== (payload.old as Favorite).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const isFavorite = useCallback((eventId: string) => {
    return favorites.some(f => f.event_id === eventId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (eventId: string) => {
    if (!user) {
      return { needsAuth: true };
    }

    const existing = favorites.find(f => f.event_id === eventId);

    if (existing) {
      // Optimistic update - remove immediately from local state
      setFavorites(prev => prev.filter(f => f.id !== existing.id));
      
      // Remove from database
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', existing.id);

      if (error) {
        console.error('Error removing favorite:', error);
        // Rollback on error
        setFavorites(prev => [...prev, existing]);
        toast({
          title: "Erreur",
          description: "Impossible de retirer des favoris",
          variant: "destructive"
        });
        return { success: false };
      }

      toast({
        title: "Retiré des favoris",
        description: "L'événement a été retiré de vos favoris"
      });
      return { success: true, added: false };
    } else {
      // Create temporary favorite for optimistic update
      const tempFavorite: Favorite = {
        id: `temp-${Date.now()}`,
        event_id: eventId,
        created_at: new Date().toISOString()
      };
      
      // Optimistic update - add immediately to local state
      setFavorites(prev => [...prev, tempFavorite]);
      
      // Add to database
      const { data, error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          event_id: eventId
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding favorite:', error);
        // Rollback on error
        setFavorites(prev => prev.filter(f => f.id !== tempFavorite.id));
        toast({
          title: "Erreur",
          description: "Impossible d'ajouter aux favoris",
          variant: "destructive"
        });
        return { success: false };
      }

      // Replace temp with real data
      setFavorites(prev => prev.map(f => f.id === tempFavorite.id ? data : f));

      toast({
        title: "Ajouté aux favoris",
        description: "L'événement a été ajouté à vos favoris"
      });
      return { success: true, added: true };
    }
  }, [user, favorites, toast]);

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite
  };
};
