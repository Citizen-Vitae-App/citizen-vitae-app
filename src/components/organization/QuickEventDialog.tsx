import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addHours, setHours, setMinutes, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { X, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';

interface QuickEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  organizationId: string;
  /** Position in viewport pixels for the popover */
  position?: { top: number; left: number };
}

export function QuickEventDialog({ isOpen, onClose, date, organizationId, position }: QuickEventDialogProps) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setLocation('');
      // If the date includes a time component (from timeGrid click), use it
      const hours = date.getHours();
      const mins = date.getMinutes();
      if (hours !== 0 || mins !== 0) {
        setStartTime(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
        const endH = hours + 1;
        setEndTime(`${String(endH > 23 ? 23 : endH).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
      } else {
        setStartTime('09:00');
        setEndTime('10:00');
      }
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen, date]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Veuillez saisir un titre');
      return;
    }
    setIsSaving(true);
    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);

      const startDate = new Date(date);
      startDate.setHours(startH, startM, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(endH, endM, 0, 0);

      if (endDate <= startDate) {
        endDate.setTime(startDate.getTime() + 3600000); // +1h
      }

      const { error } = await supabase.from('events').insert({
        name: title.trim(),
        location: location.trim() || 'À définir',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        organization_id: organizationId,
        is_public: true,
      });

      if (error) throw error;

      toast.success('Événement créé');
      queryClient.invalidateQueries({ queryKey: ['organization-events'] });
      onClose();
    } catch (err) {
      logger.error('Quick event creation failed:', err);
      toast.error("Erreur lors de la création");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoreOptions = () => {
    const [startH, startM] = startTime.split(':').map(Number);
    const d = new Date(date);
    d.setHours(startH, startM, 0, 0);
    const params = new URLSearchParams();
    params.set('date', d.toISOString());
    if (title.trim()) params.set('title', title.trim());
    if (location.trim()) params.set('location', location.trim());
    onClose();
    navigate(`/organization/create-event?${params.toString()}`);
  };

  if (!isOpen) return null;

  // Calculate safe position
  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        top: Math.min(position.top, window.innerHeight - 380),
        left: Math.min(Math.max(position.left - 160, 8), window.innerWidth - 340),
        zIndex: 50,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50,
      };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" />

      {/* Popover */}
      <div
        ref={dialogRef}
        style={style}
        className="w-80 rounded-xl bg-background border border-border shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
      >
        {/* Header bar with color accent */}
        <div className="h-1.5 bg-primary rounded-t-xl" />

        <div className="p-4 space-y-3">
          {/* Title input - Google Calendar style (borderless, large) */}
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ajouter un titre"
            className="border-0 border-b border-border rounded-none px-0 text-lg font-medium placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-primary h-auto pb-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && title.trim()) handleSave();
            }}
          />

          {/* Date display */}
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium capitalize">
              {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
            </span>
          </div>

          {/* Time pickers */}
          <div className="flex items-center gap-2 pl-6">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="bg-muted rounded-md px-2 py-1.5 text-sm border-0 focus:ring-2 focus:ring-primary/30 outline-none"
            />
            <span className="text-muted-foreground text-sm">—</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="bg-muted rounded-md px-2 py-1.5 text-sm border-0 focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>

          {/* Location */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ajouter un lieu"
              className="border-0 bg-muted rounded-md h-8 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={handleMoreOptions}
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              Plus d'options
              <ArrowRight className="h-3 w-3" />
            </button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-3 text-xs">
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!title.trim() || isSaving}
                className="h-8 px-4 text-xs"
              >
                {isSaving ? 'Création...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}