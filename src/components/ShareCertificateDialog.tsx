import { useState } from 'react';
import { Copy, Check, Linkedin, Twitter, Mail, Instagram } from 'lucide-react';
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
  const [textCopied, setTextCopied] = useState(false);

  // Texte avec les @ pour les réseaux sociaux
  const shareTextWithTags = `J'ai participé à la mission citoyenne "${eventName}" avec @${organizationName.replace(/\s+/g, '')}. Mon engagement citoyen, certifié par @CitizenVitae.`;
  
  // Texte pour affichage (sans encodage)
  const displayShareText = `J'ai participé à la mission citoyenne "${eventName}" avec @${organizationName.replace(/\s+/g, '')}. Mon engagement citoyen, certifié par @CitizenVitae.`;

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

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(`${shareTextWithTags}\n\n${certificateUrl}`);
      setTextCopied(true);
      toast.success('Texte copié pour Instagram !');
      setTimeout(() => setTextCopied(false), 2000);
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
    const text = encodeURIComponent(shareTextWithTags);
    const url = encodeURIComponent(certificateUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareViaInstagram = () => {
    // Instagram n'a pas d'API de partage direct web, on copie le texte et ouvre Instagram
    handleCopyText();
    // Sur mobile, on peut ouvrir l'app Instagram
    if (isMobile) {
      window.open('instagram://app', '_blank');
    } else {
      window.open('https://www.instagram.com/', '_blank');
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Mon certificat d'engagement citoyen - ${eventName}`);
    const body = encodeURIComponent(`${shareTextWithTags}\n\nVoir mon certificat : ${certificateUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const truncatedUrl = certificateUrl.length > 40 ? certificateUrl.substring(0, 40) + '...' : certificateUrl;

  const ShareContent = () => (
    <div className="space-y-6 p-2">
      {/* Copy link section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Lien du certificat</label>
        <div className="flex gap-2">
          <Input 
            readOnly 
            value={truncatedUrl}
            className="flex-1 bg-muted/50 border-border/50 text-sm"
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
        <div className="grid grid-cols-4 gap-2">
          {/* LinkedIn */}
          <button
            onClick={shareViaLinkedIn}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0A66C2' }}>
              <Linkedin className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-xs font-medium">LinkedIn</span>
          </button>

          {/* Twitter/X */}
          <button
            onClick={shareViaTwitter}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-foreground">
              <Twitter className="h-5 w-5 md:h-6 md:w-6 text-background" />
            </div>
            <span className="text-xs font-medium">X</span>
          </button>

          {/* Instagram */}
          <button
            onClick={shareViaInstagram}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div 
              className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' 
              }}
            >
              <Instagram className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            <span className="text-xs font-medium">Instagram</span>
          </button>

          {/* Email */}
          <button
            onClick={shareViaEmail}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
            </div>
            <span className="text-xs font-medium">Email</span>
          </button>
        </div>
      </div>

      {/* Message preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground">Aperçu du message</label>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleCopyText}
            className="h-8 text-xs"
          >
            {textCopied ? <Check className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
            Copier
          </Button>
        </div>
        <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg italic">
          "{displayShareText}"
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
