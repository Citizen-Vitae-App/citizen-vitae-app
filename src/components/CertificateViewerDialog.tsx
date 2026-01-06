import { useState } from 'react';
import { FileText, Download, Loader2, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { CertificateData } from '@/types/certificate';
import { downloadCertificatePDF } from './CertificatePDF';
import { PDFViewer } from '@react-pdf/renderer';
import { CertificatePDFDocument } from './CertificatePDF';
import { toast } from 'sonner';

interface CertificateViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateData: CertificateData;
}

export function CertificateViewerDialog({
  open,
  onOpenChange,
  certificateData,
}: CertificateViewerDialogProps) {
  const isMobile = useIsMobile();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadCertificatePDF(certificateData);
      toast.success('Certificat téléchargé !');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  const ViewerContent = () => (
    <div className="flex flex-col h-full">
      {/* PDF Preview - only on desktop */}
      {!isMobile && (
        <div className="flex-1 min-h-[400px] border border-border rounded-lg overflow-hidden bg-muted/30">
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            <CertificatePDFDocument data={certificateData} />
          </PDFViewer>
        </div>
      )}

      {/* Mobile: Show summary instead of preview */}
      {isMobile && (
        <div className="flex-1 p-4 space-y-4">
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Certificat prêt</h3>
                <p className="text-sm text-muted-foreground">Format PDF</p>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Participant</span>
                <span className="font-medium">{certificateData.firstName} {certificateData.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mission</span>
                <span className="font-medium truncate max-w-[180px]">{certificateData.eventName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Organisation</span>
                <span className="font-medium">{certificateData.organizationName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{certificateData.eventDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{certificateData.isSelfCertified ? 'Auto-certifié' : 'Certifié manuellement'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download button */}
      <div className="p-4 border-t border-border">
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          className="w-full"
          size="lg"
        >
          {isDownloading ? (
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
          ) : (
            <Download className="h-5 w-5 mr-2" />
          )}
          Télécharger le PDF
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mon certificat
            </DrawerTitle>
          </DrawerHeader>
          <ViewerContent />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mon certificat d'action citoyenne
          </DialogTitle>
        </DialogHeader>
        <ViewerContent />
      </DialogContent>
    </Dialog>
  );
}
