import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import EventCard from '@/components/EventCard';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import logo from '@/assets/logo.png';
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
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 text-foreground" />
              <img src={logo} alt="CitizenVitae" className="h-8" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="h-6 w-6 text-destructive fill-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Mes favoris</h1>
        </div>

        {isLoading || favoritesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-64 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Aucun favori pour le moment
            </h2>
            <p className="text-muted-foreground mb-6">
              Explorez les événements et ajoutez-les à vos favoris en cliquant sur le cœur
            </p>
            <Link 
              to="/" 
              className="text-primary hover:underline font-medium"
            >
              Découvrir les événements
            </Link>
          </div>
        ) : (
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
