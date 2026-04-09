import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface OrganizationProfileRow {
  id: string;
  name: string;
  bio: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  address: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  sector: string | null;
  employee_count: number | null;
  type: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
}

export interface OrgCauseTheme {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface OrgUpcomingEvent {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  cover_image_url: string | null;
  cause_themes: OrgCauseTheme[];
}

export interface OrganizationProfileData {
  organization: OrganizationProfileRow | null;
  causeThemes: OrgCauseTheme[];
  upcomingEvents: OrgUpcomingEvent[];
  pastEvents: OrgUpcomingEvent[];
}

/**
 * Charge le détail public d’une organisation (RLS : org vérifiée en anon/authenticated,
 * membre, ou super admin ; cause_themes lisible en anon pour les jointures).
 * Thèmes et événements sont chargés en parallèle comme sur le web.
 */
export function useOrganizationProfile(organizationId: string | null) {
  return useQuery({
    queryKey: ['organization-profile', organizationId],
    queryFn: async (): Promise<OrganizationProfileData> => {
      if (!organizationId) {
        return { organization: null, causeThemes: [], upcomingEvents: [], pastEvents: [] };
      }

      const nowIso = new Date().toISOString();

      const [orgRes, themesRes, upcomingRes, pastRes] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', organizationId).maybeSingle(),
        supabase
          .from('organization_cause_themes')
          .select(
            `
            cause_themes (
              id,
              name,
              color,
              icon
            )
          `
          )
          .eq('organization_id', organizationId),
        supabase
          .from('events')
          .select(
            `
            id,
            name,
            start_date,
            end_date,
            location,
            cover_image_url,
            event_cause_themes (
              cause_themes (
                id,
                name,
                color,
                icon
              )
            )
          `
          )
          .eq('organization_id', organizationId)
          .eq('is_public', true)
          .gte('end_date', nowIso)
          .order('start_date', { ascending: true }),
        supabase
          .from('events')
          .select(
            `
            id,
            name,
            start_date,
            end_date,
            location,
            cover_image_url,
            event_cause_themes (
              cause_themes (
                id,
                name,
                color,
                icon
              )
            )
          `
          )
          .eq('organization_id', organizationId)
          .eq('is_public', true)
          .lt('end_date', nowIso)
          .order('end_date', { ascending: false })
          .limit(3),
      ]);

      if (orgRes.error) throw orgRes.error;
      if (themesRes.error) throw themesRes.error;
      if (upcomingRes.error) throw upcomingRes.error;
      if (pastRes.error) throw pastRes.error;

      const organization = (orgRes.data as OrganizationProfileRow | null) ?? null;

      const causeThemes = (themesRes.data ?? [])
        .map((row: { cause_themes: OrgCauseTheme | null }) => row.cause_themes)
        .filter(Boolean) as OrgCauseTheme[];

      const mapEvents = (rows: unknown[]): OrgUpcomingEvent[] =>
        (rows as Record<string, unknown>[]).map((event) => {
          const ect = event.event_cause_themes as { cause_themes: OrgCauseTheme }[] | undefined;
          const cause_themes =
            ect?.map((x) => x.cause_themes).filter(Boolean) ?? ([] as OrgCauseTheme[]);
          return {
            id: event.id as string,
            name: event.name as string,
            start_date: event.start_date as string,
            end_date: event.end_date as string,
            location: event.location as string,
            cover_image_url: (event.cover_image_url as string | null) ?? null,
            cause_themes,
          };
        });

      return {
        organization,
        causeThemes,
        upcomingEvents: mapEvents(upcomingRes.data ?? []),
        pastEvents: mapEvents(pastRes.data ?? []),
      };
    },
    enabled: !!organizationId,
    staleTime: 60 * 1000,
  });
}
