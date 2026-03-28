import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Json } from '@/integrations/supabase/types';

interface CertificateDataFromDB {
  user: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
  event: {
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
  };
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  validator: {
    name: string;
    role: string;
  };
  certifiedAt: string;
  isSelfCertified: boolean;
}

export interface RegistrationWithEvent {
  id: string;
  status: string;
  attended_at: string | null;
  face_match_passed: boolean | null;
  qr_token: string | null;
  event_id: string;
  certificate_url: string | null;
  certificate_id: string | null;
  certificate_data: CertificateDataFromDB | null;
  validated_by: string | null;
  events: {
    id: string;
    name: string;
    location: string;
    start_date: string;
    end_date: string;
    cover_image_url: string | null;
    latitude: number | null;
    longitude: number | null;
    allow_self_certification: boolean | null;
    organization_id: string;
    organizations: {
      name: string;
      logo_url: string | null;
    };
  };
}

export function useMyMissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-missions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          status,
          attended_at,
          face_match_passed,
          qr_token,
          event_id,
          certificate_url,
          certificate_id,
          certificate_data,
          validated_by,
          events!inner (
            id,
            name,
            location,
            start_date,
            end_date,
            cover_image_url,
            latitude,
            longitude,
            allow_self_certification,
            organization_id,
            organizations!inner (name, logo_url)
          )
        `)
        .eq('user_id', user!.id);

      if (error) throw error;
      return (data as unknown as RegistrationWithEvent[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}
