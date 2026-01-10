import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CalendarDays, CalendarX, Repeat } from 'lucide-react';

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

  const title = actionType === 'edit' ? 'Modifier l\'événement récurrent' : 'Supprimer l\'événement récurrent';
  const confirmLabel = actionType === 'edit' ? 'Modifier' : 'Supprimer';
  const confirmVariant = actionType === 'delete' ? 'destructive' : 'default';

  const handleOptionClick = (value: RecurrenceScope) => {
    setSelectedScope(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <RadioGroup value={selectedScope} onValueChange={value => setSelectedScope(value as RecurrenceScope)} className="space-y-2">
            {/* This event only */}
            <div 
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleOptionClick('this_only')}
            >
              <RadioGroupItem value="this_only" id="scope-this" />
              <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Label htmlFor="scope-this" className="flex-1 cursor-pointer font-medium">
                Cet événement uniquement
              </Label>
            </div>

            {/* This and following */}
            <div 
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleOptionClick('this_and_following')}
            >
              <RadioGroupItem value="this_and_following" id="scope-following" />
              <CalendarX className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Label htmlFor="scope-following" className="flex-1 cursor-pointer font-medium">
                Cet événement et tous les suivants
              </Label>
            </div>

            {/* All events */}
            <div 
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleOptionClick('all')}
            >
              <RadioGroupItem value="all" id="scope-all" />
              <Repeat className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Label htmlFor="scope-all" className="flex-1 cursor-pointer font-medium">
                Tous les événements de la série
              </Label>
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
    </Dialog>
  );
}