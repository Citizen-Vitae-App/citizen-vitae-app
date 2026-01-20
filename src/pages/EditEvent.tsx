import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRecentlyModifiedEvents } from '@/hooks/useRecentlyModifiedEvents';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Globe, Lock, ChevronDown, Users, UserCheck, ImageIcon, Tag, Trash2, Pencil, Loader2, Check, ShieldCheck, ArrowLeft } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import defaultEventCover from '@/assets/default-event-cover.jpg';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import { EventParticipantsSection } from '@/components/organization/EventParticipantsSection';
import { EventDateTimeSection } from '@/components/EventDateTimeSection';
import { TeamSelector } from '@/components/organization/TeamSelector';
import { useUserTeam } from '@/hooks/useTeams';
import { EventRecurrenceSection, RecurrenceData } from '@/components/EventRecurrenceSection';
import { RecurrenceScopeDialog, RecurrenceScope } from '@/components/RecurrenceScopeDialog';
import { eventSchema, type EventFormData } from '@/lib/validation/eventSchemas';

interface OriginalEventData {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  recurrenceGroupId: string | null;
}

export default function EditEvent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { eventId } = useParams<{ eventId: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [uploadedNewImageUrl, setUploadedNewImageUrl] = useState<string | null>(null);
  const uploadPromiseRef = useRef<Promise<string | null> | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [isCapacityDialogOpen, setIsCapacityDialogOpen] = useState(false);
  const [tempCapacity, setTempCapacity] = useState('');
  const [hasWaitlist, setHasWaitlist] = useState(false);
  const [causeThemes, setCauseThemes] = useState<Array<{ id: string; name: string; icon: string; color: string }>>([]);
  const [selectedCauseThemes, setSelectedCauseThemes] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [originalEvent, setOriginalEvent] = useState<OriginalEventData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'leader' | 'member'>('member');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [recurrenceData, setRecurrenceData] = useState<RecurrenceData>({
    isRecurring: false,
    frequency: 'weekly',
    interval: 1,
    weekDays: [],
    endType: 'after_occurrences',
    occurrences: 10,
  });

  // Recurrence scope dialog state
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [scopeDialogAction, setScopeDialogAction] = useState<'edit' | 'delete'>('edit');
  const [pendingFormData, setPendingFormData] = useState<EventFormData | null>(null);
  const [isScopeActionLoading, setIsScopeActionLoading] = useState(false);

  // Get user's team info for leaders
  const { userTeam, isLeader } = useUserTeam(currentUserId, organizationId);
  
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      requireApproval: false,
      allowSelfCertification: false,
      capacity: '',
      startDate: new Date(),
      startTime: '09:00',
      endDate: new Date(),
      endTime: '10:00',
      location: '',
      description: '',
    },
  });

  // Load event data
  useEffect(() => {
    const loadEventData = async () => {
      if (!eventId) return;

      try {
        // Get event data
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (eventError || !event) {
          toast.error('Événement non trouvé');
          navigate('/organization/dashboard');
          return;
        }

        setOrganizationId(event.organization_id);

        // Store original values for change detection
        setOriginalEvent({
          name: event.name,
          location: event.location,
          startDate: event.start_date,
          endDate: event.end_date,
          recurrenceGroupId: event.recurrence_group_id || null,
        });

        // Set form values
        const startDate = new Date(event.start_date);
        const endDate = new Date(event.end_date);

        form.reset({
          name: event.name,
          startDate: startDate,
          startTime: startDate.toTimeString().slice(0, 5),
          endDate: endDate,
          endTime: endDate.toTimeString().slice(0, 5),
          location: event.location,
          description: event.description || '',
          capacity: event.capacity?.toString() || '',
          requireApproval: event.require_approval || false,
          allowSelfCertification: event.allow_self_certification || false,
        });

        setIsPublic(event.is_public ?? true);
        setHasWaitlist(event.has_waitlist ?? false);
        setExistingImageUrl(event.cover_image_url);
        setSelectedTeamId(event.team_id || null);
        if (event.latitude && event.longitude) {
          setCoordinates({ latitude: Number(event.latitude), longitude: Number(event.longitude) });
        }

        // Load recurrence data
        const loadedEndType = event.recurrence_end_type as string;
        const validEndType: 'on_date' | 'after_occurrences' = 
          loadedEndType === 'on_date' || loadedEndType === 'after_occurrences' 
            ? loadedEndType 
            : 'after_occurrences';
        
        setRecurrenceData({
          isRecurring: event.is_recurring ?? false,
          frequency: (event.recurrence_frequency as RecurrenceData['frequency']) ?? 'weekly',
          interval: event.recurrence_interval ?? 1,
          weekDays: event.recurrence_days ?? [],
          endType: validEndType,
          endDate: event.recurrence_end_date ? new Date(event.recurrence_end_date) : undefined,
          occurrences: event.recurrence_occurrences ?? 10,
        });

        // Get event cause themes
        const { data: eventThemes } = await supabase
          .from('event_cause_themes')
          .select('cause_theme_id')
          .eq('event_id', eventId);

        if (eventThemes) {
          setSelectedCauseThemes(eventThemes.map(t => t.cause_theme_id));
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading event:', error);
        toast.error('Erreur lors du chargement');
        navigate('/organization/dashboard');
      }
    };

    loadEventData();
  }, [eventId, navigate, form]);

  // Fetch user role on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .single();
        if (data) {
          setUserRole(data.role as 'admin' | 'leader' | 'member');
        }
      }
    };
    fetchUserRole();
  }, []);

  // Auto-select team for leaders
  useEffect(() => {
    if (isLeader && userTeam?.teamId && !selectedTeamId) {
      setSelectedTeamId(userTeam.teamId);
    }
  }, [isLeader, userTeam, selectedTeamId]);

  // Load cause themes
  useEffect(() => {
    const fetchCauseThemes = async () => {
      const { data, error } = await supabase
        .from('cause_themes')
        .select('id, name, icon, color')
        .order('name');

      if (!error && data) {
        setCauseThemes(data);
      }
    };

    fetchCauseThemes();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizationId) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Veuillez utiliser un fichier PNG ou JPEG.');
      e.target.value = '';
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`L'image est trop volumineuse (${fileSizeMB} Mo). La taille maximale autorisée est de 2 Mo. Veuillez compresser ou choisir une autre image.`);
      e.target.value = '';
      return;
    }

    // Immediate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Start background upload
    setIsImageUploading(true);
    setUploadedNewImageUrl(null);

    const uploadPromise = (async () => {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${organizationId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-covers')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          
          // Check if error is related to file size
          if (uploadError.message?.toLowerCase().includes('size') || 
              uploadError.message?.toLowerCase().includes('too large') ||
              uploadError.statusCode === '413') {
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
            toast.error(`L'image est trop volumineuse (${fileSizeMB} Mo). La taille maximale autorisée est de 2 Mo. Veuillez compresser ou choisir une autre image.`);
          } else {
            toast.error("Erreur lors de l'upload de l'image. Veuillez réessayer.");
          }
          setIsImageUploading(false);
          return null;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('event-covers')
          .getPublicUrl(fileName);
        
        setUploadedNewImageUrl(publicUrl);
        setIsImageUploading(false);
        return publicUrl;
      } catch (error) {
        console.error('Upload failed:', error);
        setIsImageUploading(false);
        return null;
      }
    })();

    uploadPromiseRef.current = uploadPromise;
  };

  const handleSetCapacity = () => {
    if (tempCapacity) {
      form.setValue('capacity', tempCapacity);
    }
    setIsCapacityDialogOpen(false);
  };

  const handleRemoveCapacity = () => {
    form.setValue('capacity', '');
    setTempCapacity('');
    setIsCapacityDialogOpen(false);
  };

  // Handle delete - check if part of recurring series
  const handleDeleteClick = () => {
    if (originalEvent?.recurrenceGroupId) {
      setScopeDialogAction('delete');
      setScopeDialogOpen(true);
    } else {
      // Single event - delete directly
      handleDeleteSingle();
    }
  };

  // Delete a single event (non-recurring or scope = this_only)
  const handleDeleteSingle = async () => {
    if (!eventId) return;
    
    setIsDeleting(true);
    try {
      const eventName = form.getValues('name');
      console.log('[EditEvent] Sending cancellation notification to participants');
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'mission_canceled',
          event_id: eventId,
          event_name: eventName,
          notify_participants: true,
        },
      });

      await supabase.from('event_cause_themes').delete().eq('event_id', eventId);
      await supabase.from('event_registrations').delete().eq('event_id', eventId);

      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;

      // Invalidate organization events queries to refresh the list immediately
      queryClient.invalidateQueries({ 
        queryKey: ['organization-events'],
        exact: false // Invalidate all variants (with different teamId/searchQuery)
      });

      toast.success('Événement supprimé');
      navigate('/organization/dashboard');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete with scope (for recurring events)
  const handleDeleteWithScope = async (scope: RecurrenceScope) => {
    if (!eventId || !originalEvent?.recurrenceGroupId) return;

    setIsScopeActionLoading(true);
    const groupId = originalEvent.recurrenceGroupId;
    const eventStartDate = originalEvent.startDate;

    try {
      if (scope === 'this_only') {
        // Delete only this occurrence
        await supabase.from('event_cause_themes').delete().eq('event_id', eventId);
        await supabase.from('event_registrations').delete().eq('event_id', eventId);
        await supabase.from('events').delete().eq('id', eventId);
        toast.success('Occurrence supprimée');
      } else if (scope === 'this_and_following') {
        // Get all events in the series >= this date
        const { data: eventsToDelete } = await supabase
          .from('events')
          .select('id')
          .eq('recurrence_group_id', groupId)
          .gte('start_date', eventStartDate);

        if (eventsToDelete) {
          const eventIds = eventsToDelete.map(e => e.id);
          await supabase.from('event_cause_themes').delete().in('event_id', eventIds);
          await supabase.from('event_registrations').delete().in('event_id', eventIds);
          await supabase.from('events').delete().in('id', eventIds);
        }
        toast.success(`${eventsToDelete?.length || 0} événements supprimés`);
      } else if (scope === 'all') {
        // Get all events in the series
        const { data: eventsToDelete } = await supabase
          .from('events')
          .select('id')
          .eq('recurrence_group_id', groupId);

        if (eventsToDelete) {
          const eventIds = eventsToDelete.map(e => e.id);
          await supabase.from('event_cause_themes').delete().in('event_id', eventIds);
          await supabase.from('event_registrations').delete().in('event_id', eventIds);
          await supabase.from('events').delete().in('id', eventIds);
        }
        toast.success(`Série supprimée (${eventsToDelete?.length || 0} événements)`);
      }

      // Invalidate organization events queries to refresh the list immediately
      queryClient.invalidateQueries({ 
        queryKey: ['organization-events'],
        exact: false // Invalidate all variants (with different teamId/searchQuery)
      });

      setScopeDialogOpen(false);
      navigate('/organization/dashboard');
    } catch (error) {
      console.error('Error deleting events:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsScopeActionLoading(false);
    }
  };

  // Check if form submission should show scope dialog
  const onSubmit = async (data: EventFormData) => {
    if (!eventId || !organizationId) return;

    // If this event is part of a recurring series, show scope dialog
    if (originalEvent?.recurrenceGroupId) {
      setPendingFormData(data);
      setScopeDialogAction('edit');
      setScopeDialogOpen(true);
      return;
    }

    // Single event - update directly
    await performUpdate(data, [eventId]);
  };

  // Build update payload from form data
  const buildUpdatePayload = async (data: EventFormData) => {
    let finalImageUrl = existingImageUrl;

    if (newImagePreview) {
      if (isImageUploading && uploadPromiseRef.current) {
        toast.info('Finalisation de l\'upload de l\'image...');
        finalImageUrl = await uploadPromiseRef.current;
      } else if (uploadedNewImageUrl) {
        finalImageUrl = uploadedNewImageUrl;
      }
    }

    const startDateTime = new Date(data.startDate);
    const [startHours, startMinutes] = data.startTime.split(':');
    startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

    const endDateTime = new Date(data.endDate);
    const [endHours, endMinutes] = data.endTime.split(':');
    endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

    return {
      name: data.name,
      start_date: startDateTime.toISOString(),
      end_date: endDateTime.toISOString(),
      location: data.location,
      description: data.description || null,
      capacity: data.capacity ? parseInt(data.capacity) : null,
      has_waitlist: hasWaitlist,
      require_approval: data.requireApproval,
      allow_self_certification: data.allowSelfCertification,
      is_public: isPublic,
      cover_image_url: finalImageUrl,
      latitude: coordinates?.latitude || null,
      longitude: coordinates?.longitude || null,
      team_id: selectedTeamId,
      is_recurring: recurrenceData.isRecurring,
      recurrence_frequency: recurrenceData.isRecurring ? recurrenceData.frequency : null,
      recurrence_interval: recurrenceData.isRecurring ? recurrenceData.interval : null,
      recurrence_days: recurrenceData.isRecurring && recurrenceData.frequency === 'weekly' 
        ? recurrenceData.weekDays 
        : null,
      recurrence_end_type: recurrenceData.isRecurring ? recurrenceData.endType : null,
      recurrence_end_date: recurrenceData.isRecurring && recurrenceData.endType === 'on_date' && recurrenceData.endDate
        ? recurrenceData.endDate.toISOString().split('T')[0]
        : null,
      recurrence_occurrences: recurrenceData.isRecurring && recurrenceData.endType === 'after_occurrences' 
        ? recurrenceData.occurrences 
        : null,
    };
  };

  // Perform update on specified event IDs
  const performUpdate = async (data: EventFormData, eventIds: string[]) => {
    try {
      const updatePayload = await buildUpdatePayload(data);

      // Update all specified events
      const { error: updateError } = await supabase
        .from('events')
        .update(updatePayload)
        .in('id', eventIds);

      if (updateError) {
        console.error('Error updating events:', updateError);
        toast.error("Erreur lors de la mise à jour");
        return;
      }

      // Update cause themes for all events
      await supabase.from('event_cause_themes').delete().in('event_id', eventIds);

      if (selectedCauseThemes.length > 0) {
        const causeThemeInserts = eventIds.flatMap(evtId => 
          selectedCauseThemes.map(causeThemeId => ({
            event_id: evtId,
            cause_theme_id: causeThemeId,
          }))
        );
        await supabase.from('event_cause_themes').insert(causeThemeInserts);
      }

      // Notify participants for this event only
      if (originalEvent && eventId) {
        const startDateTime = new Date(data.startDate);
        const [startHours, startMinutes] = data.startTime.split(':');
        startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

        const endDateTime = new Date(data.endDate);
        const [endHours, endMinutes] = data.endTime.split(':');
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

        const originalStartTime = new Date(originalEvent.startDate).getTime();
        const originalEndTime = new Date(originalEvent.endDate).getTime();
        const newStartTime = startDateTime.getTime();
        const newEndTime = endDateTime.getTime();
        
        const locationChanged = data.location !== originalEvent.location;
        const startDateChanged = newStartTime !== originalStartTime;
        const endDateChanged = newEndTime !== originalEndTime;
        
        const notifications: string[] = [];
        if (locationChanged) notifications.push('mission_location_changed');
        if (startDateChanged && endDateChanged) {
          notifications.push('mission_date_changed');
        } else if (startDateChanged) {
          notifications.push('mission_start_date_changed');
        } else if (endDateChanged) {
          notifications.push('mission_end_date_changed');
        }
        
        for (const notificationType of notifications) {
          console.log(`[EditEvent] Sending ${notificationType} notification`);
          await supabase.functions.invoke('send-notification', {
            body: {
              type: notificationType,
              event_id: eventId,
              event_name: data.name,
              notify_participants: true,
              action_url: `/events/${eventId}`,
            },
          });
        }
      }

      const count = eventIds.length;
      toast.success(count > 1 ? `${count} événements mis à jour !` : 'Événement mis à jour !');
      
      // Mark events as recently modified for visual feedback
      useRecentlyModifiedEvents.getState().markEventsAsRecent(eventIds, originalEvent?.recurrenceGroupId);
      
      // Invalidate organization events queries to refresh the list immediately
      // This ensures updated events appear without requiring a page refresh
      queryClient.invalidateQueries({ 
        queryKey: ['organization-events'],
        exact: false // Invalidate all variants (with different teamId/searchQuery)
      });

      navigate('/organization/dashboard?tab=events');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Une erreur est survenue');
    }
  };

  // Update with scope (for recurring events)
  const handleUpdateWithScope = async (scope: RecurrenceScope) => {
    if (!eventId || !pendingFormData || !originalEvent?.recurrenceGroupId) return;

    setIsScopeActionLoading(true);
    const groupId = originalEvent.recurrenceGroupId;
    const eventStartDate = originalEvent.startDate;

    try {
      let eventIdsToUpdate: string[] = [];

      if (scope === 'this_only') {
        eventIdsToUpdate = [eventId];
      } else if (scope === 'this_and_following') {
        const { data: events } = await supabase
          .from('events')
          .select('id')
          .eq('recurrence_group_id', groupId)
          .gte('start_date', eventStartDate);
        eventIdsToUpdate = events?.map(e => e.id) || [];
      } else if (scope === 'all') {
        const { data: events } = await supabase
          .from('events')
          .select('id')
          .eq('recurrence_group_id', groupId);
        eventIdsToUpdate = events?.map(e => e.id) || [];
      }

      await performUpdate(pendingFormData, eventIdsToUpdate);
      
      // Mark events as recently modified for visual feedback
      useRecentlyModifiedEvents.getState().markEventsAsRecent(eventIdsToUpdate, groupId);
      
      // Invalidate organization events queries to refresh the list immediately
      queryClient.invalidateQueries({ 
        queryKey: ['organization-events'],
        exact: false // Invalidate all variants (with different teamId/searchQuery)
      });
      
      setScopeDialogOpen(false);
      setPendingFormData(null);
    } catch (error) {
      console.error('Error updating events:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsScopeActionLoading(false);
    }
  };

  // Handle scope dialog confirmation
  const handleScopeConfirm = (scope: RecurrenceScope) => {
    if (scopeDialogAction === 'delete') {
      handleDeleteWithScope(scope);
    } else {
      handleUpdateWithScope(scope);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative">
        <div className="absolute top-0 left-0 right-0 bottom-0 -z-10 bg-background">
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] opacity-50 blur-3xl"
            style={{
              background: `radial-gradient(circle, 
                hsl(350, 100%, 88%) 0%,
                hsl(25, 100%, 90%) 35%,
                hsl(35, 80%, 92%) 60%,
                transparent 80%
              )`
            }}
          />
        </div>
        <Navbar />
        <main className="container mx-auto px-4 pt-32 pb-12">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Gradient Background */}
      <div className="absolute top-0 left-0 right-0 bottom-0 -z-10 bg-background">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] opacity-50 blur-3xl"
          style={{
            background: `radial-gradient(circle, 
              hsl(350, 100%, 88%) 0%,
              hsl(25, 100%, 90%) 35%,
              hsl(35, 80%, 92%) 60%,
              transparent 80%
            )`
          }}
        />
      </div>

      <Navbar />
      
      <main className="container mx-auto px-4 pt-32 pb-12">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Back button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/organization/dashboard?tab=events')}
            className="gap-2"
            type="button"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-[400px_500px] gap-8 justify-center">
              {/* Left side - Cover Image */}
              <div>
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden max-w-sm group">
                  <img 
                    src={newImagePreview || existingImageUrl || defaultEventCover} 
                    alt="Cover" 
                    className="w-full h-full object-cover" 
                  />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {/* Upload status indicator */}
                  <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full border-2 border-white flex items-center justify-center transition-colors pointer-events-none"
                    style={{ backgroundColor: isImageUploading ? 'hsl(var(--muted))' : uploadedNewImageUrl ? 'hsl(142, 76%, 36%)' : 'hsl(var(--primary))' }}
                  >
                    {isImageUploading ? (
                      <Loader2 className="w-6 h-6 text-foreground animate-spin" />
                    ) : uploadedNewImageUrl ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-primary-foreground" />
                    )}
                  </div>
                  {/* Max size indicator - only show on hover when no image uploaded */}
                  {!newImagePreview && !existingImageUrl && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <p className="text-xs text-foreground bg-background/95 backdrop-blur-sm px-2 py-1 rounded shadow-lg border border-border whitespace-nowrap">
                        Max 2 Mo
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right side - Form */}
              <div className="space-y-6">
                {/* Public/Private Dropdown */}
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="gap-2 bg-black/5 hover:bg-black/10 border-0">
                        {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        {isPublic ? 'Public' : 'Privé'}
                        <ChevronDown className="h-4 w-4 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-80">
                      <DropdownMenuItem 
                        onClick={() => setIsPublic(true)}
                        className="flex items-start gap-3 p-4 cursor-pointer"
                      >
                        <Globe className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold mb-1">Public</div>
                          <div className="text-sm text-muted-foreground">
                            Affiché sur votre calendrier et éligible pour être mis en avant
                          </div>
                        </div>
                        {isPublic && <div className="text-primary">✓</div>}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setIsPublic(false)}
                        className="flex items-start gap-3 p-4 cursor-pointer"
                      >
                        <Lock className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold mb-1">Privé</div>
                          <div className="text-sm text-muted-foreground">
                            Non répertorié. Seules les personnes ayant le lien peuvent s'inscrire
                          </div>
                        </div>
                        {!isPublic && <div className="text-primary">✓</div>}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Event Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <input
                          {...field}
                          placeholder="Nom de l'event"
                          className="w-full bg-transparent border-0 outline-none text-4xl leading-tight font-semibold placeholder:text-muted-foreground/25"
                          aria-label="Nom de l'événement"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date & Time Block */}
                <EventDateTimeSection form={form} />

                {/* Recurrence Section */}
                <EventRecurrenceSection 
                  value={recurrenceData}
                  onChange={setRecurrenceData}
                />

                {/* Location */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Adresse</h3>
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="bg-black/[0.03] hover:bg-black/[0.05] rounded-md">
                            <GooglePlacesAutocomplete
                              value={field.value}
                              onChange={field.onChange}
                              onPlaceSelect={(place) => {
                                field.onChange(place.address);
                                setCoordinates({ latitude: place.latitude, longitude: place.longitude });
                              }}
                              placeholder="Rechercher une adresse ou un lieu"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Team Selector */}
                {organizationId && (
                  <TeamSelector
                    organizationId={organizationId}
                    selectedTeamId={selectedTeamId}
                    onTeamChange={setSelectedTeamId}
                    userRole={userRole}
                    userTeamId={userTeam?.teamId}
                  />
                )}

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RichTextEditor
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Ajouter une description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Cause Themes */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Catégorie</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="gap-2 bg-black/[0.03] hover:bg-black/[0.05] border-0 w-full justify-start">
                        {selectedCauseThemes.length > 0 ? (
                          <>
                            {(() => {
                              const selectedTheme = causeThemes.find(t => t.id === selectedCauseThemes[0]);
                              if (selectedTheme) {
                                const IconComponent = (Icons as any)[selectedTheme.icon] || Icons.Tag;
                                return (
                                  <>
                                    <IconComponent className="h-4 w-4" />
                                    {selectedTheme.name}
                                  </>
                                );
                              }
                              return (
                                <>
                                  <Tag className="h-4 w-4" />
                                  Sélectionner une catégorie
                                </>
                              );
                            })()}
                          </>
                        ) : (
                          <>
                            <Tag className="h-4 w-4" />
                            Sélectionner une catégorie
                          </>
                        )}
                        <ChevronDown className="h-4 w-4 ml-auto" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-80">
                      {causeThemes.map((theme) => {
                        const IconComponent = (Icons as any)[theme.icon] || Icons.Tag;
                        const isSelected = selectedCauseThemes.includes(theme.id);
                        return (
                          <DropdownMenuItem
                            key={theme.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedCauseThemes([]);
                              } else {
                                setSelectedCauseThemes([theme.id]);
                              }
                            }}
                            className="flex items-center gap-3 p-4 cursor-pointer"
                          >
                            <IconComponent className="h-5 w-5 flex-shrink-0" style={{ color: theme.color }} />
                            <div className="flex-1">
                              <div className="font-semibold">{theme.name}</div>
                            </div>
                            {isSelected && <div className="text-primary">✓</div>}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Event Options */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Options de l'événement</h3>
                  <div className="bg-black/[0.03] rounded-lg px-4 py-4 space-y-4">

                  {/* Capacity */}
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-sm font-normal">Capacité</FormLabel>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setTempCapacity(field.value || '');
                              setIsCapacityDialogOpen(true);
                            }}
                            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <span className="text-sm">
                              {field.value || 'Illimité'}
                            </span>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Require Approval */}
                  <FormField
                    control={form.control}
                    name="requireApproval"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-sm font-normal">Approbation requise</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Allow Self-Certification */}
                  <FormField
                    control={form.control}
                    name="allowSelfCertification"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-sm font-normal">Auto-certification</FormLabel>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          Permet aux participants de valider eux-mêmes leur présence
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" size="lg">
                    Mettre à jour
                  </Button>
                  {originalEvent?.recurrenceGroupId ? (
                    // For recurring events - show RecurrenceScopeDialog directly
                    <Button
                      type="button"
                      variant="destructive"
                      size="lg"
                      onClick={handleDeleteClick}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    // For single events - show confirmation AlertDialog
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" size="lg">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer l'événement ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. L'événement et toutes les inscriptions associées seront définitivement supprimés.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteSingle}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </form>
          </Form>

          {/* Participants Section */}
          {eventId && (
            <div className="max-w-[916px] mx-auto">
              <EventParticipantsSection eventId={eventId} />
            </div>
          )}
        </div>
      </main>

      {/* Capacity Dialog */}
      <Dialog open={isCapacityDialogOpen} onOpenChange={setIsCapacityDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
            <DialogTitle className="text-2xl">Capacité maximale</DialogTitle>
            <p className="text-sm text-muted-foreground pt-2">
              Fermeture automatique des inscriptions lorsque la capacité est atteinte. Seuls les invités approuvés comptent pour la limite.
            </p>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Capacité</label>
              <Input
                type="number"
                value={tempCapacity}
                onChange={(e) => setTempCapacity(e.target.value)}
                placeholder="50"
                className="text-lg"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Liste d'attente en cas de surcharge</label>
              <Switch
                checked={hasWaitlist}
                onCheckedChange={setHasWaitlist}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSetCapacity}
              className="flex-1"
              size="lg"
            >
              Définir la limite
            </Button>
            <Button
              onClick={handleRemoveCapacity}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Retirer la limite
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recurrence Scope Dialog */}
      <RecurrenceScopeDialog
        isOpen={scopeDialogOpen}
        onClose={() => {
          setScopeDialogOpen(false);
          setPendingFormData(null);
        }}
        onConfirm={handleScopeConfirm}
        actionType={scopeDialogAction}
        eventDate={originalEvent?.startDate ? new Date(originalEvent.startDate) : undefined}
        isLoading={isScopeActionLoading}
      />
    </div>
  );
}
