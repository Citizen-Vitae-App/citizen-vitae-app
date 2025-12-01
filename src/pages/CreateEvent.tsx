import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, MapPin, Upload, Clock, Globe, Lock, ChevronDown, Calendar as CalendarIconLucide, CalendarCheck, Users, UserCheck, Pencil, ImageIcon, Tag } from 'lucide-react';
import * as Icons from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { 
  DropdownMenu,
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import defaultEventCover from '@/assets/default-event-cover.jpg';

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
});

type EventFormData = z.infer<typeof eventSchema>;

export default function CreateEvent() {
  const navigate = useNavigate();
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [isCapacityDialogOpen, setIsCapacityDialogOpen] = useState(false);
  const [tempCapacity, setTempCapacity] = useState('');
  const [hasWaitlist, setHasWaitlist] = useState(false);
  const [causeThemes, setCauseThemes] = useState<Array<{ id: string; name: string; icon: string; color: string }>>([]);
  const [selectedCauseThemes, setSelectedCauseThemes] = useState<string[]>([]);

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      requireApproval: false,
      capacity: '',
      startDate: now,
      startTime: now.toTimeString().slice(0, 5),
      endDate: now,
      endTime: oneHourLater.toTimeString().slice(0, 5),
      location: '',
      description: '',
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      // Get user's organization_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Vous devez être connecté');
        return;
      }

      const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (memberError || !memberData) {
        toast.error('Organisation non trouvée');
        return;
      }

      let uploadedImageUrl = null;

      // Upload cover image if provided
      if (coverImageFile) {
        const fileExt = coverImageFile.name.split('.').pop();
        const fileName = `${memberData.organization_id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('event-covers')
          .upload(fileName, coverImageFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          toast.error("Erreur lors de l'upload de l'image");
          console.error(uploadError);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('event-covers')
          .getPublicUrl(fileName);
        
        uploadedImageUrl = publicUrl;
      }

      // Combine date and time
      const startDateTime = new Date(data.startDate);
      const [startHours, startMinutes] = data.startTime.split(':');
      startDateTime.setHours(parseInt(startHours), parseInt(startMinutes));

      const endDateTime = new Date(data.endDate);
      const [endHours, endMinutes] = data.endTime.split(':');
      endDateTime.setHours(parseInt(endHours), parseInt(endMinutes));

      // Insert event
      const { data: eventData, error: insertError } = await supabase
        .from('events')
        .insert({
          organization_id: memberData.organization_id,
          name: data.name,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          location: data.location,
          description: data.description || null,
          capacity: data.capacity ? parseInt(data.capacity) : null,
          has_waitlist: hasWaitlist,
          require_approval: data.requireApproval,
          is_public: isPublic,
          cover_image_url: uploadedImageUrl,
        })
        .select()
        .single();

      if (insertError || !eventData) {
        console.error('Error creating event:', insertError);
        toast.error('Erreur lors de la création de l\'événement');
        return;
      }

      // Insert event cause themes
      if (selectedCauseThemes.length > 0) {
        const causeThemeInserts = selectedCauseThemes.map(causeThemeId => ({
          event_id: eventData.id,
          cause_theme_id: causeThemeId,
        }));

        const { error: causeThemeError } = await supabase
          .from('event_cause_themes')
          .insert(causeThemeInserts);

        if (causeThemeError) {
          console.error('Error adding cause themes:', causeThemeError);
          // Ne pas bloquer la création si les causes échouent
        }
      }

      toast.success('Événement créé avec succès !');
      navigate('/organization/dashboard');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Une erreur est survenue');
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Gradient Background - Same as Auth page */}
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
        <div className="max-w-6xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-[400px_500px] gap-8 justify-center">
              {/* Left side - Cover Image */}
              <div>
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden max-w-sm group">
                  <img 
                    src={coverImage || defaultEventCover} 
                    alt="Cover" 
                    className="w-full h-full object-cover" 
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {/* Upload badge indicator */}
                  <div className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-primary border-2 border-white flex items-center justify-center transition-colors group-hover:bg-primary/80 pointer-events-none">
                    <ImageIcon className="w-6 h-6 text-primary-foreground" />
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
                <div className="bg-black/[0.03] rounded-lg px-4 py-4 space-y-2">
                  {/* Start Date & Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIconLucide className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-normal text-foreground">Date de début</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "justify-start text-left font-normal bg-black/5 hover:bg-black/10 border-0",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? format(field.value, "PPP", { locale: fr }) : "Date"}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="time" className="bg-black/5 hover:bg-black/10 border-0 [&::-webkit-calendar-picker-indicator]:hidden" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* End Date & Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-normal text-foreground">Date de fin</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "justify-start text-left font-normal bg-black/5 hover:bg-black/10 border-0",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? format(field.value, "PPP", { locale: fr }) : "Date"}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input type="time" className="bg-black/5 hover:bg-black/10 border-0 [&::-webkit-calendar-picker-indicator]:hidden" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Adresse</h3>
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Rechercher une adresse ou un lieu"
                              className="pl-10 py-3 bg-black/[0.03] hover:bg-black/[0.05] border-0"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Description</h3>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Ajouter une description"
                            className="min-h-[120px] bg-black/[0.03] hover:bg-black/[0.05] border-0 px-4 pt-3"
                            {...field}
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
                  </div>
                </div>

                {/* Submit Button */}
                <Button type="submit" className="w-full" size="lg">
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
