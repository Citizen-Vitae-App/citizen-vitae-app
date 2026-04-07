import { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseISO, differenceInHours } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface EventRegistrationRow {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  registered_at: string;
  face_match_passed?: boolean | null;
  qr_token?: string | null;
  attended_at?: string | null;
  certification_start_at?: string | null;
  certification_end_at?: string | null;
}

export interface MobileRegistrationCallbacks {
  onRegistered?: () => void;
  onUnregistered?: () => void;
  onRegisterFailed?: (message: string) => void;
}

export function useMobileEventRegistration(
  eventId: string | undefined,
  callbacks?: MobileRegistrationCallbacks
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAnimating, setIsAnimating] = useState(false);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const { data: registration } = useQuery({
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
      return data as EventRegistrationRow | null;
    },
    enabled: !!eventId && !!user?.id,
  });

  const isRegistered = !!registration;

  const registerMutation = useMutation({
    mutationFn: async (vars: { eventName: string; organizationId: string }) => {
      if (!eventId || !user?.id) throw new Error('missing');
      const { data, error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'registered',
        })
        .select()
        .single();
      if (error) throw error;

      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            organization_id: vars.organizationId,
            type: 'mission_signup',
            event_id: eventId,
            event_name: vars.eventName,
            action_url: `/organization/dashboard`,
          },
        });
      } catch {
        /* notification best-effort */
      }

      return data;
    },
    onSuccess: () => {
      cbRef.current?.onRegistered?.();
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1500);
      void queryClient.invalidateQueries({ queryKey: ['event-registration', eventId, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['my-missions', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['mobile_public_events'] });
    },
    onError: (err: unknown) => {
      const e = err as { code?: string; message?: string };
      if (e?.code === '23505') {
        cbRef.current?.onRegisterFailed?.('Tu es déjà inscrit à cet événement.');
      } else {
        cbRef.current?.onRegisterFailed?.("Impossible de finaliser l'inscription.");
      }
    },
  });

  const unregisterMutation = useMutation({
    mutationFn: async () => {
      if (!registration?.id) throw new Error('none');
      const { error } = await supabase.from('event_registrations').delete().eq('id', registration.id);
      if (error) throw error;
    },
    onSuccess: () => {
      cbRef.current?.onUnregistered?.();
      void queryClient.invalidateQueries({ queryKey: ['event-registration', eventId, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['my-missions', user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['mobile_public_events'] });
    },
  });

  const canUnregister = useCallback((endDate: string): boolean => {
    const eventEnd = parseISO(endDate);
    return differenceInHours(eventEnd, new Date()) >= 24;
  }, []);

  const register = useCallback(
    (eventName: string, organizationId: string, idVerified: boolean | undefined) => {
      if (!user?.id) return { error: 'auth' as const };
      if (idVerified === false) return { error: 'verify' as const };
      registerMutation.mutate({ eventName, organizationId });
      return { error: null };
    },
    [user?.id, registerMutation]
  );

  const unregister = useCallback(
    (endDate: string) => {
      if (!canUnregister(endDate)) return { error: 'deadline' as const };
      unregisterMutation.mutate();
      return { error: null };
    },
    [canUnregister, unregisterMutation]
  );

  return {
    isRegistered,
    registration,
    isRegistering: registerMutation.isPending,
    isUnregistering: unregisterMutation.isPending,
    isAnimating,
    register,
    unregister,
    canUnregister,
  };
}
