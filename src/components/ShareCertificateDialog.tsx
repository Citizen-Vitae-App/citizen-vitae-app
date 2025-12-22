import { useState } from 'react';
import { Copy, Check, Linkedin, Twitter, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface ShareCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateUrl: string;
  eventName: string;
  organizationName: string;
}

export function ShareCertificateDialog({ 
  open, 
  onOpenChange, 
  certificateUrl, 
  eventName,
  organizationName,
}: ShareCertificateDialogProps) {
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);

  const shareText = `J'ai participé à la mission citoyenne "${eventName}" avec ${organizationName}. Mon engagement citoyen, certifié par Citizen Vitae.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(certificateUrl);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erreur lors de la copie');
    }
  };

  const shareViaLinkedIn = () => {
    const url = encodeURIComponent(certificateUrl);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
      'width=600,height=600'
    );
  };

  const shareViaTwitter = () => {
    const text = encodeURIComponent(shareText);
    const url = encodeURIComponent(certificateUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Mon certificat d'engagement citoyen - ${eventName}`);
    const body = encodeURIComponent(`${shareText}\n\nVoir mon certificat : ${certificateUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const truncatedUrl = certificateUrl.length > 45 ? certificateUrl.substring(0, 45) + '...' : certificateUrl;

  const ShareContent = () => (
    <div className="space-y-6 p-2">
      {/* Copy link section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Lien du certificat</label>
        <div className="flex gap-2">
          <Input 
            readOnly 
            value={truncatedUrl}
            className="flex-1 bg-muted/50 border-border/50"
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Share buttons */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Partager sur</label>
        <div className="flex gap-3">
          {/* LinkedIn */}
          <button
            onClick={shareViaLinkedIn}
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors flex-1"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0A66C2' }}>
              <Linkedin className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-medium">LinkedIn</span>
          </button>

          {/* Twitter/X */}
          <button
            onClick={shareViaTwitter}
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors flex-1"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-foreground">
              <Twitter className="h-6 w-6 text-background" />
            </div>
            <span className="text-sm font-medium">X</span>
          </button>

          {/* Email */}
          <button
            onClick={shareViaEmail}
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors flex-1"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-6 w-6 text-foreground" />
            </div>
            <span className="text-sm font-medium">Email</span>
          </button>
        </div>
      </div>

      {/* Message preview */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Aperçu du message</label>
        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg italic">
          "{shareText}"
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Partager mon certificat</DrawerTitle>
          </DrawerHeader>
          <ShareContent />
          <div className="p-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Partager mon certificat</DialogTitle>
        </DialogHeader>
        <ShareContent />
      </DialogContent>
    </Dialog>
  );
}
