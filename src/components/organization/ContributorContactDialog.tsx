import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';

interface ContributorContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contributor: {
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  organizationName: string;
}

export function ContributorContactDialog({ 
  open, 
  onOpenChange,
  contributor,
  organizationName
}: ContributorContactDialogProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const handleSend = async () => {
    if (!contributor?.email) {
      toast({
        title: 'Erreur',
        description: 'Cet utilisateur n\'a pas d\'adresse email.',
        variant: 'destructive',
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez renseigner le sujet et le message.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-invitation', {
        body: {
          emails: [contributor.email],
          organizationName,
          customMessage: message,
          subject,
          isContactEmail: true,
        },
      });

      if (error) throw error;

      toast({
        title: 'Email envoyé',
        description: `Votre message a été envoyé à ${contributor.first_name || contributor.email}.`,
      });

      // Reset form
      setSubject('');
      setMessage('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer l\'email.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!contributor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contacter le contributeur</DialogTitle>
          <DialogDescription>
            Envoyez un email personnalisé à ce bénévole.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient info */}
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={contributor.avatar_url || undefined} />
              <AvatarFallback>
                {getInitials(contributor.first_name, contributor.last_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">
                {contributor.first_name && contributor.last_name 
                  ? `${contributor.first_name} ${contributor.last_name}`
                  : 'Nom non renseigné'}
              </p>
              <p className="text-xs text-muted-foreground">{contributor.email}</p>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              placeholder="Objet de votre message..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Écrivez votre message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSend}
              disabled={!subject.trim() || !message.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
