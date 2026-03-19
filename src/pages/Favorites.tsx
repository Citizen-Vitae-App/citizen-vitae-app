import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { MainNavbar } from '@/components/MainNavbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { PageTransition } from '@/components/PageTransition';
import { EventCardSkeletons } from '@/components/EventCardSkeleton';
import { EmptyState } from '@/components/EmptyState';
import EventCard from '@/components/EventCard';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import defaultCover from '@/assets/default-event-cover.jpg';
import { generateShortTitle } from '@/lib/utils';

interface EventWithOrganization {
  id: string;
  name: string;
  location: string;
  start_date: string;
  cover_image_url: string | null;
  organizations: {
    name: string;
  };
}

const Favorites = () => {
  const { favorites, isLoading: favoritesLoading } = useFavorites();
  const [events, setEvents] = useState<EventWithOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFavoriteEvents = async () => {
      if (favoritesLoading) return;
      
      if (favorites.length === 0) {
        setEvents([]);
        setIsLoading(false);
        return;
      }

      const eventIds = favorites.map(f => f.event_id);
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          name,
          location,
          start_date,
          cover_image_url,
          organizations!inner (name)
        `)
        .in('id', eventIds)
        .eq('is_public', true);

      if (error) {
        console.error('Error fetching favorite events:', error);
      } else {
        setEvents(data as EventWithOrganization[]);
      }
      setIsLoading(false);
    };

    fetchFavoriteEvents();
  }, [favorites, favoritesLoading]);

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "d MMMM yyyy", { locale: fr });
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - Desktop only */}
      <MainNavbar />

      <main className="container mx-auto px-4 pt-6 md:pt-8 pb-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-6 w-6 text-destructive fill-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Mes favoris</h1>
        </div>

        {isLoading || favoritesLoading ? (
          <EventCardSkeletons count={4} />
        ) : events.length === 0 ? (
          <EmptyState
            icon="heart"
            title="Aucun favori pour le moment"
            description="Explorez les événements et ajoutez-les à vos favoris en cliquant sur le cœur"
            ctaLabel="Découvrir les événements"
            ctaLink="/"
          />
        ) : (
          <PageTransition>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.name}
                  shortTitle={generateShortTitle(event.name)}
                  organization={event.organizations.name}
                  date={formatDate(event.start_date)}
                  location={event.location}
                  image={event.cover_image_url || defaultCover}
                />
              ))}
            </div>
          </PageTransition>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* Bottom padding for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Favorites;
