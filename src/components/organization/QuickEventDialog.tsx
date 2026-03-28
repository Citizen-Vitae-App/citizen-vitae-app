import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, Clock, ImageIcon, Loader2, Check, Globe, Lock, ChevronDown, ChevronUp, Users, UserCheck, ShieldCheck, Pencil, Tag } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { useBackgroundImageUpload } from '@/hooks/useBackgroundImageUpload';
import defaultEventCover from '@/assets/default-event-cover.jpg';

interface EditEventData {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string;
  is_public: boolean | null;
  description?: string | null;
  capacity?: number | null;
  require_approval?: boolean | null;
  allow_self_certification?: boolean | null;
  cover_image_url?: string | null;
  cause_theme_id?: string | null;
}

interface QuickEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  organizationId: string;
  position?: { top: number; left: number; cellWidth?: number; cellHeight?: number };
  editEvent?: EditEventData;
}

export function QuickEventDialog({ isOpen, onClose, date, organizationId, position, editEvent }: QuickEventDialogProps) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [capacity, setCapacity] = useState('');
  const [requireApproval, setRequireApproval] = useState(false);
  const [allowSelfCertification, setAllowSelfCertification] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [causeThemes, setCauseThemes] = useState<Array<{ id: string; name: string; icon: string; color: string }>>([]);
  const [selectedCauseTheme, setSelectedCauseTheme] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const {
    previewUrl: coverImage,
    uploadedUrl,
    isUploading: isImageUploading,
    handleFileSelect,
    waitForUpload,
    reset: resetImage,
  } = useBackgroundImageUpload({ bucket: 'event-covers', organizationId });

  // Fetch cause themes
  useEffect(() => {
    const fetchCauseThemes = async () => {
      const { data, error } = await supabase.from('cause_themes').select('id, name, icon, color').order('name');
      if (!error && data) setCauseThemes(data);
    };
    fetchCauseThemes();
  }, []);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      if (editEvent) {
        setTitle(editEvent.name);
        setLocation(editEvent.location || '');
        setDescription(editEvent.description || '');
        setIsPublic(editEvent.is_public ?? true);
        setCapacity(editEvent.capacity ? String(editEvent.capacity) : '');
        setRequireApproval(editEvent.require_approval ?? false);
        setAllowSelfCertification(editEvent.allow_self_certification ?? false);
        setSelectedCauseTheme(editEvent.cause_theme_id || null);
        setIsExpanded(false);
        resetImage();
        const start = new Date(editEvent.start_date);
        const end = new Date(editEvent.end_date);
        setStartTime(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`);
        setEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
      } else {
        setTitle('');
        setLocation('');
        setDescription('');
        setIsPublic(true);
        setCapacity('');
        setRequireApproval(false);
        setAllowSelfCertification(false);
        setIsExpanded(false);
        setSelectedCauseTheme(null);
        resetImage();
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
      }
      setTimeout(() => titleInputRef.current?.focus(), 100);
    }
  }, [isOpen, date, resetImage, editEvent]);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

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
        endDate.setTime(startDate.getTime() + 3600000);
      }

      let imageUrl: string | null = editEvent?.cover_image_url || null;
      if (coverImage) {
        if (isImageUploading) {
          toast.info("Finalisation de l'upload...");
        }
        imageUrl = await waitForUpload();
      }

      if (editEvent) {
        // UPDATE existing event
        const { error } = await supabase.from('events').update({
          name: title.trim(),
          location: location.trim() || 'À définir',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_public: isPublic,
          description: description.trim() || null,
          capacity: capacity ? parseInt(capacity) : null,
          require_approval: requireApproval,
          allow_self_certification: allowSelfCertification,
          cover_image_url: imageUrl,
          updated_at: new Date().toISOString(),
        }).eq('id', editEvent.id);

        if (error) throw error;

        // Update cause theme
        await supabase.from('event_cause_themes').delete().eq('event_id', editEvent.id);
        if (selectedCauseTheme) {
          await supabase.from('event_cause_themes').insert({
            event_id: editEvent.id,
            cause_theme_id: selectedCauseTheme,
          });
        }

        queryClient.invalidateQueries({ queryKey: ['organization-events'] });
        onClose();
      } else {
        // CREATE new event
        const { data: eventData, error } = await supabase.from('events').insert({
          name: title.trim(),
          location: location.trim() || 'À définir',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          organization_id: organizationId,
          is_public: isPublic,
          description: description.trim() || null,
          capacity: capacity ? parseInt(capacity) : null,
          require_approval: requireApproval,
          allow_self_certification: allowSelfCertification,
          cover_image_url: imageUrl,
        }).select('id').single();

        if (error) throw error;

        if (selectedCauseTheme && eventData?.id) {
          await supabase.from('event_cause_themes').insert({
            event_id: eventData.id,
            cause_theme_id: selectedCauseTheme,
          });
        }

        toast.success('Événement créé');
        queryClient.invalidateQueries({ queryKey: ['organization-events'] });
        onClose();
      }
    } catch (err) {
      logger.error('Quick event save failed:', err);
      toast.error(editEvent ? "Erreur lors de la mise à jour" : "Erreur lors de la création");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // Position the card to the right or left of the calendar cell
  const computeStyle = (): React.CSSProperties => {
    if (!position) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50 };
    }
    const cardWidth = 340;
    const cardHeight = isExpanded ? 600 : 360;
    const gap = 8;

    // position.left is the right edge of the cell; try placing card to the right of the cell
    let left = position.left + gap;
    if (left + cardWidth > window.innerWidth - gap) {
      // Not enough room on the right — place to the left of the cell
      const cellLeft = position.left - (position.cellWidth || 0);
      left = cellLeft - cardWidth - gap;
    }
    left = Math.max(gap, Math.min(left, window.innerWidth - cardWidth - gap));

    // Vertically center the card on the event element
    const eventCenterY = position.top + (position.cellHeight || 0) / 2;
    let top = eventCenterY - cardHeight / 2;
    // Clamp within viewport
    if (top + cardHeight > window.innerHeight - gap) {
      top = window.innerHeight - cardHeight - gap;
    }
    top = Math.max(gap, top);

    return { position: 'fixed', top, left, zIndex: 50 };
  };

  return (
    <div
      ref={dialogRef}
      style={computeStyle()}
      className="w-[340px] rounded-xl bg-background shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden"
    >
      {/* Cover image zone */}
      <div className="relative h-20 bg-muted overflow-hidden group cursor-pointer">
        <img
          src={coverImage || defaultEventCover}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleImageUpload}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {isImageUploading ? (
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            ) : uploadedUrl ? (
              <Check className="w-5 h-5 text-white" />
            ) : (
              <ImageIcon className="w-5 h-5 text-white" />
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Title input */}
        <Input
          ref={titleInputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ajouter un titre"
          className="border-0 border-b border-border rounded-none px-0 text-lg font-medium placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-primary h-auto pb-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && title.trim() && !isExpanded) handleSave();
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

        {/* Expanded options */}
        {isExpanded && (
          <div className="space-y-3 pt-1 border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
            {/* Visibility */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {isPublic ? <Globe className="h-4 w-4 text-muted-foreground" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                <span>{isPublic ? 'Public' : 'Privé'}</span>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            {/* Description */}
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optionnel)"
              className="min-h-[60px] text-sm resize-none bg-muted border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
              rows={2}
            />

            {/* Cause Theme */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 w-full text-sm text-left px-2 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors">
                  {selectedCauseTheme ? (() => {
                    const theme = causeThemes.find(t => t.id === selectedCauseTheme);
                    if (theme) {
                      const Icon = (Icons as any)[theme.icon] || Icons.Tag;
                      return <><Icon className="h-4 w-4 shrink-0" style={{ color: theme.color }} /><span className="truncate">{theme.name}</span></>;
                    }
                    return <><Tag className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground">Catégorie</span></>;
                  })() : (
                    <><Tag className="h-4 w-4 text-muted-foreground shrink-0" /><span className="text-muted-foreground">Catégorie</span></>
                  )}
                  <ChevronDown className="h-3 w-3 ml-auto text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 max-h-48 overflow-y-auto">
                {causeThemes.map(theme => {
                  const Icon = (Icons as any)[theme.icon] || Icons.Tag;
                  return (
                    <DropdownMenuItem
                      key={theme.id}
                      onClick={() => setSelectedCauseTheme(selectedCauseTheme === theme.id ? null : theme.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: theme.color }} />
                      <span>{theme.name}</span>
                      {selectedCauseTheme === theme.id && <Check className="h-3 w-3 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Options */}
            <div className="space-y-2 bg-muted/50 rounded-md px-3 py-2">
              {/* Capacity */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Capacité</span>
                </div>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="∞"
                  className="w-16 h-7 text-xs text-right border-0 bg-background/60 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>

              {/* Require Approval */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Approbation</span>
                </div>
                <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
              </div>

              {/* Self-Certification */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Auto-certification</span>
                </div>
                <Switch checked={allowSelfCertification} onCheckedChange={setAllowSelfCertification} />
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
          >
            {isExpanded ? 'Moins d\'options' : 'Plus d\'options'}
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
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
              {isSaving ? (editEvent ? 'Mise à jour...' : 'Création...') : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
