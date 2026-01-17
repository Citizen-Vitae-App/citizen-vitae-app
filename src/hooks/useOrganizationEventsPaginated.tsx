import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';

interface Event {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  cover_image_url: string | null;
  organization_id: string;
  organization_name?: string;
  [key: string]: any;
}

interface UseOrganizationEventsPaginatedOptions {
  organizationId?: string | null;
  teamId?: string;
  searchQuery?: string;
  pageSize?: number;
}

/**
 * Hook optimisé pour charger les événements avec pagination
 * Utilise useInfiniteQuery pour charger les événements par pages
 */
export function useOrganizationEventsPaginated({
  organizationId: providedOrgId,
  teamId,
  searchQuery,
  pageSize = 20,
}: UseOrganizationEventsPaginatedOptions = {}) {
  const { user } = useAuth();

  // Fetch organization ID if not provided
  const { data: organizationData, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['user-organization', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !providedOrgId && !!user?.id,
  });

  const organizationId = providedOrgId || organizationData?.organization_id;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['organization-events-paginated', organizationId, teamId, searchQuery],
    queryFn: async ({ pageParam = 0 }) => {
      if (!organizationId) return { events: [], hasMore: false };

      let query = supabase
        .from('events')
        .select(
          `
          *,
          organizations!inner (name)
        `,
          { count: 'exact' }
        )
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: true })
        .range(pageParam, pageParam + pageSize - 1);

      if (teamId) {
        query = query.eq('team_id', teamId);
      }

      if (searchQuery && searchQuery.trim()) {
        const sanitized = searchQuery
          .replace(/[%_,()]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 100);

        if (sanitized) {
          query = query.or(`name.ilike.%${sanitized}%,location.ilike.%${sanitized}%`);
        }
      }

      const { data: eventsData, error: queryError, count } = await query;

      if (queryError) throw queryError;

      const events = (eventsData || []).map((event: any) => ({
        ...event,
        organization_name: event.organizations?.name,
      })) as Event[];

      // Vérifier s'il y a plus de pages
      const hasMore = count ? pageParam + pageSize < count : events.length === pageSize;

      return {
        events,
        hasMore,
        totalCount: count || 0,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.length * pageSize;
    },
    enabled: !!organizationId,
    staleTime: 30 * 1000, // 30 seconds
    initialPageParam: 0,
  });

  // Flatten all pages into a single array
  const events = data?.pages.flatMap((page) => page.events) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;

  return {
    events,
    isLoading: isLoadingOrg || (!!organizationId && isLoading),
    error: error?.message || null,
    organizationId,
    fetchNextPage,
    hasNextPage: hasNextPage || false,
    isFetchingNextPage,
    totalCount,
  };
}
