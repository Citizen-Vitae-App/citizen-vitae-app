import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Heart, Share2, MapPin, Calendar, Clock, ArrowLeft, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import EventLocationMap from '@/components/EventLocationMap';
import logo from '@/assets/logo.png';
import defaultCover from '@/assets/default-event-cover.jpg';

interface EventWithOrganization {
  id: string;
  name: string;
  description: string | null;
  location: string;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  organizations: {
    id: string;
    name: string;
    logo_url: string | null;
    description: string | null;
  };
}

const EventDetail = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventWithOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizations!inner (
            id,
            name,
            logo_url,
            description
          )
        `)
        .eq('id', eventId)
        .eq('is_public', true)
        .single();

      if (error) {
        console.error('Error fetching event:', error);
      } else {
        setEvent(data as EventWithOrganization);
      }
      setIsLoading(false);
    };

    fetchEvent();
  }, [eventId]);

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "EEEE d MMMM yyyy", { locale: fr });
  };

  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), "HH'h'mm", { locale: fr });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event?.name,
          text: event?.description || '',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="w-full h-[400px] rounded-lg mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <div>
              <Skeleton className="h-80 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Événement introuvable</h1>
          <Link to="/">
            <Button>Retour à l'accueil</Button>
          </Link>
        </div>
      </div>
    );
  }

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

      {/* Cover Image */}
      <div className="relative w-full h-[400px] lg:h-[500px]">
        <img
          src={event.cover_image_url || defaultCover}
          alt={event.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Action buttons on cover */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3">
          <button
            onClick={() => setIsLiked(!isLiked)}
            className="p-3 bg-background/90 backdrop-blur-sm rounded-lg hover:bg-background transition-colors"
          >
            <Heart className={`h-5 w-5 ${isLiked ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
          </button>
          <button
            onClick={handleShare}
            className="p-3 bg-background/90 backdrop-blur-sm rounded-lg hover:bg-background transition-colors"
          >
            <Share2 className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Title */}
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                {event.name}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            </div>

            {/* Organizer */}
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
              <Avatar className="h-14 w-14">
                <AvatarImage src={event.organizations.logo_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Building2 className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Organisé par</p>
                <p className="font-semibold text-foreground text-lg">{event.organizations.name}</p>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">À propos de l'événement</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {event.description}
                </p>
              </div>
            )}

            {/* Map */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Où se situe l'événement</h2>
              <p className="text-muted-foreground mb-4">{event.location}</p>
              {event.latitude && event.longitude ? (
                <EventLocationMap
                  latitude={event.latitude}
                  longitude={event.longitude}
                  locationName={event.location}
                />
              ) : (
                <div className="h-[300px] bg-muted/30 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Carte non disponible</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Sticky Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card border border-border rounded-lg p-6 space-y-6">
              {/* Date & Time */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground capitalize">
                      {formatDate(event.start_date)}
                    </p>
                    {formatDate(event.start_date) !== formatDate(event.end_date) && (
                      <p className="text-sm text-muted-foreground">
                        au {formatDate(event.end_date)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground">
                      {formatTime(event.start_date)} - {formatTime(event.end_date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                className="w-full h-12 text-lg font-semibold"
                style={{ backgroundColor: '#012573' }}
              >
                Je m'engage
              </Button>

              {/* Conditions */}
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-foreground mb-3">Conditions de participation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  En vous inscrivant à cet événement, vous vous engagez à honorer votre participation. 
                  Votre présence est importante pour l'organisateur et les autres participants. 
                  En cas d'empêchement, veuillez annuler votre inscription au plus tôt afin de 
                  libérer votre place pour d'autres personnes intéressées.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
