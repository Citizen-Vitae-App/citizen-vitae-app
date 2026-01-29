import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { changeLanguage, type SupportedLanguage } from '@/i18n/config';

export interface UserPreferences {
  user_id: string;
  language: 'fr' | 'en';
  email_opt_in: boolean;
  sms_opt_in: boolean;
  phone_number: string | null;
  geolocation_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesData {
  language?: 'fr' | 'en';
  email_opt_in?: boolean;
  sms_opt_in?: boolean;
  phone_number?: string | null;
  geolocation_enabled?: boolean;
}

export const useUserPreferences = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation('toasts');

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
              geolocation_enabled: false,
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
      
      // If language is being updated, sync with i18next
      if (updates.language) {
        await changeLanguage(updates.language as SupportedLanguage);
      }
      
      return data as UserPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] });
      toast.success(t('preferences.updated'), {
        description: t('preferences.updatedDescription'),
      });
    },
    onError: (error) => {
      console.error('Error updating preferences:', error);
      toast.error(t('preferences.updateError'), {
        description: t('preferences.updateErrorDescription'),
      });
    },
  });

  const updatePreferences = (updates: UpdatePreferencesData) => {
    updateMutation.mutate(updates);
  };

  return {
    preferences,
    isLoading: isAuthLoading || isLoading,
    error,
    updatePreferences,
    isUpdating: updateMutation.isPending,
  };
};
