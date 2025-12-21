import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import logo from '@/assets/logo.png';
import defaultCover from '@/assets/default-event-cover.jpg';
import { MissionCertificationButton } from '@/components/MissionCertificationButton';
import { FaceMatchVerification } from '@/components/FaceMatchVerification';

interface RegistrationWithEvent {
  id: string;
  status: string;
  attended_at: string | null;
  face_match_passed: boolean | null;
  qr_token: string | null;
  event_id: string;
  events: {
    id: string;
    name: string;
    location: string;
    start_date: string;
    end_date: string;
    cover_image_url: string | null;
    latitude: number | null;
    longitude: number | null;
    organizations: {
      name: string;
    };
  };
}

const MyMissions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFaceMatch, setShowFaceMatch] = useState(false);
  const [selectedEventForFaceMatch, setSelectedEventForFaceMatch] = useState<RegistrationWithEvent | null>(null);

  useEffect(() => {
    const fetchRegistrations = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          status,
          attended_at,
          face_match_passed,
          qr_token,
          event_id,
          events!inner (
            id,
            name,
            location,
            start_date,
            end_date,
            cover_image_url,
            latitude,
            longitude,
            organizations!inner (name)
          )
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching registrations:', error);
      } else {
        setRegistrations(data as unknown as RegistrationWithEvent[]);
      }
      setIsLoading(false);
    };

    fetchRegistrations();
  }, [user]);

  const now = new Date();

  // À venir: events that haven't ended yet, sorted by start_date ascending (closest first)
  const upcomingEvents = registrations
    .filter((r) => isBefore(now, parseISO(r.events.end_date)))
    .sort((a, b) => parseISO(a.events.start_date).getTime() - parseISO(b.events.start_date).getTime());

  // Certificats: past events where user attended (scanned ticket)
  const completedEvents = registrations.filter(
    (r) => !isBefore(now, parseISO(r.events.end_date)) && r.attended_at !== null
  );

  // Annulations: past events where user didn't attend (no scan)
  const cancelledEvents = registrations.filter(
    (r) => !isBefore(now, parseISO(r.events.end_date)) && r.attended_at === null
  );

  const handleCertificationClick = (registration: RegistrationWithEvent) => {
    setSelectedEventForFaceMatch(registration);
    setShowFaceMatch(true);
  };

  const handleFaceMatchComplete = () => {
    setShowFaceMatch(false);
    setSelectedEventForFaceMatch(null);
    // Refresh registrations to get updated data
    window.location.reload();
  };

  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    const dayName = format(date, 'EEE', { locale: fr });
    const dayMonth = format(date, 'dd MMM', { locale: fr });
    const time = format(date, 'HH:mm', { locale: fr });
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}. ${dayMonth}. • ${time}`;
  };

  const renderUpcomingCard = (registration: RegistrationWithEvent) => {
    const event = registration.events;
    return (
      <div 
        key={registration.id} 
        className="border border-border rounded-xl overflow-hidden cursor-pointer"
        onClick={() => navigate(`/events/${event.id}`)}
      >
        <div className="aspect-[16/9] w-full overflow-hidden">
          <img
            src={event.cover_image_url || defaultCover}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div onClick={() => navigate(`/events/${event.id}`)} className="cursor-pointer">
            <h3 className="font-semibold text-lg text-foreground truncate">{event.name}</h3>
            <p className="text-muted-foreground text-sm">{formatEventDate(event.start_date)}</p>
          </div>
          <MissionCertificationButton
            eventStartDate={event.start_date}
            eventEndDate={event.end_date}
            eventLatitude={event.latitude}
            eventLongitude={event.longitude}
            onClick={() => handleCertificationClick(registration)}
          />
        </div>
      </div>
    );
  };

  const renderCompactCard = (registration: RegistrationWithEvent) => {
    const event = registration.events;
    return (
      <div 
        key={registration.id} 
        className="flex items-center gap-4 border border-border rounded-xl p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => navigate(`/events/${event.id}`)}
      >
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{event.name}</h3>
          <p className="text-muted-foreground text-sm">{formatEventDate(event.start_date)}</p>
        </div>
        <div className="w-24 h-20 flex-shrink-0 rounded-lg overflow-hidden">
          <img
            src={event.cover_image_url || defaultCover}
            alt={event.name}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  };

  const renderEmptyState = (message: string) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-lg font-semibold text-foreground mb-2">
        {message}
      </h2>
      <Link 
        to="/" 
        className="text-primary hover:underline font-medium"
      >
        Découvrir les missions
      </Link>
    </div>
  );

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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Mes Missions</h1>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border rounded-none h-auto p-0 mb-6">
            <TabsTrigger 
              value="upcoming" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent bg-transparent px-4 py-2 text-muted-foreground data-[state=active]:text-foreground"
            >
              À venir
            </TabsTrigger>
            <TabsTrigger 
              value="certificates" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent bg-transparent px-4 py-2 text-muted-foreground data-[state=active]:text-foreground"
            >
              Certificats
            </TabsTrigger>
            <TabsTrigger 
              value="cancelled" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent bg-transparent px-4 py-2 text-muted-foreground data-[state=active]:text-foreground"
            >
              Annulations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-0">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : upcomingEvents.length === 0 ? (
              renderEmptyState("Aucune mission à venir")
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map(renderUpcomingCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="certificates" className="mt-0">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : completedEvents.length === 0 ? (
              renderEmptyState("Aucun certificat disponible")
            ) : (
              <div className="space-y-3">
                {completedEvents.map(renderCompactCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-0">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : cancelledEvents.length === 0 ? (
              renderEmptyState("Aucune annulation")
            ) : (
              <div className="space-y-3">
                {cancelledEvents.map(renderCompactCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* Bottom padding for mobile nav */}
      <div className="h-16 md:hidden" />

      {/* Face Match Verification Modal */}
      {showFaceMatch && selectedEventForFaceMatch && user && (
        <FaceMatchVerification
          isOpen={showFaceMatch}
          eventId={selectedEventForFaceMatch.event_id}
          userId={user.id}
          registrationId={selectedEventForFaceMatch.id}
          eventName={selectedEventForFaceMatch.events.name}
          eventDate={selectedEventForFaceMatch.events.start_date}
          existingQrToken={selectedEventForFaceMatch.qr_token}
          onSuccess={handleFaceMatchComplete}
          onClose={() => {
            setShowFaceMatch(false);
            setSelectedEventForFaceMatch(null);
          }}
        />
      )}
    </div>
  );
};

export default MyMissions;
