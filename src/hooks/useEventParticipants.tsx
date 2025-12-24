import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EventParticipant {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: string;
  registered_at: string;
  attended_at: string | null;
  certification_start_at: string | null;
  certification_end_at: string | null;
  face_match_passed: boolean | null;
}

export interface EventParticipantCount {
  event_id: string;
  count: number;
  participants: EventParticipant[];
}

export const useEventParticipants = (eventId: string | undefined) => {
  return useQuery({
    queryKey: ['event-participants', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          user_id,
          status,
          registered_at,
          attended_at,
          certification_start_at,
          certification_end_at,
          face_match_passed,
          profiles!event_registrations_user_id_fkey(
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('event_id', eventId)
        .order('registered_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((reg: any) => ({
        user_id: reg.user_id,
        first_name: reg.profiles.first_name,
        last_name: reg.profiles.last_name,
        email: reg.profiles.email,
        avatar_url: reg.profiles.avatar_url,
        status: reg.status,
        registered_at: reg.registered_at,
        attended_at: reg.attended_at,
        certification_start_at: reg.certification_start_at,
        certification_end_at: reg.certification_end_at,
        face_match_passed: reg.face_match_passed,
      })) as EventParticipant[];
    },
    enabled: !!eventId,
  });
};

export const useEventsParticipantCounts = (eventIds: string[]) => {
  return useQuery({
    queryKey: ['events-participant-counts', eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return new Map<string, EventParticipantCount>();

      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          event_id,
          user_id,
          status,
          registered_at,
          attended_at,
          certification_start_at,
          certification_end_at,
          face_match_passed,
          profiles!event_registrations_user_id_fkey(
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .in('event_id', eventIds)
        .order('registered_at', { ascending: false });

      if (error) throw error;

      const countMap = new Map<string, EventParticipantCount>();

      // Initialize all event IDs with empty counts
      eventIds.forEach(id => {
        countMap.set(id, { event_id: id, count: 0, participants: [] });
      });

      // Aggregate data
      (data || []).forEach((reg: any) => {
        const eventData = countMap.get(reg.event_id);
        if (eventData) {
          eventData.count += 1;
          eventData.participants.push({
            user_id: reg.user_id,
            first_name: reg.profiles.first_name,
            last_name: reg.profiles.last_name,
            email: reg.profiles.email,
            avatar_url: reg.profiles.avatar_url,
            status: reg.status,
            registered_at: reg.registered_at,
            attended_at: reg.attended_at,
            certification_start_at: reg.certification_start_at,
            certification_end_at: reg.certification_end_at,
            face_match_passed: reg.face_match_passed,
          });
        }
      });

      return countMap;
    },
    enabled: eventIds.length > 0,
  });
};
