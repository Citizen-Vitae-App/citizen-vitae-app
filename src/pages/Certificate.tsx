import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { CertificateData } from '@/types/certificate';
import { CertificatePreview } from '@/components/certificate/CertificatePreview';
import { ShareCertificateDialog } from '@/components/ShareCertificateDialog';
import { downloadCertificatePDF } from '@/components/CertificatePDF';
import logo from '@/assets/logo.svg';

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

const Certificate = () => {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      if (!certificateId) {
        setError('ID de certificat manquant');
        setIsLoading(false);
        return;
      }

      try {
        // SECURITY: Use the secure public_certificates view that only exposes safe fields
        const { data, error: fetchError } = await supabase
          .from('public_certificates')
          .select('certificate_data, event_id')
          .eq('certificate_id', certificateId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching certificate:', fetchError);
          setError('Erreur lors du chargement du certificat');
          setIsLoading(false);
          return;
        }

        if (!data || !data.certificate_data) {
          setError('Certificat non trouvé');
          setIsLoading(false);
          return;
        }

        const dbData = data.certificate_data as unknown as CertificateDataFromDB;
        setEventId(data.event_id);

        // Transform DB data to CertificateData format
        const transformedData: CertificateData = {
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
          isSelfCertified: dbData.isSelfCertified
        };
        setCertificateData(transformedData);
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('Une erreur inattendue est survenue');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificate();
  }, [certificateId]);

  const handleDownload = async () => {
    if (!certificateData) return;
    
    setIsDownloading(true);
    try {
      const filename = `certificat-${certificateData.eventName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      await downloadCertificatePDF(certificateData, filename);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const getCertificateShareUrl = () => {
    return `${window.location.origin}/certificate/${certificateId}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-3">
                <img src={logo} alt="CitizenVitae" className="h-8" width="203" height="32" />
              </Link>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6 mx-auto" />
          <Skeleton className="w-full max-w-5xl mx-auto" style={{ aspectRatio: '297/210' }} />
        </main>
      </div>
    );
  }

  if (error || !certificateData) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-3">
                <img src={logo} alt="CitizenVitae" className="h-8" width="203" height="32" />
              </Link>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {error || 'Certificat non trouvé'}
          </h1>
          <p className="text-muted-foreground mb-6">
            Ce certificat n'existe pas ou n'est plus disponible.
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - hide desktop buttons on mobile */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link to="/" className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </Link>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Télécharger PDF
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Certificate Preview - Fully visible on mobile */}
        <div className="w-full max-w-5xl mx-auto">
          <div className="border border-border overflow-hidden shadow-xl">
            <CertificatePreview ref={certificateRef} data={certificateData} />
          </div>
          
          {/* Mobile action buttons - taller for touch */}
          <div className="mt-4 sm:mt-6 flex flex-col gap-3 md:hidden">
            <Button className="w-full h-14 text-base" onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Download className="h-5 w-5 mr-2" />
              )}
              Télécharger le PDF
            </Button>
            <Button variant="outline" className="w-full h-14 text-base" onClick={() => setShareOpen(true)}>
              <Share2 className="h-5 w-5 mr-2" />
              Partager
            </Button>
          </div>
        </div>

        {/* Link to event */}
        {eventId && (
          <div className="text-center mt-6">
            <Link to={`/events/${eventId}`} className="text-primary underline text-sm hover:text-primary/80">
              Voir les détails de l'événement
            </Link>
          </div>
        )}
      </main>

      <ShareCertificateDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        certificateUrl={getCertificateShareUrl()}
        eventName={certificateData.eventName}
        organizationName={certificateData.organizationName}
      />
    </div>
  );
};

export default Certificate;
