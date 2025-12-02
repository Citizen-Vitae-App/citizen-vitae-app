import { useState, useEffect } from 'react';
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

interface UseEventsOptions {
  organizationId?: string;
  publicOnly?: boolean;
  searchQuery?: string;
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

        if (options.publicOnly) {
          query = query.eq('is_public', true);
        }

        if (options.searchQuery && options.searchQuery.trim()) {
          query = query.or(`name.ilike.%${options.searchQuery}%,location.ilike.%${options.searchQuery}%`);
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
  }, [options.organizationId, options.publicOnly, options.searchQuery]);

  return { events, isLoading, error };
};

export const useOrganizationEvents = (searchQuery?: string) => {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = useState(true);

  useEffect(() => {
    const fetchUserOrganization = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoadingOrg(false);
        return;
      }

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membership) {
        setOrganizationId(membership.organization_id);
      }
      setIsLoadingOrg(false);
    };

    fetchUserOrganization();
  }, []);

  const { events, isLoading: isLoadingEvents, error } = useEvents({
    organizationId: organizationId || undefined,
    searchQuery
  });

  return {
    events,
    isLoading: isLoadingOrg || isLoadingEvents,
    error,
    organizationId
  };
};

export const usePublicEvents = (searchQuery?: string) => {
  return useEvents({ publicOnly: true, searchQuery });
};
