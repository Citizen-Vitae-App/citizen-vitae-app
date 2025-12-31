import { useState } from 'react';
import { Mail, Send, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface InviteOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteOrganizationDialog({ open, onOpenChange }: InviteOrganizationDialogProps) {
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!organizationName.trim()) {
      toast.error('Veuillez entrer le nom de l\'organisation');
      return;
    }

    if (!email.trim()) {
      toast.error('Veuillez entrer une adresse email');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-owner-invitation', {
        body: { 
          email: email.trim(),
          organizationName: organizationName.trim(),
        },
      });

      if (error) throw error;

      if (data?.warning) {
        toast.warning(data.warning);
      } else {
        toast.success('Invitation envoyée avec succès');
      }
      
      queryClient.invalidateQueries({ queryKey: ['super-admin-organizations'] });
      setEmail('');
      setOrganizationName('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      const message = error?.message || 'Erreur lors de l\'envoi de l\'invitation';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[hsl(217.2,32.6%,17.5%)] border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)]">
        <DialogHeader>
          <DialogTitle>Inviter une nouvelle organisation</DialogTitle>
          <DialogDescription className="text-[hsl(215,20.2%,65.1%)]">
            Entrez l'email du futur propriétaire de l'organisation. Il recevra un lien pour créer son compte et configurer son organisation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-[hsl(210,40%,98%)]">
                Nom de l'organisation
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20.2%,65.1%)]" />
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="Nom de l'organisation"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  className="pl-9 bg-[hsl(222.2,84%,4.9%)] border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20.2%,50%)]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[hsl(210,40%,98%)]">
                Email du futur Owner
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,20.2%,65.1%)]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="owner@organisation.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-[hsl(222.2,84%,4.9%)] border-[hsl(217.2,32.6%,25%)] text-[hsl(210,40%,98%)] placeholder:text-[hsl(215,20.2%,50%)]"
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-[hsl(215,20.2%,65.1%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,25%)]"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Envoi...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Envoyer l'invitation
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
