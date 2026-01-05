import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Heart, Share2, MapPin, Calendar, Clock, ArrowLeft, Building2, Check, Loader2, X } from 'lucide-react';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { ShareDialog } from '@/components/ShareDialog';
import { CertificationCard } from '@/components/CertificationCard';
import { CertificationButton } from '@/components/CertificationButton';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import EventMap from '@/components/EventMap';
import mapMarkerIcon from '@/assets/map-marker.svg';
import logo from '@/assets/logo.png';
import defaultCover from '@/assets/default-event-cover.jpg';
import { useEventRegistration } from '@/hooks/useEventRegistration';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';
import { FaceMatchVerification } from '@/components/FaceMatchVerification';
import { SelfCertificationFlow } from '@/components/SelfCertificationFlow';
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
  organization_id: string;
  allow_self_certification: boolean | null;
  organizations: {
    id: string;
    name: string;
    logo_url: string | null;
    description: string | null;
  };
}
const EventDetail = () => {
  const {
    eventId
  } = useParams<{
    eventId: string;
  }>();
  const navigate = useNavigate();
  const {
    user,
    profile
  } = useAuth();
  const {
    isFavorite,
    toggleFavorite
  } = useFavorites();
  const [event, setEvent] = useState<EventWithOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUnregisterDialogOpen, setIsUnregisterDialogOpen] = useState(false);
  const [showFaceMatch, setShowFaceMatch] = useState(false);
  const [showSelfCertification, setShowSelfCertification] = useState(false);
  const isLiked = eventId ? isFavorite(eventId) : false;
  const handleLikeClick = async () => {
    if (!eventId) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    await toggleFavorite(eventId);
  };
  const {
    isRegistered,
    registration,
    isRegistering,
    isUnregistering,
    isAnimating,
    register,
    unregister,
    canUnregister
  } = useEventRegistration(eventId);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [eventId]);
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      const {
        data,
        error
      } = await supabase.from('events').select(`
          *,
          organizations!inner (
            id,
            name,
            logo_url,
            description
          )
        `).eq('id', eventId).eq('is_public', true).maybeSingle();
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
    return format(parseISO(dateString), "EEEE d MMMM yyyy", {
      locale: fr
    });
  };
  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), "HH'h'mm", {
      locale: fr
    });
  };
  const handleShare = () => {
    setIsShareOpen(true);
  };
  if (isLoading) {
    return <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="w-full h-[400px] rounded-xl mb-8" />
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
      </div>;
  }
  if (!event) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Événement introuvable</h1>
          <Link to="/">
            <Button>Retour à l'accueil</Button>
          </Link>
        </div>
      </div>;
  }

  // Format date range for mobile (e.g., "9-11 dec.")
  const formatMobileDateRange = () => {
    const startDate = parseISO(event.start_date);
    const endDate = parseISO(event.end_date);
    const startDay = format(startDate, 'd', {
      locale: fr
    });
    const endDay = format(endDate, 'd', {
      locale: fr
    });
    const month = format(endDate, 'MMM', {
      locale: fr
    }).replace('.', '');
    if (startDay === endDay) {
      return `${startDay} ${month}.`;
    }
    return `${startDay}-${endDay} ${month}.`;
  };
  const handleRegister = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    register(event.name, event.organization_id, profile?.id_verified);
  };
  const handleUnregister = () => {
    setIsUnregisterDialogOpen(true);
  };
  const confirmUnregister = () => {
    setIsUnregisterDialogOpen(false);
    unregister(event.end_date);
  };
  const canUserUnregister = canUnregister(event.end_date);

  // Render CTA button based on registration state
  const renderCTAButton = (isMobile: boolean = false) => {
    const baseClasses = isMobile ? "h-11 px-8 font-semibold transition-all duration-300" : "w-full h-12 text-lg font-semibold transition-all duration-300";
    if (isRegistered) {
      return <Button onClick={handleUnregister} disabled={isUnregistering || !canUserUnregister} variant="outline" className={cn(baseClasses, "border-destructive text-destructive hover:bg-destructive/10", !canUserUnregister && "opacity-50 cursor-not-allowed")}>
          {isUnregistering ? <Loader2 className="h-5 w-5 animate-spin" /> : <>
              <X className="h-5 w-5 mr-2" />
              Me désinscrire
            </>}
        </Button>;
    }
    return <Button onClick={handleRegister} disabled={isRegistering} className={cn(baseClasses, isRegistering && "bg-muted text-muted-foreground cursor-wait", isAnimating && "bg-green-600 hover:bg-green-600")} style={{
      backgroundColor: isRegistering ? undefined : isAnimating ? undefined : '#012573'
    }}>
        {isRegistering ? <Loader2 className="h-5 w-5 animate-spin" /> : isAnimating ? <>
            <Check className="h-5 w-5 mr-2 animate-bounce" />
            Inscrit !
          </> : "Je m'engage"}
      </Button>;
  };
  return <div className="min-h-screen bg-background pb-24 lg:pb-0">
      {/* Navigation - Desktop only shows logo/notifications, Mobile shows back button only */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border lg:block hidden">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 text-foreground" />
              <img src={logo} alt="CitizenVitae" className="h-8" />
            </Link>
            {user && <NotificationDropdown />}
          </div>
        </div>
      </nav>

      {/* Cover Image - Full width on mobile, with padding on desktop */}
      <div className="lg:container lg:mx-auto lg:px-4 lg:py-6">
        {/* Back button overlay on mobile */}
        <div className="absolute top-4 left-4 z-10 lg:hidden">
          <Link to="/" className="flex items-center justify-center w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full">
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
        </div>
        <div className="relative w-full h-[350px] lg:h-[500px] lg:rounded-xl overflow-hidden">
          <img src={event.cover_image_url || defaultCover} alt={event.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Action buttons on cover */}
          <div className="absolute bottom-6 right-6 flex items-center gap-3">
            <button onClick={handleLikeClick} className="p-3 bg-background/90 backdrop-blur-sm hover:bg-background transition-colors rounded-full opacity-75">
              <Heart className={`h-5 w-5 ${isLiked ? 'fill-destructive text-destructive' : 'text-foreground'}`} />
            </button>
            <button onClick={handleShare} className="p-3 bg-background/90 backdrop-blur-sm hover:bg-background transition-colors rounded-full opacity-75">
              <Share2 className="h-5 w-5 text-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Title, Organizer, Description with Sidebar */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Event Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Title */}
            <div>
              <h1 className="lg:text-4xl text-foreground mb-4 text-xl font-semibold">
                {event.name}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{event.location}</span>
              </div>
            </div>

            {/* Organizer - Simple aligned style */}
            <Link to={`/organization/${event.organizations.id}`} className="flex items-center gap-4 group">
              <Avatar className="h-12 w-12">
                <AvatarImage src={event.organizations.logo_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Building2 className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-muted-foreground">Organisé par</p>
                <p className="font-semibold text-foreground group-hover:underline">{event.organizations.name}</p>
              </div>
            </Link>

            {/* Description */}
            {event.description && <div>
                <h2 className="text-foreground mb-4 text-lg font-medium">À propos de l'événement</h2>
                <div className="text-muted-foreground leading-relaxed prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0" dangerouslySetInnerHTML={{
              __html: sanitizeHtml(event.description)
            }} />
              </div>}
          </div>

          {/* Right Column - Sticky Booking Card (hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 bg-card border border-border rounded-lg p-6 space-y-6">
              {/* Date & Time */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-semibold text-foreground capitalize">
                      {formatDate(event.start_date)}
                    </p>
                    {formatDate(event.start_date) !== formatDate(event.end_date) && <p className="text-sm text-muted-foreground">
                        au {formatDate(event.end_date)}
                      </p>}
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

              {/* CTA Button or Certification Card */}
              {isRegistered ? <>
                  <CertificationCard eventStartDate={event.start_date} eventEndDate={event.end_date} eventLatitude={event.latitude} eventLongitude={event.longitude} eventName={event.name} eventId={event.id} userId={user?.id || ''} registrationId={registration?.id || ''} organizationId={event.organization_id} faceMatchPassed={registration?.face_match_passed} qrToken={registration?.qr_token} attendedAt={registration?.attended_at} allowSelfCertification={event.allow_self_certification} registrationStatus={registration?.status} />
                  <Button onClick={handleUnregister} disabled={isUnregistering || !canUserUnregister} variant="outline" className={cn("w-full h-12 text-lg font-semibold transition-all duration-300", "border-destructive text-destructive hover:bg-destructive/10", !canUserUnregister && "opacity-50 cursor-not-allowed")}>
                    {isUnregistering ? <Loader2 className="h-5 w-5 animate-spin" /> : <>
                        <X className="h-5 w-5 mr-2" />
                        Me désinscrire
                      </>}
                  </Button>
                  {!canUserUnregister && <p className="text-xs text-muted-foreground text-center">
                      Désinscription impossible moins de 24h avant la fin de l'événement
                    </p>}
                </> : renderCTAButton()}

              {/* Conditions */}
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-foreground mb-3">Conditions de participation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  En vous inscrivant, vous vous engagez à participer.
En cas d’empêchement, merci de vous désinscrire au plus tôt.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section - Full Width */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-foreground mb-4 text-lg font-medium">Où se situe l'événement</h2>
        <p className="text-muted-foreground mb-4">{event.location}</p>
        {event.latitude && event.longitude ? <EventMap lat={event.latitude} lng={event.longitude} zoom={14} iconUrl={mapMarkerIcon} /> : <div className="h-[300px] bg-muted/30 rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Carte non disponible</p>
          </div>}
      </div>

      {/* Mobile Fixed Bottom Bar - Enhanced UI */}
      {isRegistered ? <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background border-t border-border px-4 py-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-3">
            <CertificationButton eventStartDate={event.start_date} eventEndDate={event.end_date} eventLatitude={event.latitude} eventLongitude={event.longitude} onClick={() => {
          if (event.allow_self_certification) {
            setShowSelfCertification(true);
          } else {
            setShowFaceMatch(true);
          }
        }} disabled={registration?.status === 'self_certified' || !!registration?.attended_at} />
            <Button onClick={handleUnregister} disabled={isUnregistering || !canUserUnregister} variant="outline" className={cn("w-full h-12 font-semibold", "border-destructive text-destructive hover:bg-destructive/10", !canUserUnregister && "opacity-50 cursor-not-allowed")}>
              {isUnregistering ? <Loader2 className="h-5 w-5 animate-spin" /> : <>
                  <X className="h-5 w-5 mr-2" />
                  Me désinscrire
                </>}
            </Button>
          </div>
        </div> : <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-background border-t border-border px-4 py-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <Button onClick={handleRegister} disabled={isRegistering} className={cn("w-full h-14 text-lg font-semibold transition-all duration-300 rounded-2xl", isRegistering && "bg-muted text-muted-foreground cursor-wait", isAnimating && "bg-green-600 hover:bg-green-600")} style={{
                backgroundColor: isRegistering ? undefined : isAnimating ? undefined : '#012573'
              }}>
                {isRegistering ? <Loader2 className="h-5 w-5 animate-spin" /> : isAnimating ? <>
                    <Check className="h-5 w-5 mr-2 animate-bounce" />
                    Inscrit !
                  </> : "Je m'engage"}
              </Button>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right shrink-0">
              <div className="flex items-center gap-1.5 text-foreground">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{formatMobileDateRange()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{formatTime(event.start_date)}</span>
              </div>
            </div>
          </div>
        </div>}

      {/* Face Match Dialog for mobile */}
      <FaceMatchVerification isOpen={showFaceMatch} onClose={() => setShowFaceMatch(false)} userId={user?.id || ''} eventId={event.id} registrationId={registration?.id || ''} eventName={event.name} eventDate={`${format(parseISO(event.start_date), "d MMMM yyyy 'à' HH:mm", {
      locale: fr
    })}`} existingQrToken={registration?.qr_token} onSuccess={() => setShowFaceMatch(false)} />

      {/* Self Certification Dialog */}
      <SelfCertificationFlow isOpen={showSelfCertification} onClose={() => setShowSelfCertification(false)} userId={user?.id || ''} eventId={event.id} registrationId={registration?.id || ''} eventName={event.name} eventStartDate={event.start_date} eventEndDate={event.end_date} organizationId={event.organization_id} onSuccess={() => setShowSelfCertification(false)} />

      {/* Share Dialog */}
      <ShareDialog open={isShareOpen} onOpenChange={setIsShareOpen} url={window.location.href} title={event.name} />

      {/* Unregister Confirmation Dialog */}
      <AlertDialog open={isUnregisterDialogOpen} onOpenChange={setIsUnregisterDialogOpen}>
        <AlertDialogContent className="max-w-sm rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center">Confirmer la désinscription</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Si vous annulez, vous n'aurez plus accès aux mises à jour et aux activités de l'événement. Souhaitez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:justify-center">
            <AlertDialogCancel className="flex-1 m-0 text-primary hover:text-primary font-semibold">
              Non
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnregister} className="flex-1 m-0 bg-transparent text-destructive hover:bg-destructive/10 font-semibold">
              Oui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default EventDetail;