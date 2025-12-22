import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, FileText, Share2, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShareCertificateDialog } from './ShareCertificateDialog';
import { CertificateViewerDialog } from './CertificateViewerDialog';
import { CertificateData } from './CertificatePDF';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import defaultCover from '@/assets/default-event-cover.jpg';

interface CertificateCardProps {
  registration: {
    id: string;
    status: string;
    attended_at: string | null;
    certificate_url: string | null;
    validated_by: string | null;
    events: {
      id: string;
      name: string;
      location: string;
      start_date: string;
      end_date: string;
      cover_image_url: string | null;
      organizations: {
        name: string;
        logo_url: string | null;
      };
    };
  };
}

export function CertificateCard({ registration }: CertificateCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const event = registration.events;
  const organization = event.organizations;
  const isSelfCertified = registration.status === 'self_certified' || !registration.validated_by;

  const formatEventDate = () => {
    const start = parseISO(event.start_date);
    return format(start, "EEEE d MMMM yyyy", { locale: fr });
  };

  const formatEventTime = () => {
    const start = parseISO(event.start_date);
    const end = parseISO(event.end_date);
    return `${format(start, "HH'h'mm", { locale: fr })} - ${format(end, "HH'h'mm", { locale: fr })}`;
  };

  const formatEventStartTime = () => {
    const start = parseISO(event.start_date);
    return format(start, "HH'h'mm", { locale: fr });
  };

  const formatEventEndTime = () => {
    const end = parseISO(event.end_date);
    return format(end, "HH'h'mm", { locale: fr });
  };

  const handleViewCertificate = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch user profile for date of birth
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, date_of_birth')
        .eq('id', user.id)
        .single();

      // Get validator info if exists
      let validatorName = 'Auto-certifié';
      let validatorRole = '';
      
      if (registration.validated_by) {
        const { data: validator } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', registration.validated_by)
          .single();
        
        if (validator) {
          validatorName = `${validator.first_name || ''} ${validator.last_name || ''}`.trim() || 'Responsable';
        }

        // Get validator's custom role
        const { data: eventData } = await supabase
          .from('events')
          .select('organization_id')
          .eq('id', event.id)
          .single();

        if (eventData) {
          const { data: membership } = await supabase
            .from('organization_members')
            .select('custom_role_title, role')
            .eq('user_id', registration.validated_by)
            .eq('organization_id', eventData.organization_id)
            .single();

          if (membership) {
            validatorRole = membership.custom_role_title || (membership.role === 'admin' ? 'Administrateur' : 'Membre');
          }
        }
      }

      const formatDateOfBirth = (dob: string | null) => {
        if (!dob) return 'Non renseignée';
        return format(parseISO(dob), 'd MMMM yyyy', { locale: fr });
      };

      const data: CertificateData = {
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        dateOfBirth: formatDateOfBirth(profile?.date_of_birth),
        eventName: event.name,
        organizationName: organization.name,
        organizationLogoUrl: organization.logo_url,
        eventDate: formatEventDate(),
        eventStartTime: formatEventStartTime(),
        eventEndTime: formatEventEndTime(),
        eventLocation: event.location,
        validatorName,
        validatorRole,
        isSelfCertified,
      };

      setCertificateData(data);
      setViewerOpen(true);
    } catch (error) {
      console.error('Error loading certificate data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCertificateShareUrl = () => {
    return `${window.location.origin}/events/${event.id}`;
  };

  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        {/* Header with cover image */}
        <div className="relative h-24 overflow-hidden">
          <img
            src={event.cover_image_url || defaultCover}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          
          {/* Certification badge */}
          <div className="absolute top-3 right-3">
            <Badge 
              variant="secondary"
              className={`${
                isSelfCertified 
                  ? 'bg-emerald-500/90 text-white border-0' 
                  : 'bg-primary/90 text-white border-0'
              }`}
            >
              {isSelfCertified ? (
                <>
                  <Shield className="h-3 w-3 mr-1" />
                  Auto-certifié
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Certifié
                </>
              )}
            </Badge>
          </div>
          
          {/* Organization logo */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <Avatar className="h-8 w-8 border-2 border-white">
              <AvatarImage src={organization.logo_url || undefined} />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                {organization.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-white text-sm font-medium drop-shadow-md">
              {organization.name}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <h3 
            className="font-semibold text-lg text-foreground line-clamp-2 cursor-pointer hover:underline"
            onClick={() => navigate(`/events/${event.id}`)}
          >
            {event.name}
          </h3>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="capitalize">{formatEventDate()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>{formatEventTime()}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1"
              onClick={handleViewCertificate}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Voir le certificat
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <ShareCertificateDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        certificateUrl={getCertificateShareUrl()}
        eventName={event.name}
        organizationName={organization.name}
      />

      {certificateData && (
        <CertificateViewerDialog
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          certificateData={certificateData}
        />
      )}
    </>
  );
}
