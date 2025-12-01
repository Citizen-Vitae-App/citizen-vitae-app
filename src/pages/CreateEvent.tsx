import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, MapPin, Upload, Clock } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      requireApproval: false,
      capacity: '',
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-32 pb-12">
        <div className="max-w-6xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left side - Cover Image */}
              <div>
                <label className="block text-sm font-medium mb-2">Image de couverture</label>
                <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                  {coverImage ? (
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Télécharger une image</p>
                      </div>
                    </div>
                  )}
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
                {/* Event Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Nom de l'événement"
                          className="text-2xl font-semibold border-0 px-0 focus-visible:ring-0 placeholder:text-muted-foreground"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Start Date & Time */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground w-16">Début</span>
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : "Date"}
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
                        <FormItem className="w-24">
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* End Date & Time */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground w-16">Fin</span>
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP") : "Date"}
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
                        <FormItem className="w-24">
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-4">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <FormControl>
                          <Input
                            placeholder="Ajouter un lieu ou un lien virtuel"
                            className="border-0 bg-muted px-3 flex-1"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Ajouter une description"
                          className="min-h-[120px] bg-muted border-0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Event Options */}
                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-medium">Options de l'événement</h3>

                  {/* Capacity */}
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm font-normal">Capacité</FormLabel>
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
                          <FormLabel className="text-sm font-normal">Approbation requise</FormLabel>
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
