import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface UserOrgMembership {
  id: string;
  name: string;
  logo_url: string | null;
  role: string;
  is_owner: boolean;
}

export interface FavoriteCause {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface CertifiedExperience {
  id: string;
  event_id: string;
  event_name: string;
  organization_name: string;
  organization_logo: string | null;
  attended_at: string;
  causes: Array<{ id: string; name: string; icon: string; color: string }>;
}

/** Expérience déclarative (`manual_experiences`), non liée à un événement certifié. */
export interface ManualExperience {
  id: string;
  title: string;
  experience_type: string;
  organization_name: string;
  start_month: number;
  start_year: number;
  end_month: number | null;
  end_year: number | null;
  is_current: boolean;
  location: string | null;
  location_type: string | null;
  description: string | null;
  created_at: string;
}

export function useCitizenProfile() {
  const { user } = useAuth();

  const orgsQuery = useQuery({
    queryKey: ['user-organizations', user?.id],
    queryFn: async (): Promise<UserOrgMembership[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('organization_members')
        .select(
          `
          role,
          is_owner,
          organizations (
            id,
            name,
            logo_url
          )
        `
        )
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || [])
        .filter((row: { organizations: unknown }) => row.organizations)
        .map((m: { role: string; is_owner: boolean | null; organizations: { id: string; name: string; logo_url: string | null } }) => ({
          id: m.organizations.id,
          name: m.organizations.name,
          logo_url: m.organizations.logo_url,
          role: m.role,
          is_owner: m.is_owner ?? false,
        }));
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const causesQuery = useQuery({
    queryKey: ['user-favorite-causes', user?.id],
    queryFn: async (): Promise<FavoriteCause[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_cause_themes')
        .select(
          `
          cause_themes (
            id,
            name,
            icon,
            color
          )
        `
        )
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []).map((row: { cause_themes: FavoriteCause }) => row.cause_themes).filter(Boolean);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const experiencesQuery = useQuery({
    queryKey: ['user-certified-missions', user?.id],
    queryFn: async (): Promise<CertifiedExperience[]> => {
      if (!user?.id) return [];
      const { data: registrations, error } = await supabase
        .from('event_registrations')
        .select(
          `
          id,
          event_id,
          attended_at,
          events (
            id,
            name,
            start_date,
            end_date,
            organizations (
              name,
              logo_url
            )
          )
        `
        )
        .eq('user_id', user.id)
        .not('attended_at', 'is', null)
        .order('attended_at', { ascending: false });
      if (error) throw error;

      const rows = registrations || [];
      const missions: CertifiedExperience[] = await Promise.all(
        rows.map(async (reg: Record<string, unknown>) => {
          const event = reg.events as {
            id: string;
            name: string;
            organizations: { name: string; logo_url: string | null } | null;
          };
          const org = event?.organizations;
          const { data: eventCauses } = await supabase
            .from('event_cause_themes')
            .select(
              `
              cause_themes (
                id,
                name,
                icon,
                color
              )
            `
            )
            .eq('event_id', event.id);
          const causes = (eventCauses || []).map((ec: { cause_themes: FavoriteCause }) => ec.cause_themes);
          return {
            id: reg.id as string,
            event_id: event.id,
            event_name: event.name,
            organization_name: org?.name ?? 'Organisation',
            organization_logo: org?.logo_url ?? null,
            attended_at: reg.attended_at as string,
            causes,
          };
        })
      );
      return missions;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const manualQuery = useQuery({
    queryKey: ['manual-experiences', user?.id],
    queryFn: async (): Promise<ManualExperience[]> => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('manual_experiences')
        .select(
          'id, title, experience_type, organization_name, start_month, start_year, end_month, end_year, is_current, location, location_type, description, created_at'
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as ManualExperience[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    organizations: orgsQuery.data ?? [],
    favoriteCauses: causesQuery.data ?? [],
    experiences: experiencesQuery.data ?? [],
    manualExperiences: manualQuery.data ?? [],
    isLoading:
      orgsQuery.isLoading ||
      causesQuery.isLoading ||
      experiencesQuery.isLoading ||
      manualQuery.isLoading,
    refetch: () => {
      void orgsQuery.refetch();
      void causesQuery.refetch();
      void experiencesQuery.refetch();
      void manualQuery.refetch();
    },
  };
}
