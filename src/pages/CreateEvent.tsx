import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, MapPin, Upload, Clock, Globe, Lock, ChevronDown, Calendar as CalendarIconLucide, CalendarCheck, Users, UserCheck } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  const [isPublic, setIsPublic] = useState(true);

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
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: EventFormData) => {
    console.log('Event data:', data);
    toast.success('Événement créé avec succès !');
    navigate('/organization/dashboard');
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
                <div className="relative aspect-square bg-muted rounded-lg overflow-hidden max-w-sm">
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
                          placeholder="Event Name"
                          className="w-full bg-transparent border-0 outline-none text-4xl leading-tight font-semibold placeholder:text-muted-foreground/25"
                          aria-label="Nom de l'événement"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date & Time Block */}
                <div className="bg-black/[0.03] rounded-lg px-6 py-4 space-y-4">
                  {/* Start Date & Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIconLucide className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">Date de début</span>
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
                      <span className="text-sm font-medium text-muted-foreground">Date de fin</span>
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
                              className="pl-10 bg-black/[0.03] hover:bg-black/10 border-0"
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
                            className="min-h-[120px] bg-black/[0.03] hover:bg-black/10 border-0 px-4 pt-3"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Event Options */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Options de l'événement</h3>
                  <div className="bg-black/[0.03] rounded-lg px-6 py-4 space-y-4">

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
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Illimité"
                              className="w-32 text-right bg-transparent border-0"
                              {...field}
                            />
                          </FormControl>
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
    </div>
  );
}
