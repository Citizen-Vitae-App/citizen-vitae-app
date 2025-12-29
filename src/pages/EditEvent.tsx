import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Globe, Lock, ChevronDown, Users, UserCheck, ImageIcon, Tag, Trash2, Pencil, Loader2, Check, ShieldCheck } from 'lucide-react';
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
const eventSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  startDate: z.date({ required_error: 'Date de début requise' }),
  startTime: z.string().min(1, 'Heure de début requise'),
  endDate: z.date({ required_error: 'Date de fin requise' }),
  endTime: z.string().min(1, 'Heure de fin requise'),
  location: z.string().min(3, 'Lieu requis'),
  description: z.string().optional(),
  capacity: z.string().optional(),
  requireApproval: z.boolean().default(false),
  allowSelfCertification: z.boolean().default(false),
});

type EventFormData = z.infer<typeof eventSchema>;

interface OriginalEventData {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
}

export default function EditEvent() {
  const navigate = useNavigate();
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
          toast.error("Erreur lors de l'upload de l'image");
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

  const handleDelete = async () => {
    if (!eventId) return;
    
    setIsDeleting(true);
    try {
      // Notify participants about cancellation BEFORE deleting
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

      // Delete event cause themes first
      await supabase
        .from('event_cause_themes')
        .delete()
        .eq('event_id', eventId);

      // Delete event registrations
      await supabase
        .from('event_registrations')
        .delete()
        .eq('event_id', eventId);

      // Delete the event
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Événement supprimé');
      navigate('/organization/dashboard');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const onSubmit = async (data: EventFormData) => {
    if (!eventId || !organizationId) return;

    try {
      // Determine final image URL
      let finalImageUrl = existingImageUrl;

      // If a new image was selected
      if (newImagePreview) {
        if (isImageUploading && uploadPromiseRef.current) {
          toast.info('Finalisation de l\'upload de l\'image...');
          finalImageUrl = await uploadPromiseRef.current;
        } else if (uploadedNewImageUrl) {
          finalImageUrl = uploadedNewImageUrl;
        }
      }

      // Combine date and time
      const startDateTime = new Date(data.startDate);
      const [startHours, startMinutes] = data.startTime.split(':');
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

      const endDateTime = new Date(data.endDate);
      const [endHours, endMinutes] = data.endTime.split(':');
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

      // Update event
      const { error: updateError } = await supabase
        .from('events')
        .update({
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
        })
        .eq('id', eventId);

      if (updateError) {
        console.error('Error updating event:', updateError);
        toast.error("Erreur lors de la mise à jour");
        return;
      }

      // Update event cause themes
      // First delete existing
      await supabase
        .from('event_cause_themes')
        .delete()
        .eq('event_id', eventId);

      // Then insert new ones
      if (selectedCauseThemes.length > 0) {
        const causeThemeInserts = selectedCauseThemes.map(causeThemeId => ({
          event_id: eventId,
          cause_theme_id: causeThemeId,
        }));

        await supabase
          .from('event_cause_themes')
          .insert(causeThemeInserts);
      }

      // Detect changes and notify participants
      if (originalEvent) {
        // Compare timestamps to avoid ISO string format differences
        const originalStartTime = new Date(originalEvent.startDate).getTime();
        const originalEndTime = new Date(originalEvent.endDate).getTime();
        const newStartTime = startDateTime.getTime();
        const newEndTime = endDateTime.getTime();
        
        const locationChanged = data.location !== originalEvent.location;
        const startDateChanged = newStartTime !== originalStartTime;
        const endDateChanged = newEndTime !== originalEndTime;
        
        // Send separate notifications for each type of change
        const notifications: string[] = [];
        
        if (locationChanged) {
          notifications.push('mission_location_changed');
        }
        
        if (startDateChanged && endDateChanged) {
          notifications.push('mission_date_changed');
        } else if (startDateChanged) {
          notifications.push('mission_start_date_changed');
        } else if (endDateChanged) {
          notifications.push('mission_end_date_changed');
        }
        
        // Send all relevant notifications
        for (const notificationType of notifications) {
          console.log(`[EditEvent] Sending ${notificationType} notification to participants`);
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

      toast.success('Événement mis à jour !');
      navigate('/organization/dashboard');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Une erreur est survenue');
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
                    accept="image/*"
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
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
    </div>
  );
}
