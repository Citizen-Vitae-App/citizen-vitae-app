import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, CheckCircle } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { PageTransition } from '@/components/PageTransition';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { MainNavbar } from '@/components/MainNavbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';
import defaultCover from '@/assets/default-event-cover.jpg';
import { MissionCertificationButton } from '@/components/MissionCertificationButton';
import { FaceMatchVerification } from '@/components/FaceMatchVerification';
import { SelfCertificationFlow } from '@/components/SelfCertificationFlow';
import { CertificateCard } from '@/components/CertificateCard';
import { useMyMissions, type RegistrationWithEvent } from '@/hooks/useMyMissions';
import { useFavoriteMissions, type FavoriteWithEvent } from '@/hooks/useFavoriteMissions';
const MyMissions = () => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'upcoming';
  const { data: registrations = [], isLoading } = useMyMissions();
  const { data: favoriteMissions = [], isLoading: isLoadingFavorites } = useFavoriteMissions();
  const [showFaceMatch, setShowFaceMatch] = useState(false);
  const [showSelfCertification, setShowSelfCertification] = useState(false);
  const [selectedEventForFaceMatch, setSelectedEventForFaceMatch] = useState<RegistrationWithEvent | null>(null);
  const [selectedEventForSelfCert, setSelectedEventForSelfCert] = useState<RegistrationWithEvent | null>(null);
  const now = new Date();

  // À venir: events that haven't ended yet AND not yet certified
  const upcomingEvents = registrations.filter(r => isBefore(now, parseISO(r.events.end_date)) && r.status !== 'self_certified' && !r.attended_at).sort((a, b) => parseISO(a.events.start_date).getTime() - parseISO(b.events.start_date).getTime());

  // Certificats: events where user attended OR self-certified
  const completedEvents = registrations.filter(r => r.status === 'self_certified' || r.attended_at !== null).sort((a, b) => parseISO(b.events.start_date).getTime() - parseISO(a.events.start_date).getTime());

  // Annulations: past events where user didn't attend and didn't self-certify
  const cancelledEvents = registrations.filter(r => !isBefore(now, parseISO(r.events.end_date)) && r.attended_at === null && r.status !== 'self_certified');
  const handleCertificationClick = (registration: RegistrationWithEvent) => {
    // If event allows self-certification, use that flow instead
    if (registration.events.allow_self_certification) {
      setSelectedEventForSelfCert(registration);
      setShowSelfCertification(true);
    } else {
      setSelectedEventForFaceMatch(registration);
      setShowFaceMatch(true);
    }
  };
  const handleFaceMatchComplete = () => {
    setShowFaceMatch(false);
    setSelectedEventForFaceMatch(null);
    // Refresh registrations to get updated data
    window.location.reload();
  };
  const handleSelfCertificationComplete = () => {
    setShowSelfCertification(false);
    setSelectedEventForSelfCert(null);
    // Refresh registrations to get updated data
    window.location.reload();
  };
  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    const dayName = format(date, 'EEE', {
      locale: fr
    });
    const dayMonth = format(date, 'dd MMM', {
      locale: fr
    });
    const time = format(date, 'HH:mm', {
      locale: fr
    });
    return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}. ${dayMonth}. • ${time}`;
  };
  const renderUpcomingCard = (registration: RegistrationWithEvent) => {
    const event = registration.events;
    return <div key={registration.id} className="border border-border rounded-xl overflow-hidden cursor-pointer" onClick={() => navigate(`/events/${event.id}`)}>
        <div className="aspect-[16/9] w-full overflow-hidden">
          <img src={event.cover_image_url || defaultCover} alt={event.name} loading="lazy" className="w-full h-full object-cover" />
        </div>
        <div className="p-4 space-y-4 bg-white" onClick={e => e.stopPropagation()}>
          <div onClick={() => navigate(`/events/${event.id}`)} className="cursor-pointer">
            <h3 className="font-semibold text-lg text-foreground truncate">{event.name}</h3>
            <p className="text-muted-foreground text-sm">{formatEventDate(event.start_date)}</p>
          </div>
          <MissionCertificationButton eventStartDate={event.start_date} eventEndDate={event.end_date} eventLatitude={event.latitude} eventLongitude={event.longitude} allowSelfCertification={event.allow_self_certification || false} onClick={() => handleCertificationClick(registration)} disabled={registration.status === 'self_certified' || !!registration.attended_at} />
        </div>
      </div>;
  };
  const renderCompactCard = (registration: RegistrationWithEvent) => {
    const event = registration.events;
    return <div key={registration.id} className="flex items-center gap-4 border border-border rounded-xl p-3 cursor-pointer transition-colors bg-white" onClick={() => navigate(`/events/${event.id}`)}>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{event.name}</h3>
          <p className="text-muted-foreground text-sm">{formatEventDate(event.start_date)}</p>
        </div>
        <div className="w-24 h-20 flex-shrink-0 rounded-lg overflow-hidden">
          <img src={event.cover_image_url || defaultCover} alt={event.name} loading="lazy" className="w-full h-full object-cover" />
        </div>
      </div>;
  };
  const renderFavoriteCard = (row: FavoriteWithEvent) => {
    const event = row.events;
    return <div key={row.id} className="flex items-center gap-4 border border-border rounded-xl p-3 cursor-pointer transition-colors bg-white" onClick={() => navigate(`/events/${event.id}`)}Inner:
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{event.name}</h3>
          <p className="text-muted-foreground text-sm">{formatEventDate(event.start_date)}</p>
        </div>
        <div className="w-24 h-20 flex-shrink-0 rounded-lg overflow-hidden">
          <img src={event.cover_image_url || defaultCover} alt={event.name} loading="lazy" className="w-full h-full object-cover" />
        </div>
      </div>;
  };
  const renderEmptyState = (message: string, showCTA: boolean = true) => (
    <EmptyState
      icon="clipboard"
      title={message}
      description={showCTA ? "Découvrez et participez aux missions citoyennes près de chez vous" : undefined}
      ctaLabel={showCTA ? "Découvrir les missions" : undefined}
      ctaLink={showCTA ? "/" : undefined}
    />
  );

  const renderCancelledEmptyState = () => (
    <EmptyState
      icon="calendar"
      title="Aucune annulation"
    />
  );

  const renderFavoritesEmptyState = () => (
    <EmptyState
      icon="heart"
      title="Aucune mission en favoris"
      description="Like une mission depuis sa fiche pour la retrouver ici"
      ctaLabel="Découvrir les missions"
      ctaLink="/"
    />
  );
  return <div className="min-h-screen bg-background">
      {/* Navigation - Desktop only */}
      <MainNavbar />

      <main className="container mx-auto px-4 pt-6 md:pt-8 pb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Mes Missions</h1>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="w-full justify-start gap-0 flex-wrap sm:flex-nowrap bg-transparent border-b border-border rounded-none h-auto p-0 mb-6">
            <TabsTrigger value="upcoming" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent bg-transparent px-3 sm:px-4 py-2 text-sm sm:text-base text-muted-foreground data-[state=active]:text-foreground shrink-0">
              À venir
            </TabsTrigger>
            <TabsTrigger value="favorites" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent bg-transparent px-3 sm:px-4 py-2 text-sm sm:text-base text-muted-foreground data-[state=active]:text-foreground shrink-0">
              Favoris
            </TabsTrigger>
            <TabsTrigger value="certificates" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent bg-transparent px-3 sm:px-4 py-2 text-sm sm:text-base text-muted-foreground data-[state=active]:text-foreground shrink-0">
              Certificats
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent bg-transparent px-3 sm:px-4 py-2 text-sm sm:text-base text-muted-foreground data-[state=active]:text-foreground shrink-0">
              Annulations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-0">
            {isLoading ? <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-xl" />
              </div> : upcomingEvents.length === 0 ? renderEmptyState("Aucune mission à venir") : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingEvents.map(renderUpcomingCard)}
              </div>}
          </TabsContent>

          <TabsContent value="favorites" className="mt-0">
            {isLoadingFavorites ? <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div> : favoriteMissions.length === 0 ? renderFavoritesEmptyState() : <div className="space-y-3">
                {favoriteMissions.map(renderFavoriteCard)}
              </div>}
          </TabsContent>

          <TabsContent value="certificates" className="mt-0">
            {isLoading ? <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
              </div> : completedEvents.length === 0 ? renderEmptyState("Aucun certificat disponible") : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedEvents.map(registration => <CertificateCard key={registration.id} registration={registration} />)}
              </div>}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-0">
            {isLoading ? <div className="space-y-4">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div> : cancelledEvents.length === 0 ? renderCancelledEmptyState() : <div className="space-y-3">
                {cancelledEvents.map(renderCompactCard)}
              </div>}
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* Bottom padding for mobile nav */}
      <div className="h-16 md:hidden" />

      {/* Face Match Verification Modal */}
      {showFaceMatch && selectedEventForFaceMatch && user && <FaceMatchVerification isOpen={showFaceMatch} eventId={selectedEventForFaceMatch.event_id} userId={user.id} registrationId={selectedEventForFaceMatch.id} eventName={selectedEventForFaceMatch.events.name} eventDate={selectedEventForFaceMatch.events.start_date} existingQrToken={selectedEventForFaceMatch.qr_token} onSuccess={handleFaceMatchComplete} onClose={() => {
      setShowFaceMatch(false);
      setSelectedEventForFaceMatch(null);
    }} />}

      {/* Self Certification Modal */}
      {showSelfCertification && selectedEventForSelfCert && user && <SelfCertificationFlow isOpen={showSelfCertification} onClose={() => {
      setShowSelfCertification(false);
      setSelectedEventForSelfCert(null);
    }} userId={user.id} eventId={selectedEventForSelfCert.event_id} registrationId={selectedEventForSelfCert.id} eventName={selectedEventForSelfCert.events.name} eventStartDate={selectedEventForSelfCert.events.start_date} eventEndDate={selectedEventForSelfCert.events.end_date} organizationId={selectedEventForSelfCert.events.organization_id} organizationName={selectedEventForSelfCert.events.organizations?.name} organizationLogoUrl={selectedEventForSelfCert.events.organizations?.logo_url} onSuccess={handleSelfCertificationComplete} />}
    </div>;
};
export default MyMissions;