import { useState } from 'react';
import { X, Copy, Check, Mail } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

export function ShareDialog({ open, onOpenChange, url, title }: ShareDialogProps) {
  const isMobile = useIsMobile();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erreur lors de la copie');
    }
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Découvre cet événement : ${title}`);
    const body = encodeURIComponent(`Je te partage cet événement :\n\n${title}\n\n${url}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const shareViaMessenger = () => {
    const encodedUrl = encodeURIComponent(url);
    window.open(`https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=291494419107518&redirect_uri=${encodeURIComponent(window.location.href)}`, '_blank');
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`Découvre cet événement : ${title}\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const truncatedUrl = url.length > 40 ? url.substring(0, 40) + '...' : url;

  const ShareContent = () => (
    <div className="space-y-6 p-2">
      {/* Copy link section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-muted-foreground">Lien de l'événement</label>
        <div className="flex gap-2">
          <Input 
            readOnly 
            value={truncatedUrl}
            className="flex-1 bg-black/[0.03] border-border/50"
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
        <label className="text-sm font-medium text-muted-foreground">Partager via</label>
        <div className="flex gap-3">
          {/* Email */}
          <button
            onClick={shareViaEmail}
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-black/[0.03] hover:bg-black/[0.05] transition-colors flex-1"
          >
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-6 w-6 text-foreground" />
            </div>
            <span className="text-sm font-medium">Email</span>
          </button>

          {/* Messenger */}
          <button
            onClick={shareViaMessenger}
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-black/[0.03] hover:bg-black/[0.05] transition-colors flex-1"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(45deg, #0078FF, #00C6FF)' }}>
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white fill-current">
                <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.13.26.35.27.57l.05 1.78c.04.57.61.94 1.13.71l1.98-.87c.17-.08.36-.1.53-.06.91.25 1.87.38 2.9.38 5.64 0 10-4.13 10-9.7C22 6.13 17.64 2 12 2zm5.89 7.73l-2.99 4.75c-.48.76-1.51.97-2.23.42l-2.38-1.78a.6.6 0 00-.72 0l-3.21 2.44c-.43.33-.99-.18-.7-.64l2.99-4.75c.48-.76 1.51-.97 2.23-.42l2.38 1.78a.6.6 0 00.72 0l3.21-2.44c.43-.33.99.18.7.64z"/>
              </svg>
            </div>
            <span className="text-sm font-medium">Messenger</span>
          </button>

          {/* WhatsApp */}
          <button
            onClick={shareViaWhatsApp}
            className="flex flex-col items-center gap-2 p-4 rounded-lg bg-black/[0.03] hover:bg-black/[0.05] transition-colors flex-1"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#25D366' }}>
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white fill-current">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <span className="text-sm font-medium">WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Partager cet événement</DrawerTitle>
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
          <DialogTitle>Partager cet événement</DialogTitle>
        </DialogHeader>
        <ShareContent />
      </DialogContent>
    </Dialog>
  );
}
