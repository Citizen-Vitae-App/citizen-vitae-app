import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { parseISO, differenceInHours } from 'date-fns';

interface Registration {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  registered_at: string;
}

export const useEventRegistration = (eventId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAnimating, setIsAnimating] = useState(false);

  // Fetch current user's registration for this event
  const { data: registration, isLoading: isLoadingRegistration } = useQuery({
    queryKey: ['event-registration', eventId, user?.id],
    queryFn: async () => {
      if (!eventId || !user?.id) return null;

      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as Registration | null;
    },
    enabled: !!eventId && !!user?.id,
  });

  const isRegistered = !!registration;

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async ({ eventName, organizerId }: { eventName: string; organizerId: string }) => {
      if (!eventId || !user?.id) throw new Error('Missing event or user ID');

      // Insert registration
      const { data: regData, error: regError } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'registered',
        })
        .select()
        .single();

      if (regError) throw regError;

      // Send notification to organizer via Edge Function
      try {
        const { error: notifError } = await supabase.functions.invoke('send-notification', {
          body: {
            user_id: organizerId,
            type: 'mission_signup',
            event_id: eventId,
            event_name: eventName,
            action_url: `/organization/dashboard`,
          },
        });

        if (notifError) {
          console.error('Failed to send notification:', notifError);
        }
      } catch (err) {
        console.error('Notification error:', err);
      }

      return regData;
    },
    onMutate: () => {
      setIsAnimating(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registration', eventId, user?.id] });
      toast({
        title: 'Inscription confirmée !',
        description: 'Vous êtes maintenant inscrit à cet événement.',
      });
      // Reset animation after a delay
      setTimeout(() => setIsAnimating(false), 1500);
    },
    onError: (error: any) => {
      setIsAnimating(false);
      console.error('Registration error:', error);
      
      // Check if it's a duplicate registration
      if (error.code === '23505') {
        toast({
          title: 'Déjà inscrit',
          description: 'Vous êtes déjà inscrit à cet événement.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erreur',
          description: 'Impossible de vous inscrire. Veuillez réessayer.',
          variant: 'destructive',
        });
      }
    },
  });

  // Unregister mutation
  const unregisterMutation = useMutation({
    mutationFn: async () => {
      if (!registration?.id) throw new Error('No registration found');

      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', registration.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-registration', eventId, user?.id] });
      toast({
        title: 'Désinscription confirmée',
        description: 'Vous n\'êtes plus inscrit à cet événement.',
      });
    },
    onError: (error) => {
      console.error('Unregistration error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de vous désinscrire. Veuillez réessayer.',
        variant: 'destructive',
      });
    },
  });

  // Check if user can unregister (24h before event end)
  const canUnregister = useCallback((endDate: string): boolean => {
    const eventEnd = parseISO(endDate);
    const hoursUntilEnd = differenceInHours(eventEnd, new Date());
    return hoursUntilEnd >= 24;
  }, []);

  const register = (eventName: string, organizerId: string) => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour vous inscrire.',
        variant: 'destructive',
      });
      return;
    }
    registerMutation.mutate({ eventName, organizerId });
  };

  const unregister = () => {
    unregisterMutation.mutate();
  };

  return {
    isRegistered,
    registration,
    isLoading: isLoadingRegistration,
    isRegistering: registerMutation.isPending,
    isUnregistering: unregisterMutation.isPending,
    isAnimating,
    register,
    unregister,
    canUnregister,
  };
};
