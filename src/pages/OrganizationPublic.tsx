// Organization Public Page - Mobile floating sheet with Framer Motion
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Building2, MapPin, Globe, Mail, Phone, Users, ExternalLink, icons, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import EventCard from '@/components/EventCard';
import { MainNavbar } from '@/components/MainNavbar';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { sanitizeHtml } from '@/lib/sanitize';
import { motion, AnimatePresence } from 'framer-motion';

// Backward-compat alias (prevents runtime crash if a stale bundle still references ChevronLeft)
const ChevronLeft = X;
// Dynamic icon component
const DynamicIcon = ({ name, color, size = 18 }: { name: string; color?: string; size?: number }) => {
  const IconComponent = icons[name as keyof typeof icons];
  if (!IconComponent) return null;
  return <IconComponent size={size} color={color} />;
};

interface Organization {
  id: string;
  name: string;
  bio: string | null;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  address: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  sector: string | null;
  employee_count: number | null;
  type: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
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

const OrganizationPublic = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [causeThemes, setCauseThemes] = useState<CauseTheme[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [orgId]);

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!orgId) return;

      setIsLoading(true);

      // Fetch organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .eq('is_verified', true)
        .maybeSingle();

      if (orgError) {
        console.error('Error fetching organization:', orgError);
        setIsLoading(false);
        return;
      }

      setOrganization(orgData);

      if (orgData) {
        // Fetch cause themes
        const { data: themesData } = await supabase
          .from('organization_cause_themes')
          .select(`
            cause_themes (
              id,
              name,
              color,
              icon
            )
          `)
          .eq('organization_id', orgId);

        if (themesData) {
          const themes = themesData
            .map((t: any) => t.cause_themes)
            .filter(Boolean) as CauseTheme[];
          setCauseThemes(themes);
        }

        // Fetch upcoming events (events that haven't ended yet)
        const { data: eventsData } = await supabase
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
          .gte('end_date', new Date().toISOString())
          .order('start_date', { ascending: true });

        if (eventsData) {
          const eventsWithCauses = eventsData.map((event: any) => ({
            ...event,
            cause_themes: event.event_cause_themes
              ?.map((ect: any) => ect.cause_themes)
              .filter(Boolean) || []
          }));
          setUpcomingEvents(eventsWithCauses);
        }

        // Fetch past events (last 3 events that have ended)
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
          .order('end_date', { ascending: false })
          .limit(3);

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

    fetchOrganization();
  }, [orgId]);

  const formatEventDate = (dateString: string) => {
    return format(parseISO(dateString), "d MMM yyyy", { locale: fr });
  };

  const getShortTitle = (name: string) => {
    const words = name.split(' ');
    return words.slice(0, 3).join(' ');
  };

  const getTypeLabel = (type: string | null) => {
    switch (type) {
      case 'company':
        return 'Entreprise';
      case 'association':
        return 'Association';
      case 'foundation':
        return 'Fondation';
      case 'institution':
        return 'Institution';
      default:
        return 'Organisation';
    }
  };

  // Loading state - Skeleton content for the sheet
  const MobileSkeletonContent = () => (
    <div className="px-4 py-4">
      <Skeleton className="w-full h-[200px] rounded-xl mb-8" />
      <div className="flex items-center gap-4 mb-8">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="h-24 w-full" />
    </div>
  );

  // Loading state
  if (isLoading) {
    return (
      <>
        {/* Desktop/Tablet: Normal layout */}
        <div className="hidden md:block min-h-screen bg-background">
          <MainNavbar />
          <div className="container mx-auto px-4 py-8">
            <Skeleton className="w-full h-[200px] rounded-xl mb-8" />
            <div className="flex items-center gap-4 mb-8">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        </div>

        {/* Mobile: Animated floating sheet with skeleton */}
        <div className="md:hidden fixed inset-0 z-50">
          {/* Dark overlay with fade in */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
            style={{ backgroundColor: '#5D5D5D' }}
          />
          
          {/* Sliding sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ 
              type: 'spring',
              damping: 30,
              stiffness: 300,
              delay: 0.1
            }}
            className="absolute inset-x-0 bottom-0 top-3 flex flex-col"
          >
            {/* Header bar with close button */}
            <div className="bg-background rounded-t-[24px] flex items-center justify-between px-4 py-4 flex-shrink-0">
              <div className="w-8" /> {/* Spacer for centering */}
              <div className="flex-1" />
              <button
                onClick={() => navigate(-1)}
                className="p-1"
                aria-label="Fermer"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            
            {/* Content */}
            <div className="bg-background flex-1 overflow-y-auto -mt-px">
              <MobileSkeletonContent />
            </div>
          </motion.div>
        </div>
      </>
    );
  }

  // Not found state
  if (!organization) {
    return (
      <>
        {/* Desktop/Tablet */}
        <div className="hidden md:flex min-h-screen bg-background items-center justify-center">
          <MainNavbar />
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-foreground mb-4">Organisation introuvable</h1>
            <Link to="/">
              <Button>Retour à l'accueil</Button>
            </Link>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden min-h-screen flex items-center justify-center" style={{ backgroundColor: '#5D5D5D' }}>
          <div className="text-center bg-background p-8 rounded-2xl mx-4">
            <h1 className="text-2xl font-bold text-foreground mb-4">Organisation introuvable</h1>
            <Link to="/">
              <Button>Retour à l'accueil</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Main content component (shared between layouts)
  const OrganizationContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Cover Image */}
      <div className={isMobile ? "px-4 py-4" : "container mx-auto px-4 py-4"}>
        <div className="relative w-full h-[200px] lg:h-[280px] rounded-xl overflow-hidden bg-muted">
          {organization.cover_image_url ? (
            <img
              src={organization.cover_image_url}
              alt={organization.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
          )}
        </div>
      </div>

      {/* Organization Header */}
      <div className={isMobile ? "px-4" : "container mx-auto px-4"}>
        <div className="flex flex-col md:flex-row md:items-end gap-4 -mt-12 md:-mt-16 relative z-10">
          <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-lg">
            <AvatarImage src={organization.logo_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              <Building2 className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {organization.name}
              </h1>
              <Badge variant="secondary">{getTypeLabel(organization.type)}</Badge>
            </div>
            {organization.bio && (
              <p className="text-muted-foreground mt-1">{organization.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={isMobile ? "px-4 py-8" : "container mx-auto px-4 py-8"}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {organization.description && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">À propos</h2>
                <div 
                  className="text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(organization.description) }}
                />
              </div>
            )}

            {/* Cause Themes */}
            {causeThemes.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Causes soutenues</h2>
                <div className="flex flex-wrap gap-2">
                  {causeThemes.map((theme) => (
                    <Badge
                      key={theme.id}
                      style={{ backgroundColor: theme.color }}
                      className="text-white flex items-center gap-1.5"
                    >
                      <DynamicIcon name={theme.icon} color="white" size={14} />
                      {theme.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Info Card - Below Causes */}
            <div className="lg:hidden">
              <InfoCard organization={organization} />
            </div>

            {/* Events by Category */}
            {upcomingEvents.length > 0 && (
              <div className="space-y-8">
                <h2 className="text-xl font-semibold text-foreground">Événements à venir</h2>
                
                {/* Group events by cause theme */}
                {(() => {
                  // Get all unique cause themes from events
                  const themesMap = new Map<string, { theme: CauseTheme; events: Event[] }>();
                  const eventsWithoutTheme: Event[] = [];
                  
                  upcomingEvents.forEach((event) => {
                    if (event.cause_themes.length === 0) {
                      eventsWithoutTheme.push(event);
                    } else {
                      event.cause_themes.forEach((theme) => {
                        if (!themesMap.has(theme.id)) {
                          themesMap.set(theme.id, { theme, events: [] });
                        }
                        themesMap.get(theme.id)!.events.push(event);
                      });
                    }
                  });

                  const groupedThemes = Array.from(themesMap.values());

                  return (
                    <>
                      {groupedThemes.map(({ theme, events }) => (
                        <div key={theme.id} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span 
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-medium"
                              style={{ 
                                borderColor: theme.color, 
                                color: theme.color 
                              }}
                            >
                              <DynamicIcon name={theme.icon} color={theme.color} size={14} />
                              {theme.name}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {events.length} événement{events.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex gap-4 pb-4">
                              {events.map((event) => (
                                <div key={`${theme.id}-${event.id}`} className="w-[280px] flex-shrink-0">
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
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      ))}

                      {/* Events without theme */}
                      {eventsWithoutTheme.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                            <h3 className="font-semibold text-foreground">Autres événements</h3>
                            <Badge variant="secondary" className="ml-2">
                              {eventsWithoutTheme.length} événement{eventsWithoutTheme.length > 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex gap-4 pb-4">
                              {eventsWithoutTheme.map((event) => (
                                <div key={event.id} className="w-[280px] flex-shrink-0">
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
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Past Events Section */}
            {pastEvents.length > 0 && (
              <div className="space-y-4 mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Événements passés</h2>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => navigate(`/organization/${orgId}/past-events`)}
                  >
                    Voir plus
                  </Button>
                </div>
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-4 pb-4">
                    {pastEvents.map((event) => (
                      <div key={event.id} className="w-[280px] flex-shrink-0 opacity-70">
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
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            )}
          </div>

          {/* Right Column - Info Card (Desktop only) */}
          <div className="hidden lg:block lg:col-span-1">
            <InfoCard organization={organization} />
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop/Tablet: Normal layout with navbar */}
      <div className="hidden md:block min-h-screen bg-background">
        <MainNavbar />
        <OrganizationContent isMobile={false} />
      </div>

      {/* Mobile: Animated floating sheet effect */}
      <div className="md:hidden fixed inset-0 z-50">
        {/* Dark overlay with fade in */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0"
          style={{ backgroundColor: '#5D5D5D' }}
        />
        
        {/* Sliding sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          transition={{ 
            type: 'spring',
            damping: 30,
            stiffness: 300,
            delay: 0.1
          }}
          className="absolute inset-x-0 bottom-0 top-3 flex flex-col"
        >
          {/* Sticky header bar with close button */}
          <div className="sticky top-0 z-10 bg-background rounded-t-[24px] flex items-center justify-between px-4 py-4 flex-shrink-0">
            <div className="w-8" /> {/* Spacer for centering */}
            <div className="flex-1" />
            <button
              onClick={() => navigate(-1)}
              className="p-1"
              aria-label="Fermer"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          
          {/* Scrollable Content */}
          <div className="bg-background flex-1 overflow-y-auto -mt-px">
            <OrganizationContent isMobile={true} />
          </div>
        </motion.div>
      </div>
    </>
  );
};

// Separate InfoCard component for reuse
const InfoCard = ({ organization }: { organization: Organization }) => {
  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  return (
    <div className="sticky top-24 bg-card border border-border rounded-2xl p-6 space-y-4 shadow-lg">
      {/* Location */}
      {organization.address && (
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <a
            href={getGoogleMapsUrl(organization.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary hover:underline transition-colors"
          >
            {organization.address}
          </a>
        </div>
      )}

      {/* Website */}
      {organization.website && (
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <a
            href={organization.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            {organization.website.replace(/^https?:\/\//, '')}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Email */}
      {organization.email && (
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <a
            href={`mailto:${organization.email}`}
            className="text-primary hover:underline"
          >
            {organization.email}
          </a>
        </div>
      )}

      {/* Phone */}
      {organization.phone && (
        <div className="flex items-start gap-3">
          <Phone className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <a
            href={`tel:${organization.phone}`}
            className="text-primary hover:underline"
          >
            {organization.phone}
          </a>
        </div>
      )}

      {/* Employee Count */}
      {organization.employee_count && (
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-foreground">{organization.employee_count} employés</p>
        </div>
      )}

      {/* Sector */}
      {organization.sector && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">Secteur</p>
          <p className="font-medium text-foreground">{organization.sector}</p>
        </div>
      )}

      {/* Social Links */}
      {(organization.linkedin_url || organization.instagram_url || organization.twitter_url) && (
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Réseaux sociaux</p>
          <div className="flex gap-3">
            {organization.linkedin_url && (
              <a
                href={organization.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                LinkedIn
              </a>
            )}
            {organization.instagram_url && (
              <a
                href={organization.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Instagram
              </a>
            )}
            {organization.twitter_url && (
              <a
                href={organization.twitter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Twitter
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationPublic;
