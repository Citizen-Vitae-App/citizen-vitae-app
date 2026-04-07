import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  mapDbCertificateToViewModel,
  type CertificateDataFromDB,
  type CertificateData,
} from '@/types/certificate';

export function usePublicCertificate(certificateId: string | undefined, queryEnabled = true) {
  return useQuery({
    queryKey: ['public-certificate', certificateId],
    queryFn: async (): Promise<{ data: CertificateData; eventId: string | null } | null> => {
      if (!certificateId) return null;
      const { data, error } = await supabase
        .from('public_certificates')
        .select('certificate_data, event_id')
        .eq('certificate_id', certificateId)
        .maybeSingle();

      if (error) throw error;
      if (!data?.certificate_data) {
        throw new Error('Certificat non trouvé');
      }

      const dbData = data.certificate_data as unknown as CertificateDataFromDB;
      return {
        data: mapDbCertificateToViewModel(dbData),
        eventId: data.event_id ?? null,
      };
    },
    enabled: !!certificateId && queryEnabled,
    retry: 5,
    retryDelay: (attempt) => Math.min(2000 * attempt, 10000),
    staleTime: 60 * 1000,
  });
}
