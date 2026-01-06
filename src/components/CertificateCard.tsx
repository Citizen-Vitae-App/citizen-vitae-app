import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, FileText, Share2, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShareCertificateDialog } from './ShareCertificateDialog';
import { CertificateViewerDialog } from './CertificateViewerDialog';
import { CertificateData } from './CertificatePDF';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import defaultCover from '@/assets/default-event-cover.jpg';

interface CertificateDataFromDB {
  user: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
  event: {
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
  };
  organization: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  validator: {
    name: string;
    role: string;
  };
  certifiedAt: string;
  isSelfCertified: boolean;
}

interface CertificateCardProps {
  registration: {
    id: string;
    status: string;
    attended_at: string | null;
    certificate_url: string | null;
    certificate_id: string | null;
    certificate_data: CertificateDataFromDB | null;
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
  const [shareOpen, setShareOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  
  const event = registration.events;
  const organization = event.organizations;
  const isSelfCertified = registration.status === 'self_certified' || !registration.validated_by;
  const hasCertificateData = registration.certificate_data !== null;

  const formatEventDate = () => {
    const start = parseISO(event.start_date);
    return format(start, "EEEE d MMMM yyyy", { locale: fr });
  };

  const formatEventTime = () => {
    const start = parseISO(event.start_date);
    const end = parseISO(event.end_date);
    return `${format(start, "HH'h'mm", { locale: fr })} - ${format(end, "HH'h'mm", { locale: fr })}`;
  };

  // Transform DB data to CertificateData format for the viewer
  const getCertificateData = (): CertificateData | null => {
    if (!registration.certificate_data) return null;
    
    const dbData = registration.certificate_data;
    return {
      firstName: dbData.user.firstName,
      lastName: dbData.user.lastName,
      dateOfBirth: dbData.user.dateOfBirth,
      eventName: dbData.event.name,
      organizationName: dbData.organization.name,
      organizationLogoUrl: dbData.organization.logoUrl,
      eventDate: dbData.event.date,
      eventStartTime: dbData.event.startTime,
      eventEndTime: dbData.event.endTime,
      eventLocation: dbData.event.location,
      validatorName: dbData.validator.name,
      validatorRole: dbData.validator.role,
      isSelfCertified: dbData.isSelfCertified,
    };
  };

  const handleViewCertificate = () => {
    if (registration.certificate_id) {
      // Navigate to public certificate page
      navigate(`/certificate/${registration.certificate_id}`);
    } else if (hasCertificateData) {
      // Fallback: open viewer dialog with local data
      setViewerOpen(true);
    }
  };

  const getCertificateShareUrl = () => {
    if (registration.certificate_id) {
      return `${window.location.origin}/certificate/${registration.certificate_id}`;
    }
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
              disabled={!hasCertificateData && !registration.certificate_id}
            >
              <FileText className="h-4 w-4 mr-2" />
              Voir le certificat
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShareOpen(true)}
              disabled={!hasCertificateData && !registration.certificate_id}
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

      {/* Fallback viewer for old certificates without certificate_id */}
      {hasCertificateData && !registration.certificate_id && (
        <CertificateViewerDialog
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          certificateData={getCertificateData()!}
        />
      )}
    </>
  );
}
