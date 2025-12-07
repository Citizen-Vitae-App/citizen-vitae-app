import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface UserPreferences {
  user_id: string;
  language: 'fr' | 'en';
  email_opt_in: boolean;
  sms_opt_in: boolean;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesData {
  language?: 'fr' | 'en';
  email_opt_in?: boolean;
  sms_opt_in?: boolean;
  phone_number?: string | null;
}

export const useUserPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user preferences
  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no preferences exist, create default ones
        if (error.code === 'PGRST116') {
          const { data: newPrefs, error: insertError } = await supabase
            .from('user_preferences')
            .insert({
              user_id: user.id,
              language: 'fr',
              email_opt_in: true,
              sms_opt_in: false,
            })
            .select()
            .single();
          
          if (insertError) throw insertError;
          return newPrefs as UserPreferences;
        }
        throw error;
      }
      
      return data as UserPreferences;
    },
    enabled: !!user?.id,
  });

  // Update preferences mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: UpdatePreferencesData) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as UserPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] });
      toast({
        title: 'Préférences mises à jour',
        description: 'Vos préférences ont été enregistrées.',
      });
    },
    onError: (error) => {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour vos préférences.',
        variant: 'destructive',
      });
    },
  });

  const updatePreferences = (updates: UpdatePreferencesData) => {
    updateMutation.mutate(updates);
  };

  return {
    preferences,
    isLoading,
    error,
    updatePreferences,
    isUpdating: updateMutation.isPending,
  };
};
