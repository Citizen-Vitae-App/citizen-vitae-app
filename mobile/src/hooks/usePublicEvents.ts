import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface PublicEventRow {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
  organization_id: string;
  organization_name?: string;
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface Options {
  searchQuery?: string;
  dateRange?: DateRange;
  causeFilters?: string[];
}

export function usePublicEvents(options: Options = {}) {
  const causeFiltersKey = useMemo(
    () => options.causeFilters?.sort().join(',') || '',
    [options.causeFilters]
  );

  const dateRangeKey = useMemo(
    () => `${options.dateRange?.start?.getTime() || ''}-${options.dateRange?.end?.getTime() || ''}`,
    [options.dateRange?.start, options.dateRange?.end]
  );

  const { data: events = [], isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['mobile_public_events', options.searchQuery, dateRangeKey, causeFiltersKey],
    queryFn: async () => {
      let eventIdsWithCauses: string[] | null = null;

      if (options.causeFilters && options.causeFilters.length > 0) {
        const { data: causeMatches } = await supabase
          .from('event_cause_themes')
          .select('event_id')
          .in('cause_theme_id', options.causeFilters);

        if (causeMatches) {
          eventIdsWithCauses = [...new Set(causeMatches.map((m) => m.event_id))];
        }
        if (!eventIdsWithCauses || eventIdsWithCauses.length === 0) {
          return [];
        }
      }

      let query = supabase
        .from('events')
        .select(
          `
          id,
          name,
          location,
          start_date,
          end_date,
          cover_image_url,
          organization_id,
          organizations!inner (name)
        `
        )
        .eq('is_public', true)
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      const q = options.searchQuery?.trim();
      if (q) {
        const sanitized = q
          .replace(/[%_,()]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 100);
        if (sanitized) {
          query = query.or(`name.ilike.%${sanitized}%,location.ilike.%${sanitized}%`);
        }
      }

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

      if (eventIdsWithCauses) {
        query = query.in('id', eventIdsWithCauses);
      }

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      return (data || []).map((row: Record<string, unknown>) => {
        const orgs = row.organizations as { name?: string } | null;
        return {
          id: row.id as string,
          name: row.name as string,
          location: row.location as string,
          start_date: row.start_date as string,
          end_date: row.end_date as string,
          cover_image_url: row.cover_image_url as string | null,
          organization_id: row.organization_id as string,
          organization_name: orgs?.name,
        } satisfies PublicEventRow;
      });
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return {
    events,
    isLoading,
    isRefetching,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refetch,
  };
}
