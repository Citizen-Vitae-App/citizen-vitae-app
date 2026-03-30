import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, ImageIcon, Loader2, Check, Globe, Lock, ChevronDown, ChevronUp, Users, UserCheck, ShieldCheck, Pencil, Tag, MoreVertical, Copy, Trash2 } from 'lucide-react';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  latitude?: number | null;
  longitude?: number | null;
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
  onEventPreview?: (startISO: string, endISO: string) => void;
}

export function QuickEventDialog({ isOpen, onClose, date, organizationId, position, editEvent, onEventPreview }: QuickEventDialogProps) {
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
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
  // Mobile bottom sheet state
  const [mobileFullScreen, setMobileFullScreen] = useState(false);
  const [sheetTranslateY, setSheetTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 640;

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
      setMobileFullScreen(false);
      if (editEvent) {
        setTitle(editEvent.name);
        setLocation(editEvent.location || '');
        setCoordinates(editEvent.latitude != null && editEvent.longitude != null ? { latitude: editEvent.latitude, longitude: editEvent.longitude } : null);
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
        setCoordinates(null);
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

  // Listen for time range from drag-to-select
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.startTime) setStartTime(detail.startTime);
      if (detail?.endTime) setEndTime(detail.endTime);
    };
    window.addEventListener('quick-event-time-range', handler);
    return () => window.removeEventListener('quick-event-time-range', handler);
  }, [isOpen]);

  // Live preview: update calendar event block when times change (both edit AND creation)
  useEffect(() => {
    if (!isOpen || !onEventPreview) return;
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);
    const s = new Date(date);
    s.setHours(sH, sM, 0, 0);
    const e = new Date(date);
    e.setHours(eH, eM, 0, 0);
    if (e <= s) e.setTime(s.getTime() + 3600000);
    onEventPreview(s.toISOString(), e.toISOString());
  }, [isOpen, startTime, endTime, date, onEventPreview]);

  // Close on outside click — but ignore clicks inside Radix portals (dropdowns, etc.)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (dialogRef.current && dialogRef.current.contains(target)) return;
      if (target.closest('[data-radix-popper-content-wrapper]') || target.closest('[role="menu"]') || target.closest('[data-radix-menu-content]')) return;
      // On mobile, clicking backdrop closes
      if (isMobileView && target.closest('[data-mobile-backdrop]')) {
        onClose();
        return;
      }
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, isMobileView]);

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
        const { error } = await supabase.from('events').update({
          name: title.trim(),
          location: location.trim() || '',
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
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
        const { data: eventData, error } = await supabase.from('events').insert({
          name: title.trim(),
          location: location.trim() || '',
          latitude: coordinates?.latitude ?? null,
          longitude: coordinates?.longitude ?? null,
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

  // Duplicate event
  const handleDuplicate = async () => {
    if (!editEvent) return;
    setIsSaving(true);
    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const startDate = new Date(date);
      startDate.setHours(startH, startM, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(endH, endM, 0, 0);
      if (endDate <= startDate) endDate.setTime(startDate.getTime() + 3600000);

      const { data: newEvent, error } = await supabase.from('events').insert({
        name: `${title.trim() || editEvent.name} (copie)`,
        location: location.trim() || '',
        latitude: coordinates?.latitude ?? editEvent.latitude ?? null,
        longitude: coordinates?.longitude ?? editEvent.longitude ?? null,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        organization_id: organizationId,
        is_public: isPublic,
        description: description.trim() || null,
        capacity: capacity ? parseInt(capacity) : null,
        require_approval: requireApproval,
        allow_self_certification: allowSelfCertification,
        cover_image_url: editEvent.cover_image_url,
      }).select('id').single();

      if (error) throw error;

      if (selectedCauseTheme && newEvent?.id) {
        await supabase.from('event_cause_themes').insert({
          event_id: newEvent.id,
          cause_theme_id: selectedCauseTheme,
        });
      }

      toast.success('Événement dupliqué');
      queryClient.invalidateQueries({ queryKey: ['organization-events'] });
      onClose();
    } catch (err) {
      logger.error('Duplicate event failed:', err);
      toast.error('Erreur lors de la duplication');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete event
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteRequest = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!editEvent) return;
    setShowDeleteConfirm(false);
    setIsSaving(true);
    try {
      const { error } = await supabase.from('events').delete().eq('id', editEvent.id);
      if (error) throw error;
      toast.success('Événement supprimé');
      queryClient.invalidateQueries({ queryKey: ['organization-events'] });
      onClose();
    } catch (err) {
      logger.error('Delete event failed:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsSaving(false);
    }
  };

  // Mobile drag handlers — real-time tracking for smooth feel
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragCurrentY.current = e.touches[0].clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    dragCurrentY.current = currentY;
    const delta = currentY - dragStartY.current;
    // Allow dragging down freely, dampen upward drag
    if (delta > 0) {
      setSheetTranslateY(delta);
    } else {
      // Rubber-band effect when dragging up
      setSheetTranslateY(delta * 0.3);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (dragStartY.current === null || dragCurrentY.current === null) {
      setIsDragging(false);
      return;
    }
    const delta = dragStartY.current - dragCurrentY.current;
    setIsDragging(false);
    setSheetTranslateY(0);

    // Swipe up: expand to full screen
    if (delta > 50) {
      setMobileFullScreen(true);
      setIsExpanded(true);
    }
    // Swipe down: if full screen, collapse; if collapsed, close
    if (delta < -80) {
      if (mobileFullScreen) {
        setMobileFullScreen(false);
        setIsExpanded(false);
      } else {
        onClose();
      }
    }
    dragStartY.current = null;
    dragCurrentY.current = null;
  }, [mobileFullScreen, onClose]);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (!isOpen || !isMobileView) return;
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, isMobileView]);

  if (!isOpen) return null;

  // Desktop positioning
  const computeDesktopStyle = (): React.CSSProperties => {
    if (!position) {
      return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 50 };
    }
    const cardWidth = 340;
    const cardHeight = isExpanded ? 600 : 360;
    const gap = 8;

    let left = position.left + gap;
    if (left + cardWidth > window.innerWidth - gap) {
      const cellLeft = position.left - (position.cellWidth || 0);
      left = cellLeft - cardWidth - gap;
    }
    left = Math.max(gap, Math.min(left, window.innerWidth - cardWidth - gap));

    const eventCenterY = position.top + (position.cellHeight || 0) / 2;
    let top = eventCenterY - cardHeight / 2;
    if (top + cardHeight > window.innerHeight - gap) {
      top = window.innerHeight - cardHeight - gap;
    }
    const colHeader = document.querySelector('.fc-col-header');
    const minTop = colHeader ? colHeader.getBoundingClientRect().bottom + gap : gap;
    top = Math.max(minTop, top);

    return { position: 'fixed', top, left, zIndex: 50 };
  };

  // ─── Shared form content ───
  const formContent = (
    <>
      {/* Cover image zone */}
      <div className={`relative ${isMobileView ? 'h-16' : 'h-20'} bg-muted overflow-hidden group cursor-pointer`}>
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

        {/* 3-dot menu for existing events */}
        {editEvent && (
          <div className="absolute top-1.5 right-1.5 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-7 w-7 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onSelect={handleDuplicate}
                  disabled={isSaving}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Copy className="h-4 w-4" />
                  <span>Dupliquer</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleDeleteRequest}
                  disabled={isSaving}
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Supprimer</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className={`${isMobileView ? 'p-3 space-y-2' : 'p-4 space-y-3'}`}>
        {/* Title input */}
        <Input
          ref={titleInputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ajouter un titre"
          className={`border-0 border-b border-border rounded-none px-0 font-medium placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:border-primary h-auto pb-2 ${isMobileView ? 'text-base' : 'text-lg'}`}
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

        {/* Location with Google Places */}
        <GooglePlacesAutocomplete
          value={location}
          onChange={(val) => { setLocation(val); setCoordinates(null); }}
          onPlaceSelect={(place) => {
            setLocation(place.address);
            setCoordinates({ latitude: place.latitude, longitude: place.longitude });
          }}
          placeholder="Ajouter un lieu"
          inputClassName="border-0 bg-muted rounded-md h-8 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/30"
        />

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
                      onSelect={(e) => { e.preventDefault(); setSelectedCauseTheme(selectedCauseTheme === theme.id ? null : theme.id); }}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Approbation</span>
                </div>
                <Switch checked={requireApproval} onCheckedChange={setRequireApproval} />
              </div>
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

        {/* Desktop actions (hidden on mobile) */}
        {!isMobileView && (
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
        )}

        {/* Mobile: "Plus d'options" link */}
        {isMobileView && !isExpanded && (
          <button
            onClick={() => { setIsExpanded(true); setMobileFullScreen(true); }}
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1 pt-1"
          >
            Plus d'options
            <ChevronUp className="h-3 w-3" />
          </button>
        )}
        {isMobileView && isExpanded && (
          <button
            onClick={() => { setIsExpanded(false); setMobileFullScreen(false); }}
            className="text-xs text-primary hover:underline font-medium flex items-center gap-1 pt-1"
          >
            Moins d'options
            <ChevronDown className="h-3 w-3" />
          </button>
        )}
      </div>
    </>
  );

  // ─── Mobile: Bottom sheet ───
  if (isMobileView) {
    return (
      <>
        {/* Backdrop */}
        <div
          data-mobile-backdrop
          className="fixed inset-0 z-[59] bg-black/50 backdrop-blur-[2px]"
          style={{
            opacity: sheetTranslateY > 0 ? Math.max(0.2, 1 - sheetTranslateY / 400) : 1,
            transition: isDragging ? 'none' : 'opacity 0.3s ease',
          }}
          onClick={onClose}
        />
        {/* Bottom sheet */}
        <div
          ref={dialogRef}
          className={`fixed inset-x-0 bottom-0 z-[60] bg-background rounded-t-[28px] shadow-[0_-8px_40px_rgb(0,0,0,0.2)] border-t border-border/30 flex flex-col ${
            mobileFullScreen ? 'max-h-[90vh]' : 'max-h-[75vh]'
          }`}
          style={{
            transform: `translateY(${Math.max(0, sheetTranslateY)}px)`,
            transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32,0.72,0,1), top 0.35s cubic-bezier(0.32,0.72,0,1), max-height 0.35s cubic-bezier(0.32,0.72,0,1)',
            willChange: 'transform',
          }}
        >
          {/* Drag handle + header */}
          <div
            className="shrink-0 touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-3 pb-1.5">
              <div className="w-9 h-[5px] rounded-full bg-muted-foreground/40" />
            </div>
            {/* Header: Annuler — Title — Enreg. */}
            <div className="flex items-center justify-between px-4 pb-2.5">
              <button
                onClick={onClose}
                className="text-sm text-muted-foreground font-medium active:opacity-60 transition-opacity"
              >
                Annuler
              </button>
              <span className="text-sm font-semibold text-foreground">
                {editEvent ? 'Modifier' : 'Nouvel événement'}
              </span>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!title.trim() || isSaving}
                className="h-7 px-3 text-xs rounded-full"
              >
                {isSaving ? '...' : 'Enreg.'}
              </Button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch">
            {formContent}
          </div>
        </div>
        {deleteConfirmDialog}
      </>
    );
  }

  const deleteConfirmDialog = (
    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer cet événement ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Toutes les inscriptions associées seront également supprimées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // ─── Desktop: Fixed positioned card ───
  return (
    <>
      <div
        ref={dialogRef}
        style={computeDesktopStyle()}
        className="w-[340px] rounded-xl bg-background shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border/50 animate-in fade-in-0 zoom-in-95 duration-150 overflow-hidden"
      >
        {formContent}
      </div>
      {deleteConfirmDialog}
    </>
  );
}