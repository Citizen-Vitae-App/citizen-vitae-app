import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
  capacity: number | null;
  has_waitlist: boolean;
  require_approval: boolean;
  is_public: boolean;
  organization_id: string;
  created_at: string;
  organization_name?: string;
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface UseEventsOptions {
  organizationId?: string;
  teamId?: string; // Filter by team for Leaders
  publicOnly?: boolean;
  searchQuery?: string;
  dateRange?: DateRange;
  causeFilters?: string[];
}

export const useEvents = (options: UseEventsOptions = {}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // If cause filters are applied, first get event IDs that match the causes
        let eventIdsWithCauses: string[] | null = null;
        
        if (options.causeFilters && options.causeFilters.length > 0) {
          const { data: causeMatches } = await supabase
            .from('event_cause_themes')
            .select('event_id')
            .in('cause_theme_id', options.causeFilters);
          
          if (causeMatches) {
            eventIdsWithCauses = [...new Set(causeMatches.map(m => m.event_id))];
          }
          
          // If no events match the causes, return empty
          if (!eventIdsWithCauses || eventIdsWithCauses.length === 0) {
            setEvents([]);
            setIsLoading(false);
            return;
          }
        }

        let query = supabase
          .from('events')
          .select(`
            *,
            organizations!inner (name)
          `)
          .order('start_date', { ascending: true });

        if (options.organizationId) {
          query = query.eq('organization_id', options.organizationId);
        }

        // Filter by team_id for Leaders
        if (options.teamId) {
          query = query.eq('team_id', options.teamId);
        }

        if (options.publicOnly) {
          query = query.eq('is_public', true);
          // Filtrer uniquement les events "live" (non terminés)
          query = query.gte('end_date', new Date().toISOString());
        }

        if (options.searchQuery && options.searchQuery.trim()) {
          // Sanitize search input to prevent PostgREST filter injection
          // Remove characters that could break or manipulate the query filter
          const sanitized = options.searchQuery
            .replace(/[%_,()]/g, ' ')  // Remove SQL wildcards and PostgREST operators
            .replace(/\s+/g, ' ')       // Normalize whitespace
            .trim()
            .slice(0, 100);             // Limit length to prevent DoS
          
          if (sanitized) {
            query = query.or(`name.ilike.%${sanitized}%,location.ilike.%${sanitized}%`);
          }
        }

        // Date range filter - filter events with start_date within the range
        if (options.dateRange?.start) {
          const rangeStart = new Date(options.dateRange.start);
          rangeStart.setHours(0, 0, 0, 0);
          query = query.gte('start_date', rangeStart.toISOString());
          
          if (options.dateRange.end) {
            const rangeEnd = new Date(options.dateRange.end);
            rangeEnd.setHours(23, 59, 59, 999);
            query = query.lte('start_date', rangeEnd.toISOString());
          }
        }

        // Filter by cause-matched event IDs
        if (eventIdsWithCauses) {
          query = query.in('id', eventIdsWithCauses);
        }

        const { data, error: queryError } = await query;

        if (queryError) {
          throw queryError;
        }

        const formattedEvents = (data || []).map((event: any) => ({
          ...event,
          organization_name: event.organizations?.name
        }));

        setEvents(formattedEvents);
      } catch (err: any) {
        console.error('Error fetching events:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [options.organizationId, options.teamId, options.publicOnly, options.searchQuery, options.dateRange?.start, options.dateRange?.end, options.causeFilters]);

  return { events, isLoading, error };
};

export const useOrganizationEvents = (searchQuery?: string, teamId?: string) => {
  // Fetch organization ID with TanStack Query for proper cache management
  const { data: organizationData, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['user-organization-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      return membership?.organization_id || null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const organizationId = organizationData ?? null;

  // Fetch events with TanStack Query - proper cache isolation by organizationId
  const { data: events = [], isLoading: isLoadingEvents, error } = useQuery({
    queryKey: ['organization-events', organizationId, teamId, searchQuery],
    queryFn: async () => {
      if (!organizationId) return [];

      let query = supabase
        .from('events')
        .select(`
          *,
          organizations!inner (name)
        `)
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: true });

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

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      return (data || []).map((event: any) => ({
        ...event,
        organization_name: event.organizations?.name
      }));
    },
    enabled: !!organizationId,
    // CRITICAL: Return empty array immediately when organizationId changes
    // This prevents showing stale data from previous organization
    placeholderData: [],
    staleTime: 30 * 1000, // 30 seconds
  });

  return {
    events,
    isLoading: isLoadingOrg || (!!organizationId && isLoadingEvents),
    error: error?.message || null,
    organizationId
  };
};

interface PublicEventsOptions {
  searchQuery?: string;
  dateRange?: DateRange;
  causeFilters?: string[];
}

export const usePublicEvents = (options: PublicEventsOptions = {}) => {
  return useEvents({ 
    publicOnly: true, 
    searchQuery: options.searchQuery,
    dateRange: options.dateRange,
    causeFilters: options.causeFilters
  });
};
