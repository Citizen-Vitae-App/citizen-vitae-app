import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface UserOrganization {
  id: string;
  name: string;
  logo_url: string | null;
  type: string;
  role: string;
  member_count: number;
}

export interface CertifiedMission {
  id: string;
  event_id: string;
  event_name: string;
  organization_name: string;
  organization_logo: string | null;
  start_date: string;
  end_date: string;
  attended_at: string;
  causes: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
  }>;
}

export interface UserCauseTheme {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export function useUserProfile() {
  const { user, profile, isLoading: isAuthLoading } = useAuth();

  // Fetch user's organizations with member count
  const { data: organizations = [], isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['user-organizations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's organization memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select(`
          role,
          organization_id,
          organizations (
            id,
            name,
            logo_url,
            type
          )
        `)
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('Error fetching memberships:', membershipError);
        return [];
      }

      // For each organization, get member count
      const orgsWithCounts: UserOrganization[] = await Promise.all(
        (memberships || []).map(async (m) => {
          const org = m.organizations as any;
          
          const { count } = await supabase
            .from('organization_members')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', org.id);

          return {
            id: org.id,
            name: org.name,
            logo_url: org.logo_url,
            type: org.type || 'association',
            role: m.role,
            member_count: count || 0,
          };
        })
      );

      return orgsWithCounts;
    },
    enabled: !!user?.id,
  });

  // Fetch user's favorite causes
  const { data: favoriteCauses = [], isLoading: isLoadingCauses } = useQuery({
    queryKey: ['user-favorite-causes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_cause_themes')
        .select(`
          cause_theme_id,
          cause_themes (
            id,
            name,
            icon,
            color
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching causes:', error);
        return [];
      }

      return (data || []).map((d) => {
        const theme = d.cause_themes as any;
        return {
          id: theme.id,
          name: theme.name,
          icon: theme.icon,
          color: theme.color,
        };
      });
    },
    enabled: !!user?.id,
  });

  // Fetch certified missions (attended events with face_match_passed)
  const { data: certifiedMissions = [], isLoading: isLoadingMissions } = useQuery({
    queryKey: ['user-certified-missions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: registrations, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          event_id,
          attended_at,
          events (
            id,
            name,
            start_date,
            end_date,
            organization_id,
            organizations (
              name,
              logo_url
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('face_match_passed', true)
        .not('attended_at', 'is', null)
        .order('attended_at', { ascending: false });

      if (error) {
        console.error('Error fetching missions:', error);
        return [];
      }

      // Fetch cause themes for each event
      const missions: CertifiedMission[] = await Promise.all(
        (registrations || []).map(async (reg) => {
          const event = reg.events as any;
          const org = event?.organizations as any;

          // Get causes for this event
          const { data: eventCauses } = await supabase
            .from('event_cause_themes')
            .select(`
              cause_themes (
                id,
                name,
                icon,
                color
              )
            `)
            .eq('event_id', event.id);

          const causes = (eventCauses || []).map((ec) => {
            const theme = ec.cause_themes as any;
            return {
              id: theme.id,
              name: theme.name,
              icon: theme.icon,
              color: theme.color,
            };
          });

          return {
            id: reg.id,
            event_id: event.id,
            event_name: event.name,
            organization_name: org?.name || 'Organisation',
            organization_logo: org?.logo_url,
            start_date: event.start_date,
            end_date: event.end_date,
            attended_at: reg.attended_at!,
            causes,
          };
        })
      );

      return missions;
    },
    enabled: !!user?.id,
  });

  // Compute stats for radar chart
  const radarStats = certifiedMissions.reduce((acc, mission) => {
    mission.causes.forEach((cause) => {
      if (!acc[cause.id]) {
        acc[cause.id] = {
          id: cause.id,
          name: cause.name,
          icon: cause.icon,
          color: cause.color,
          count: 0,
        };
      }
      acc[cause.id].count++;
    });
    return acc;
  }, {} as Record<string, { id: string; name: string; icon: string; color: string; count: number }>);

  const radarData = Object.values(radarStats);
  const distinctCausesCount = radarData.length;
  const totalCertifiedMissions = certifiedMissions.length;

  // Eligibility for radar: >= 10 missions AND >= 5 distinct causes
  const isRadarEligible = totalCertifiedMissions >= 10 && distinctCausesCount >= 5;

  return {
    profile,
    organizations,
    favoriteCauses,
    certifiedMissions,
    radarData,
    isRadarEligible,
    totalCertifiedMissions,
    distinctCausesCount,
    isLoading: isAuthLoading || isLoadingOrgs || isLoadingCauses || isLoadingMissions,
  };
}
