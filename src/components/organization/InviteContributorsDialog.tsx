import { useState, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Upload, X, Mail, Loader2 } from 'lucide-react';

interface InviteContributorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName: string;
}

export function InviteContributorsDialog({ 
  open, 
  onOpenChange,
  organizationName 
}: InviteContributorsDialogProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const addEmails = (input: string) => {
    const newEmails = input
      .split(/[,\n\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => validateEmail(e) && !emails.includes(e));
    
    if (newEmails.length > 0) {
      setEmails(prev => [...prev, ...newEmails]);
    }
    setEmailInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addEmails(emailInput);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    addEmails(pastedText);
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(prev => prev.filter(e => e !== emailToRemove));
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const extractedEmails = text
        .split(/[,\n\r]+/)
        .map(line => {
          // Handle CSV with headers or multiple columns
          const parts = line.split(/[;,\t]/);
          for (const part of parts) {
            const trimmed = part.trim().toLowerCase().replace(/"/g, '');
            if (validateEmail(trimmed)) return trimmed;
          }
          return null;
        })
        .filter((e): e is string => e !== null && !emails.includes(e));

      if (extractedEmails.length > 0) {
        setEmails(prev => [...prev, ...extractedEmails]);
        toast({
          title: `${extractedEmails.length} email(s) importé(s)`,
          description: 'Les adresses valides ont été ajoutées à la liste.',
        });
      } else {
        toast({
          title: 'Aucun email valide trouvé',
          description: 'Vérifiez que votre fichier contient des adresses email valides.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendInvitations = async () => {
    if (emails.length === 0) {
      toast({
        title: 'Aucun email',
        description: 'Ajoutez au moins une adresse email.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          emails,
          organizationName,
          customMessage: customMessage || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: 'Invitations envoyées',
        description: `${emails.length} invitation(s) envoyée(s) avec succès.`,
      });

      // Reset form
      setEmails([]);
      setCustomMessage('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending invitations:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer les invitations.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inviter des bénévoles</DialogTitle>
          <DialogDescription>
            Envoyez une invitation par email pour rejoindre votre organisation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email input */}
          <div className="space-y-2">
            <Label htmlFor="emails">Adresses email</Label>
            <div className="flex gap-2">
              <Input
                id="emails"
                placeholder="Saisissez un email puis Entrée..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={() => emailInput && addEmails(emailInput)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleCSVUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Séparez les emails par une virgule, un espace ou un retour à la ligne
            </p>
          </div>

          {/* Email list */}
          {emails.length > 0 && (
            <div className="space-y-2">
              <Label>Emails à inviter ({emails.length})</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg bg-muted/30">
                {emails.map((email) => (
                  <Badge 
                    key={email} 
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <Mail className="h-3 w-3" />
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="ml-1 rounded-full hover:bg-muted p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Custom message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message personnalisé (optionnel)</Label>
            <Textarea
              id="message"
              placeholder="Ajoutez un message personnel à votre invitation..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
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
              onClick={handleSendInvitations}
              disabled={emails.length === 0 || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer {emails.length > 0 && `(${emails.length})`}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
