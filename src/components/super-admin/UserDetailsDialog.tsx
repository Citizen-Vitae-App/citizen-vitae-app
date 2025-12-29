import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award, ClipboardList, Building2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { User } from '@/hooks/useSuperAdminUsers';

interface UserDetailsDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'registrations' | 'certifications';
}

export function UserDetailsDialog({ user, open, onOpenChange, mode }: UserDetailsDialogProps) {
  if (!user) return null;

  // Only show registrations with actual certificate data (not just auto-generated certificate_id)
  const items = mode === 'certifications' 
    ? user.registrations.filter(r => r.has_certificate_data)
    : user.registrations;

  const title = mode === 'certifications' 
    ? `Certifications de ${user.full_name}` 
    : `Inscriptions de ${user.full_name}`;

  const getStatusBadge = (status: string, hasCertificate: boolean) => {
    if (hasCertificate) {
      return <Badge className="bg-emerald-600/20 text-emerald-400">Certifié</Badge>;
    }
    switch (status) {
      case 'registered':
        return <Badge className="bg-blue-600/20 text-blue-400">Inscrit</Badge>;
      case 'attended':
        return <Badge className="bg-amber-600/20 text-amber-400">Présent</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-600/20 text-red-400">Annulé</Badge>;
      default:
        return <Badge className="bg-[hsl(217.2,32.6%,25%)] text-[hsl(215,20.2%,65.1%)]">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)] max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[hsl(210,40%,98%)]">
            {mode === 'certifications' ? (
              <Award className="w-5 h-5 text-amber-400" />
            ) : (
              <ClipboardList className="w-5 h-5 text-blue-400" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px] pr-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-[hsl(215,20.2%,65.1%)]">
              {mode === 'certifications' ? 'Aucune certification' : 'Aucune inscription'}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className="p-3 rounded-lg bg-[hsl(222.2,84%,4.9%)] border border-[hsl(217.2,32.6%,25%)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[hsl(210,40%,98%)] truncate">
                        {item.event_name}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-[hsl(215,20.2%,65.1%)]">
                        <Building2 className="w-3 h-3" />
                        <span className="truncate">{item.organization_name}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-[hsl(215,20.2%,65.1%)]">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(item.registered_at), 'dd MMM yyyy', { locale: fr })}</span>
                      </div>
                    </div>
                    {getStatusBadge(item.status, item.has_certificate_data)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}