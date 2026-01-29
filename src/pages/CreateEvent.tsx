import { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { OrganizationMobileHeader } from '@/components/organization/OrganizationMobileHeader';
import { useQueryClient } from '@tanstack/react-query';
import { useRecentlyModifiedEvents } from '@/hooks/useRecentlyModifiedEvents';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Globe, Lock, ChevronDown, Users, UserCheck, ImageIcon, Tag, Pencil, Loader2, Check, ShieldCheck, ArrowLeft } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import defaultEventCover from '@/assets/default-event-cover.jpg';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import { EventDateTimeSection } from '@/components/EventDateTimeSection';
import { EventRecurrenceSection, RecurrenceData } from '@/components/EventRecurrenceSection';
import { useBackgroundImageUpload } from '@/hooks/useBackgroundImageUpload';
import { TeamSelector } from '@/components/organization/TeamSelector';
import { useUserTeam } from '@/hooks/useTeams';
import { generateOccurrenceDates, generateRecurrenceGroupId } from '@/lib/recurrenceUtils';
import { eventSchema, type EventFormData } from '@/lib/validation/eventSchemas';
export default function CreateEvent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  // Scroll to top on mount
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const [isPublic, setIsPublic] = useState(true);
  const [isCapacityDialogOpen, setIsCapacityDialogOpen] = useState(false);
  const [tempCapacity, setTempCapacity] = useState('');
  const [hasWaitlist, setHasWaitlist] = useState(false);
  const [causeThemes, setCauseThemes] = useState<Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
  }>>([]);
  const [selectedCauseThemes, setSelectedCauseThemes] = useState<string[]>([]);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'leader' | 'member'>('member');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Recurrence state
  const [recurrenceData, setRecurrenceData] = useState<RecurrenceData>({
    isRecurring: false,
    frequency: 'weekly',
    interval: 1,
    weekDays: [],
    endType: 'after_occurrences',
    occurrences: 10
  });

  // Background image upload hook
  const {
    previewUrl: coverImage,
    uploadedUrl,
    isUploading: isImageUploading,
    handleFileSelect,
    waitForUpload
  } = useBackgroundImageUpload({
    bucket: 'event-covers',
    organizationId
  });
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      requireApproval: false,
      allowSelfCertification: false,
      capacity: '',
      startDate: now,
      startTime: now.toTimeString().slice(0, 5),
      endDate: now,
      endTime: oneHourLater.toTimeString().slice(0, 5),
      location: '',
      description: ''
    }
  });

  // Get user's team info for leaders
  const {
    userTeam,
    isLeader
  } = useUserTeam(currentUserId, organizationId);

  // Fetch organization ID and user role on mount
  useEffect(() => {
    const fetchOrgAndRole = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const {
          data
        } = await supabase.from('organization_members').select('organization_id, role').eq('user_id', user.id).single();
        if (data) {
          setOrganizationId(data.organization_id);
          setUserRole(data.role as 'admin' | 'leader' | 'member');
        }
      }
    };
    fetchOrgAndRole();
  }, []);

  // Auto-select team for leaders
  useEffect(() => {
    if (isLeader && userTeam?.teamId) {
      setSelectedTeamId(userTeam.teamId);
    }
  }, [isLeader, userTeam]);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };
  useEffect(() => {
    const fetchCauseThemes = async () => {
      const {
        data,
        error
      } = await supabase.from('cause_themes').select('id, name, icon, color').order('name');
      if (!error && data) {
        setCauseThemes(data);
      }
    };
    fetchCauseThemes();
  }, []);
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
  const onSubmit = async (data: EventFormData) => {
    try {
      if (!organizationId) {
        toast.error('Organisation non trouvée');
        return;
      }

      // Wait for background upload to complete if still in progress
      let imageUrl: string | null = null;
      if (coverImage) {
        if (isImageUploading) {
          toast.info('Finalisation de l\'upload de l\'image...');
        }
        imageUrl = await waitForUpload();
      }

      // Combine date and time
      const startDateTime = new Date(data.startDate);
      const [startHours, startMinutes] = data.startTime.split(':');
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
      const endDateTime = new Date(data.endDate);
      const [endHours, endMinutes] = data.endTime.split(':');
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);

      // Base event data
      const baseEventData = {
        organization_id: organizationId,
        name: data.name,
        location: data.location,
        description: data.description || null,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        has_waitlist: hasWaitlist,
        require_approval: data.requireApproval,
        allow_self_certification: data.allowSelfCertification,
        is_public: isPublic,
        cover_image_url: imageUrl,
        latitude: coordinates?.latitude || null,
        longitude: coordinates?.longitude || null,
        team_id: selectedTeamId
      };
      let createdEventIds: string[] = [];
      let usedRecurrenceGroupId: string | null = null;
      if (recurrenceData.isRecurring) {
        // Generate recurrence group ID
        usedRecurrenceGroupId = generateRecurrenceGroupId();

        // Generate all occurrence dates
        const occurrences = generateOccurrenceDates(startDateTime, endDateTime, {
          frequency: recurrenceData.frequency,
          interval: recurrenceData.interval,
          weekDays: recurrenceData.weekDays,
          endType: recurrenceData.endType,
          endDate: recurrenceData.endDate,
          occurrences: recurrenceData.occurrences
        });
        if (occurrences.length === 0) {
          toast.error('Aucune occurrence générée. Vérifiez les paramètres de récurrence.');
          return;
        }

        // Create all occurrences as individual events
        const eventsToInsert = occurrences.map(occ => ({
          ...baseEventData,
          start_date: occ.start.toISOString(),
          end_date: occ.end.toISOString(),
          is_recurring: true,
          recurrence_group_id: usedRecurrenceGroupId,
          recurrence_frequency: recurrenceData.frequency,
          recurrence_interval: recurrenceData.interval,
          recurrence_days: recurrenceData.frequency === 'weekly' ? recurrenceData.weekDays : null,
          recurrence_end_type: recurrenceData.endType,
          recurrence_end_date: recurrenceData.endType === 'on_date' && recurrenceData.endDate ? recurrenceData.endDate.toISOString().split('T')[0] : null,
          recurrence_occurrences: recurrenceData.endType === 'after_occurrences' ? recurrenceData.occurrences : null
        }));
        const {
          data: insertedEvents,
          error: insertError
        } = await supabase.from('events').insert(eventsToInsert).select('id');
        if (insertError || !insertedEvents) {
          console.error('Error creating recurring events:', insertError);
          toast.error('Erreur lors de la création des événements récurrents');
          return;
        }
        createdEventIds = insertedEvents.map(e => e.id);
        toast.success(`${occurrences.length} événements créés avec succès !`);
      } else {
        // Single event creation
        const {
          data: eventData,
          error: insertError
        } = await supabase.from('events').insert({
          ...baseEventData,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          is_recurring: false,
          recurrence_group_id: null,
          recurrence_frequency: null,
          recurrence_interval: null,
          recurrence_days: null,
          recurrence_end_type: null,
          recurrence_end_date: null,
          recurrence_occurrences: null
        }).select('id').single();
        if (insertError || !eventData) {
          console.error('Error creating event:', insertError);
          toast.error('Erreur lors de la création de l\'événement');
          return;
        }
        createdEventIds = [eventData.id];
        toast.success('Événement créé avec succès !');
      }

      // Insert event cause themes for all created events
      if (selectedCauseThemes.length > 0 && createdEventIds.length > 0) {
        const causeThemeInserts = createdEventIds.flatMap(eventId => selectedCauseThemes.map(causeThemeId => ({
          event_id: eventId,
          cause_theme_id: causeThemeId
        })));
        const {
          error: causeThemeError
        } = await supabase.from('event_cause_themes').insert(causeThemeInserts);
        if (causeThemeError) {
          console.error('Error adding cause themes:', causeThemeError);
          // Don't block creation if cause themes fail
        }
      }

      // Mark events as recently created for visual feedback
      useRecentlyModifiedEvents.getState().markEventsAsRecent(createdEventIds, usedRecurrenceGroupId);
      
      // Invalidate organization events queries to refresh the list immediately
      // This ensures new events appear without requiring a page refresh
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
  return <div className="min-h-screen relative">
      {/* Gradient Background - Same as Auth page */}
      <div className="absolute top-0 left-0 right-0 bottom-0 -z-10 bg-background">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] opacity-50 blur-3xl" style={{
        background: `radial-gradient(circle, 
              hsl(350, 100%, 88%) 0%,
              hsl(25, 100%, 90%) 35%,
              hsl(35, 80%, 92%) 60%,
              transparent 80%
            )`
      }} />
      </div>

      {/* Header: Mobile uses OrganizationMobileHeader, Desktop uses Navbar */}
      {isMobile ? <OrganizationMobileHeader /> : <Navbar />}
      
      <main className={`container mx-auto px-4 pb-12 ${isMobile ? 'pt-20' : 'pt-32'}`}>
        <div className="max-w-6xl mx-auto">
          {/* Back button */}
          <Button variant="ghost" onClick={() => navigate('/organization/dashboard?tab=events')} className="mb-6 gap-2" type="button">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-[400px_500px] gap-8 justify-center">
              {/* Left side - Cover Image */}
              <div>
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden max-w-sm group">
                  <img src={coverImage || defaultEventCover} alt="Cover" className="w-full h-full object-cover" />
                  <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {/* Upload status indicator */}
                  <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full border-2 border-white flex items-center justify-center transition-colors pointer-events-none" style={{
                  backgroundColor: isImageUploading ? 'hsl(var(--muted))' : uploadedUrl ? 'hsl(142, 76%, 36%)' : 'hsl(var(--primary))'
                }}>
                    {isImageUploading ? <Loader2 className="w-6 h-6 text-foreground animate-spin" /> : uploadedUrl ? <Check className="w-6 h-6 text-white" /> : <ImageIcon className="w-6 h-6 text-primary-foreground" />}
                  </div>
                  {/* Max size indicator - only show on hover when no image uploaded */}
                  {!coverImage && (
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
                      <DropdownMenuItem onClick={() => setIsPublic(true)} className="flex items-start gap-3 p-4 cursor-pointer">
                        <Globe className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold mb-1">Public</div>
                          <div className="text-sm text-muted-foreground">
                            Événement ouvert à l'ensemble de la communauté Citizen Vitae.          
                          </div>
                        </div>
                        {isPublic && <div className="text-primary">✓</div>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsPublic(false)} className="flex items-start gap-3 p-4 cursor-pointer">
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
                <FormField control={form.control} name="name" render={({
                field
              }) => <FormItem>
                      <FormControl>
                        <input {...field} placeholder="Nom de l'event" className="w-full bg-transparent border-0 outline-none text-4xl leading-tight font-semibold placeholder:text-muted-foreground/25" aria-label="Nom de l'événement" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />

                {/* Date & Time Block */}
                <EventDateTimeSection form={form} />

                {/* Recurrence Section */}
                <EventRecurrenceSection value={recurrenceData} onChange={setRecurrenceData} />

                {/* Location */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Adresse</h3>
                  <FormField control={form.control} name="location" render={({
                  field
                }) => <FormItem>
                        <FormControl>
                          <div className="bg-black/[0.03] hover:bg-black/[0.05] rounded-md">
                            <GooglePlacesAutocomplete value={field.value} onChange={field.onChange} onPlaceSelect={place => {
                        field.onChange(place.address);
                        setCoordinates({
                          latitude: place.latitude,
                          longitude: place.longitude
                        });
                      }} placeholder="Rechercher une adresse ou un lieu" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                {/* Team Selector */}
                {organizationId && <TeamSelector organizationId={organizationId} selectedTeamId={selectedTeamId} onTeamChange={setSelectedTeamId} userRole={userRole} userTeamId={userTeam?.teamId} />}

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  <FormField control={form.control} name="description" render={({
                  field
                }) => <FormItem>
                        <FormControl>
                          <RichTextEditor value={field.value} onChange={field.onChange} placeholder="Ajouter une description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </div>

                {/* Cause Themes */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Catégorie</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="gap-2 bg-black/[0.03] hover:bg-black/[0.05] border-0 w-full justify-start">
                        {selectedCauseThemes.length > 0 ? <>
                            {(() => {
                          const selectedTheme = causeThemes.find(t => t.id === selectedCauseThemes[0]);
                          if (selectedTheme) {
                            const IconComponent = (Icons as any)[selectedTheme.icon] || Icons.Tag;
                            return <>
                                    <IconComponent className="h-4 w-4" />
                                    {selectedTheme.name}
                                  </>;
                          }
                          return <>
                                  <Tag className="h-4 w-4" />
                                  Sélectionner une catégorie
                                </>;
                        })()}
                          </> : <>
                            <Tag className="h-4 w-4" />
                            Sélectionner une catégorie
                          </>}
                        <ChevronDown className="h-4 w-4 ml-auto" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-80">
                      {causeThemes.map(theme => {
                      const IconComponent = (Icons as any)[theme.icon] || Icons.Tag;
                      const isSelected = selectedCauseThemes.includes(theme.id);
                      return <DropdownMenuItem key={theme.id} onClick={() => {
                        if (isSelected) {
                          setSelectedCauseThemes([]);
                        } else {
                          setSelectedCauseThemes([theme.id]);
                        }
                      }} className="flex items-center gap-3 p-4 cursor-pointer">
                            <IconComponent className="h-5 w-5 flex-shrink-0" style={{
                          color: theme.color
                        }} />
                            <div className="flex-1">
                              <div className="font-semibold">{theme.name}</div>
                            </div>
                            {isSelected && <div className="text-primary">✓</div>}
                          </DropdownMenuItem>;
                    })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Event Options */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Options de l'événement</h3>
                  <div className="bg-black/[0.03] rounded-lg px-4 py-4 space-y-4">

                  {/* Capacity */}
                  <FormField control={form.control} name="capacity" render={({
                    field
                  }) => <FormItem>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-sm font-normal">Capacité</FormLabel>
                          </div>
                          <button type="button" onClick={() => {
                        setTempCapacity(field.value || '');
                        setIsCapacityDialogOpen(true);
                      }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                            <span className="text-sm">
                              {field.value || 'Illimité'}
                            </span>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>} />

                  {/* Require Approval */}
                  <FormField control={form.control} name="requireApproval" render={({
                    field
                  }) => <FormItem>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-sm font-normal">Approbation requise</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>} />

                  {/* Allow Self-Certification */}
                  <FormField control={form.control} name="allowSelfCertification" render={({
                    field
                  }) => <FormItem>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                            <FormLabel className="text-sm font-normal">Auto-certification</FormLabel>
                          </div>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                        <p className="text-xs text-muted-foreground pl-6">
                          Permet aux participants de valider eux-mêmes leur présence
                        </p>
                        <FormMessage />
                      </FormItem>} />
                  </div>
                </div>

                {/* Submit Button */}
                <Button type="submit" size="lg" className="w-full">
                  Créer l'événement
                </Button>
              </div>
            </form>
          </Form>
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
              <Input type="number" value={tempCapacity} onChange={e => setTempCapacity(e.target.value)} placeholder="50" className="text-lg" />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Liste d'attente en cas de surcharge</label>
              <Switch checked={hasWaitlist} onCheckedChange={setHasWaitlist} />
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSetCapacity} className="flex-1" size="lg">
              Définir la limite
            </Button>
            <Button onClick={handleRemoveCapacity} variant="outline" className="flex-1" size="lg">
              Retirer la limite
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}