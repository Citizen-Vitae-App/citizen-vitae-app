import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type ProfileVisibility = 'connections' | 'network' | 'public';

export interface UserPreferences {
  user_id: string;
  language: 'fr' | 'en';
  email_opt_in: boolean;
  sms_opt_in: boolean;
  phone_number: string | null;
  geolocation_enabled: boolean;
  profile_visibility: ProfileVisibility;
  show_organizations: boolean;
  show_causes: boolean;
  show_impact: boolean;
  show_experiences: boolean;
  show_upcoming_events: boolean;
  created_at: string;
  updated_at: string;
}

export type UpdatePreferencesData = Partial<
  Pick<
    UserPreferences,
    | 'language'
    | 'email_opt_in'
    | 'sms_opt_in'
    | 'phone_number'
    | 'geolocation_enabled'
    | 'profile_visibility'
    | 'show_organizations'
    | 'show_causes'
    | 'show_impact'
    | 'show_experiences'
    | 'show_upcoming_events'
  >
>;

export function useUserPreferences() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user_preferences', user?.id],
    queryFn: async (): Promise<UserPreferences | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', user.id).single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: created, error: insertError } = await supabase
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
          return created as UserPreferences;
        }
        throw error;
      }
      return data as UserPreferences;
    },
    enabled: !!user?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: UpdatePreferencesData) => {
      if (!user?.id) throw new Error('Non authentifié');
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
      void queryClient.invalidateQueries({ queryKey: ['user_preferences', user?.id] });
    },
  });

  return {
    preferences: preferences ?? null,
    isLoading: isAuthLoading || isLoading,
    updatePreferences: (updates: UpdatePreferencesData) => updateMutation.mutate(updates),
    isUpdating: updateMutation.isPending,
  };
}
