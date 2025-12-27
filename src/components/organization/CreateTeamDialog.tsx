import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, description?: string) => void;
  isLoading: boolean;
  initialValues?: { name: string; description: string };
  mode?: 'create' | 'edit';
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  initialValues,
  mode = 'create',
}: CreateTeamDialogProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [description, setDescription] = useState(initialValues?.description || '');

  useEffect(() => {
    if (open && initialValues) {
      setName(initialValues.name);
      setDescription(initialValues.description);
    } else if (!open) {
      setName('');
      setDescription('');
    }
  }, [open, initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), description.trim() || undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Modifier l\'équipe' : 'Créer une équipe'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Modifiez les informations de l\'équipe'
              : 'Créez une nouvelle équipe pour organiser vos membres'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'équipe</Label>
              <Input
                id="name"
                placeholder="Ex: Équipe Marketing"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnelle)</Label>
              <Textarea
                id="description"
                placeholder="Décrivez le rôle de cette équipe..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading
                ? mode === 'edit'
                  ? 'Mise à jour...'
                  : 'Création...'
                : mode === 'edit'
                ? 'Mettre à jour'
                : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
