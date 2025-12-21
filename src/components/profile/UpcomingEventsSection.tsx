import { Calendar, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function UpcomingEventsSection() {
  const { user } = useAuth();

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcoming-events-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's organization IDs
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id);

      const orgIds = (memberships || []).map((m) => m.organization_id);

      // Get user's favorite cause IDs
      const { data: userCauses } = await supabase
        .from('user_cause_themes')
        .select('cause_theme_id')
        .eq('user_id', user.id);

      const causeIds = (userCauses || []).map((c) => c.cause_theme_id);

      const now = new Date().toISOString();

      // Get upcoming public events
      let query = supabase
        .from('events')
        .select(`
          id,
          name,
          start_date,
          location,
          organization_id,
          organizations (name)
        `)
        .eq('is_public', true)
        .gte('start_date', now)
        .order('start_date', { ascending: true })
        .limit(3);

      // If user has organizations, prioritize those events
      if (orgIds.length > 0) {
        query = query.in('organization_id', orgIds);
      }

      const { data: events, error } = await query;

      if (error) {
        console.error('Error fetching upcoming events:', error);
        return [];
      }

      // If we have cause preferences, filter events matching those causes
      if (causeIds.length > 0 && events && events.length > 0) {
        const eventIds = events.map((e) => e.id);
        const { data: eventCauses } = await supabase
          .from('event_cause_themes')
          .select('event_id')
          .in('event_id', eventIds)
          .in('cause_theme_id', causeIds);

        if (eventCauses && eventCauses.length > 0) {
          const matchingEventIds = new Set(eventCauses.map((ec) => ec.event_id));
          // Sort: events matching causes first
          events.sort((a, b) => {
            const aMatch = matchingEventIds.has(a.id) ? 0 : 1;
            const bMatch = matchingEventIds.has(b.id) ? 0 : 1;
            return aMatch - bMatch;
          });
        }
      }

      return events || [];
    },
    enabled: !!user?.id,
  });

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          Événements à venir
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/" className="flex items-center gap-1">
            Voir tout
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3">
        {upcomingEvents.map((event) => {
          const org = event.organizations as any;
          return (
            <Link key={event.id} to={`/event/${event.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Date badge */}
                    <div className="flex-shrink-0 text-center bg-primary/10 rounded-lg px-3 py-2">
                      <p className="text-lg font-bold text-primary">
                        {format(new Date(event.start_date), 'd', { locale: fr })}
                      </p>
                      <p className="text-xs text-primary uppercase">
                        {format(new Date(event.start_date), 'MMM', { locale: fr })}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{event.name}</h3>
                      <p className="text-sm text-muted-foreground truncate">{org?.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
