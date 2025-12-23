import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { CertificateData, CertificatePDFDocument, downloadCertificatePDF } from '@/components/CertificatePDF';
import { ShareCertificateDialog } from '@/components/ShareCertificateDialog';
import { PDFViewer } from '@react-pdf/renderer';
import { useIsMobile } from '@/hooks/use-mobile';
import logo from '@/assets/logo.png';

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
  const isMobile = useIsMobile();
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchCertificate = async () => {
      if (!certificateId) {
        setError('ID de certificat manquant');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('event_registrations')
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
          isSelfCertified: dbData.isSelfCertified,
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
      await downloadCertificatePDF(certificateData);
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
                <img src={logo} alt="CitizenVitae" className="h-8" />
              </Link>
            </div>
          </div>
        </nav>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="w-full aspect-[1.414/1] max-w-4xl mx-auto" />
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
                <img src={logo} alt="CitizenVitae" className="h-8" />
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
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 text-foreground" />
              <img src={logo} alt="CitizenVitae" className="h-8" />
            </Link>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
              <Button 
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
              >
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

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
          Certificat d'action citoyenne
        </h1>

        {/* PDF Preview */}
        <div className="max-w-5xl mx-auto">
          {!isMobile ? (
            <div className="w-full aspect-[1.414/1] border border-border rounded-lg overflow-hidden shadow-lg">
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                <CertificatePDFDocument data={certificateData} />
              </PDFViewer>
            </div>
          ) : (
            /* Mobile: Show summary card */
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Attribué à</p>
                <h2 className="text-2xl font-bold text-primary">
                  {certificateData.firstName} {certificateData.lastName}
                </h2>
              </div>
              
              <div className="border-t border-border pt-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Événement</p>
                  <p className="font-medium text-foreground">{certificateData.eventName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Organisation</p>
                  <p className="font-medium text-foreground">{certificateData.organizationName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium text-foreground capitalize">{certificateData.eventDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lieu</p>
                  <p className="font-medium text-foreground">{certificateData.eventLocation}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Validé par</p>
                  <p className="font-medium text-foreground">{certificateData.validatorName}</p>
                  {certificateData.validatorRole && (
                    <p className="text-sm text-muted-foreground">{certificateData.validatorRole}</p>
                  )}
                </div>
              </div>

              <Button 
                className="w-full mt-4" 
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Télécharger le PDF complet
              </Button>
            </div>
          )}
        </div>

        {/* Link to event */}
        {eventId && (
          <div className="text-center mt-6">
            <Link 
              to={`/events/${eventId}`}
              className="text-primary hover:underline text-sm"
            >
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
