import { Calendar, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function UpcomingEventsSection() {
  const { user } = useAuth();

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcoming-events-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const now = new Date().toISOString();

      // Get events the user is registered to (upcoming)
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select(`
          event_id,
          events!inner (
            id, name, start_date, end_date, location, cover_image_url,
            organization_id,
            organizations!inner (name, logo_url)
          )
        `)
        .eq('user_id', user.id)
        .gte('events.start_date', now);

      // Get events the user has favorited (upcoming)
      const { data: favorites } = await supabase
        .from('user_favorites')
        .select(`
          event_id,
          events!inner (
            id, name, start_date, end_date, location, cover_image_url,
            organization_id,
            organizations!inner (name, logo_url)
          )
        `)
        .eq('user_id', user.id)
        .gte('events.start_date', now);

      // Merge and deduplicate by event id
      const eventsMap = new Map<string, any>();

      for (const r of registrations || []) {
        const e = r.events as any;
        if (e) eventsMap.set(e.id, e);
      }
      for (const f of favorites || []) {
        const e = f.events as any;
        if (e) eventsMap.set(e.id, e);
      }

      // Sort by start_date ascending
      return Array.from(eventsMap.values()).sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
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
          <Link to="/my-missions" className="flex items-center gap-1">
            Voir tout
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-3">
        {upcomingEvents.map((event) => {
          const org = event.organizations as any;
          return (
            <Link key={event.id} to={`/events/${event.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Event cover image */}
                    <div className="w-24 h-24 flex-shrink-0 bg-muted">
                      {event.cover_image_url ? (
                        <img
                          src={event.cover_image_url}
                          alt={event.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10">
                          <Calendar className="h-8 w-8 text-primary/40" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 p-3 flex flex-col justify-center gap-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5 flex-shrink-0">
                          <AvatarImage src={org?.logo_url || ''} alt={org?.name} />
                          <AvatarFallback className="text-[10px] bg-muted">
                            {org?.name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">{org?.name}</span>
                      </div>
                      <h3 className="font-semibold text-sm text-foreground truncate">{event.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {format(new Date(event.start_date), 'EEE d MMM • HH:mm', { locale: fr })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">{event.location}</span>
                        </span>
                      </div>
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
