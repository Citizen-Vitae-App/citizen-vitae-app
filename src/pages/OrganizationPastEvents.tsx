import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import logo from '@/assets/logo.png';
import EventCard from '@/components/EventCard';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

interface CauseTheme {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface Event {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  cover_image_url: string | null;
  cause_themes: CauseTheme[];
}

const OrganizationPastEvents = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [orgId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!orgId) return;

      setIsLoading(true);

      // Fetch organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, logo_url')
        .eq('id', orgId)
        .maybeSingle();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        setIsLoading(false);
        return;
      }

      setOrganization(orgData);

      if (orgData) {
        // Fetch ALL past events (no limit)
        const { data: pastEventsData } = await supabase
          .from('events')
          .select(`
            id, name, start_date, end_date, location, cover_image_url,
            event_cause_themes (
              cause_themes (
                id, name, color, icon
              )
            )
          `)
          .eq('organization_id', orgId)
          .eq('is_public', true)
          .lt('end_date', new Date().toISOString())
          .order('end_date', { ascending: false });

        if (pastEventsData) {
          const pastWithCauses = pastEventsData.map((event: any) => ({
            ...event,
            cause_themes: event.event_cause_themes
              ?.map((ect: any) => ect.cause_themes)
              .filter(Boolean) || []
          }));
          setPastEvents(pastWithCauses);
        }
      }

      setIsLoading(false);
    };

    fetchData();
  }, [orgId]);

  const formatEventDate = (dateString: string) => {
    return format(parseISO(dateString), "d MMM yyyy", { locale: fr });
  };

  const getShortTitle = (name: string) => {
    const words = name.split(' ');
    return words.slice(0, 3).join(' ');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
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
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Organisation introuvable</h1>
          <Link to="/">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
              Retour à l'accueil
            </button>
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
            <Link to={`/organization/${orgId}`} className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 text-foreground" />
              <img src={logo} alt="CitizenVitae" className="h-8" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Avatar className="h-12 w-12 border-2 border-border">
            <AvatarImage src={organization.logo_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Building2 className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Événements passés</h1>
            <p className="text-muted-foreground">{organization.name}</p>
          </div>
        </div>

        {/* Events Grid */}
        {pastEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun événement passé pour cette organisation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map((event) => (
              <div key={event.id} className="opacity-80 hover:opacity-100 transition-opacity">
                <EventCard
                  id={event.id}
                  title={event.name}
                  shortTitle={getShortTitle(event.name)}
                  organization={organization.name}
                  date={formatEventDate(event.start_date)}
                  location={event.location}
                  image={event.cover_image_url || '/placeholder.svg'}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationPastEvents;
