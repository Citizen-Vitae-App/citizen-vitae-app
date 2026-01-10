import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CalendarDays, CalendarRange, Repeat } from 'lucide-react';
export type RecurrenceScope = 'this_only' | 'this_and_following' | 'all';
interface RecurrenceScopeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scope: RecurrenceScope) => void;
  actionType: 'edit' | 'delete';
  eventDate?: Date;
  isLoading?: boolean;
}
export function RecurrenceScopeDialog({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  eventDate,
  isLoading = false
}: RecurrenceScopeDialogProps) {
  const [selectedScope, setSelectedScope] = useState<RecurrenceScope>('this_only');
  const handleConfirm = () => {
    onConfirm(selectedScope);
  };
  const title = actionType === 'edit' ? 'Modifier cet événement' : 'Supprimer cet événement';
  const confirmLabel = actionType === 'edit' ? 'Modifier' : 'Supprimer';
  const confirmVariant = actionType === 'delete' ? 'destructive' : 'default';
  return <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 my-0">
          {eventDate && (
            <p className="text-sm text-muted-foreground mb-4">
              Occurrence du {format(eventDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </p>
          )}

          <RadioGroup value={selectedScope} onValueChange={value => setSelectedScope(value as RecurrenceScope)} className="space-y-3">
            {/* This event only */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
              <RadioGroupItem value="this_only" id="scope-this" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="scope-this" className="flex items-center gap-2 font-medium cursor-pointer">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Cet événement uniquement
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {actionType === 'edit' ? 'Modifier uniquement cette occurrence' : 'Supprimer uniquement cette occurrence'}
                </p>
              </div>
            </div>

            {/* This and following */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
              <RadioGroupItem value="this_and_following" id="scope-following" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="scope-following" className="flex items-center gap-2 font-medium cursor-pointer">
                  <CalendarRange className="h-4 w-4 text-muted-foreground" />
                  Cet événement et tous les suivants
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {actionType === 'edit' ? 'Modifier toutes les occurrences à partir de cette date' : 'Supprimer toutes les occurrences à partir de cette date'}
                </p>
              </div>
            </div>

            {/* All events */}
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
              <RadioGroupItem value="all" id="scope-all" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="scope-all" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  Tous les événements de la série
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {actionType === 'edit' ? 'Modifier toutes les occurrences de cette série' : 'Supprimer toutes les occurrences de cette série'}
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button variant={confirmVariant} onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? 'Traitement...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}