import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EXPERIENCE_TYPES = [
  { value: 'benevole_permanent', label: 'Bénévole permanent' },
  { value: 'benevole_ponctuel', label: 'Bénévole ponctuel' },
  { value: 'administrateur', label: 'Administrateur·trice' },
  { value: 'membre_actif', label: 'Membre actif' },
  { value: 'service_civique', label: 'Service civique' },
  { value: 'volontariat_international', label: 'Volontariat international' },
  { value: 'responsable_mission', label: 'Responsable de mission' },
  { value: 'stagiaire_associatif', label: 'Stagiaire associatif' },
  { value: 'mentor', label: 'Mentor / Parrain' },
  { value: 'formateur', label: 'Formateur·trice' },
] as const;

const LOCATION_TYPES = [
  { value: 'onsite', label: 'Sur site' },
  { value: 'hybrid', label: 'Hybride' },
  { value: 'remote', label: 'À distance' },
] as const;

const MONTHS = [
  { value: '1', label: 'Janvier' },
  { value: '2', label: 'Février' },
  { value: '3', label: 'Mars' },
  { value: '4', label: 'Avril' },
  { value: '5', label: 'Mai' },
  { value: '6', label: 'Juin' },
  { value: '7', label: 'Juillet' },
  { value: '8', label: 'Août' },
  { value: '9', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => currentYear - i);

const formSchema = z.object({
  title: z.string().trim().min(1, 'Le titre est requis').max(200),
  experience_type: z.string().min(1, 'Le type est requis'),
  organization_name: z.string().trim().min(1, "L'organisation est requise").max(200),
  start_month: z.string().min(1, 'Le mois est requis'),
  start_year: z.string().min(1, "L'année est requise"),
  is_current: z.boolean().default(false),
  end_month: z.string().optional(),
  end_year: z.string().optional(),
  location: z.string().max(200).optional(),
  location_type: z.string().optional(),
  description: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddManualExperienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddManualExperienceDialog({ open, onOpenChange }: AddManualExperienceDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      experience_type: '',
      organization_name: '',
      start_month: '',
      start_year: '',
      is_current: false,
      end_month: '',
      end_year: '',
      location: '',
      location_type: '',
      description: '',
    },
  });

  const isCurrent = form.watch('is_current');

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!user?.id) throw new Error('Non authentifié');

      const { error } = await supabase.from('manual_experiences' as any).insert({
        user_id: user.id,
        title: values.title,
        experience_type: values.experience_type,
        organization_name: values.organization_name,
        start_month: parseInt(values.start_month),
        start_year: parseInt(values.start_year),
        end_month: values.is_current ? null : values.end_month ? parseInt(values.end_month) : null,
        end_year: values.is_current ? null : values.end_year ? parseInt(values.end_year) : null,
        is_current: values.is_current,
        location: values.location || null,
        location_type: values.location_type || null,
        description: values.description || null,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manual-experiences'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('Expérience ajoutée avec succès');
      form.reset();
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erreur lors de l'ajout de l'expérience");
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };

  const isMobile = useIsMobile();

  const formFields = (
    <>
        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titre *</FormLabel>
              <FormControl>
                <Input placeholder="Ex : Bénévole aux Restos du Cœur" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Experience type */}
        <FormField
          control={form.control}
          name="experience_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type d'expérience *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EXPERIENCE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Organization */}
        <FormField
          control={form.control}
          name="organization_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organisation *</FormLabel>
              <FormControl>
                <Input placeholder="Ex : Croix-Rouge française" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start date */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="start_month"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mois de début *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Mois" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="start_year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Année de début *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Is current */}
        <FormField
          control={form.control}
          name="is_current"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal">J'occupe actuellement ce poste</FormLabel>
            </FormItem>
          )}
        />

        {/* End date */}
        {!isCurrent && (
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="end_month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mois de fin</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Mois" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Année de fin</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Année" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Location */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lieu</FormLabel>
              <FormControl>
                <Input placeholder="Ex : Paris, France" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location type */}
        <FormField
          control={form.control}
          name="location_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de lieu</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LOCATION_TYPES.map((lt) => (
                    <SelectItem key={lt.value} value={lt.value}>
                      {lt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Décrivez votre rôle et vos contributions..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
    </>
  );

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {formFields}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Ajout...' : 'Ajouter'}
          </Button>
        </div>
      </form>
    </Form>
  );

  const mobileFormContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {formFields}
        </div>
        <div className="sticky bottom-0 bg-background pt-3 pb-1 border-t border-border -mx-4 px-4">
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Ajout...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] px-4 pb-4 overflow-hidden flex flex-col">
          <DrawerHeader className="text-left px-0 flex-shrink-0">
            <DrawerTitle>Ajouter une expérience</DrawerTitle>
            <DrawerDescription>
              Ajoutez une expérience citoyenne non certifiée à votre profil.
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 min-h-0">
            {mobileFormContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une expérience</DialogTitle>
          <DialogDescription>
            Ajoutez une expérience citoyenne non certifiée à votre profil.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}

export { EXPERIENCE_TYPES };
