import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SuperAdminStats {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalEvents: number;
  publicEvents: number;
  totalCertifications: number;
}

export function useSuperAdminStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async (): Promise<SuperAdminStats> => {
      // Fetch all counts in parallel
      // Certifications = only those with certificate_data populated (actual certificates)
      const [orgsResult, usersResult, eventsResult, certificationsResult] = await Promise.all([
        supabase.from('organizations').select('id, is_verified', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('events').select('id, is_public', { count: 'exact' }),
        supabase.from('event_registrations').select('id', { count: 'exact' }).not('certificate_data', 'is', null),
      ]);

      const activeOrgs = orgsResult.data?.filter(org => org.is_verified).length || 0;
      const publicEvents = eventsResult.data?.filter(event => event.is_public).length || 0;

      return {
        totalOrganizations: orgsResult.count || 0,
        activeOrganizations: activeOrgs,
        totalUsers: usersResult.count || 0,
        totalEvents: eventsResult.count || 0,
        publicEvents,
        totalCertifications: certificationsResult.count || 0,
      };
    },
  });

  return { stats, isLoading };
}
