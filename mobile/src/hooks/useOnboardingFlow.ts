import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/contexts/AuthContext';

export interface CauseThemeRow {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const DEFAULT_THEMES: CauseThemeRow[] = [
  { name: 'Environnement', icon: 'Leaf', color: '#10b981', id: 'env' },
  { name: 'Éducation', icon: 'GraduationCap', color: '#3b82f6', id: 'edu' },
  { name: 'Solidarité', icon: 'Heart', color: '#ec4899', id: 'solid' },
  { name: 'Santé', icon: 'HeartPulse', color: '#ef4444', id: 'health' },
  { name: 'Culture', icon: 'Palette', color: '#8b5cf6', id: 'culture' },
  { name: 'Sport', icon: 'Dumbbell', color: '#f59e0b', id: 'sport' },
];

export function useOnboardingFlow(
  userId: string | undefined,
  profile: Profile | null,
  refreshProfile: () => Promise<void>
) {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 25);
    return d;
  });
  const [causeThemes, setCauseThemes] = useState<CauseThemeRow[]>(DEFAULT_THEMES);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGoogleData, setHasGoogleData] = useState(false);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>(
    'idle'
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const didApplyProfileHints = useRef(false);

  useEffect(() => {
    if (!profile?.id || didApplyProfileHints.current) return;
    didApplyProfileHints.current = true;
    if (profile.first_name) setFirstName(profile.first_name);
    if (profile.last_name) setLastName(profile.last_name);
    if (profile.first_name && profile.last_name) {
      setHasGoogleData(true);
      setStep(2);
    }
  }, [profile?.id, profile?.first_name, profile?.last_name]);

  const fetchCauseThemes = useCallback(async () => {
    const { data, error } = await supabase.from('cause_themes').select('*').order('name');
    if (error || !data?.length) {
      setCauseThemes(DEFAULT_THEMES);
      return;
    }
    setCauseThemes(data as CauseThemeRow[]);
  }, []);

  useEffect(() => {
    void fetchCauseThemes();
  }, [fetchCauseThemes]);

  const handleStep1 = async (): Promise<string | null> => {
    if (!firstName.trim() || !lastName.trim()) {
      return 'Renseigne ton prénom et ton nom.';
    }
    if (!userId) return 'Session invalide.';
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ first_name: firstName.trim(), last_name: lastName.trim() })
        .eq('id', userId);
      if (error) return error.message || 'Erreur lors de la sauvegarde.';
      setStep(2);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const requestGeolocation = async () => {
    setGeoStatus('requesting');
    setGeoError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGeoStatus('denied');
        setGeoError("Accès refusé. Tu peux activer la localisation dans les réglages de l'appareil.");
        return;
      }
      await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGeoStatus('granted');
      if (userId) {
        await supabase.from('user_preferences').upsert(
          { user_id: userId, geolocation_enabled: true },
          { onConflict: 'user_id' }
        );
      }
    } catch {
      setGeoStatus('error');
      setGeoError('Impossible de récupérer ta position. Réessaie.');
    }
  };

  const handleStep4 = async (): Promise<string | null> => {
    if (!userId) return 'Session invalide.';
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const m = today.getMonth() - dateOfBirth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) age--;
    if (age < 13) return 'Tu dois avoir au moins 13 ans.';
    setIsLoading(true);
    try {
      const dateString = dateOfBirth.toISOString().split('T')[0];
      const { error } = await supabase
        .from('profiles')
        .update({ date_of_birth: dateString })
        .eq('id', userId);
      if (error) return error.message || 'Erreur lors de la sauvegarde.';
      setStep(5);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async (): Promise<string | null> => {
    if (selectedThemes.length < 2 || selectedThemes.length > 3) {
      return 'Choisis entre 2 et 3 causes.';
    }
    if (!userId) return 'Session invalide.';
    setIsLoading(true);
    try {
      await supabase.from('user_cause_themes').delete().eq('user_id', userId);
      const inserts = selectedThemes.map((cause_theme_id) => ({ user_id: userId, cause_theme_id }));
      const { error: themesError } = await supabase.from('user_cause_themes').insert(inserts);
      if (themesError) return themesError.message || 'Erreur lors de la sauvegarde des thèmes.';
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);
      if (profileError) return profileError.message || 'Erreur lors de la finalisation.';
      await refreshProfile();
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = (themeId: string) => {
    setSelectedThemes((prev) => {
      if (prev.includes(themeId)) return prev.filter((id) => id !== themeId);
      if (prev.length >= 3) return prev;
      return [...prev, themeId];
    });
  };

  return {
    step,
    setStep,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    dateOfBirth,
    setDateOfBirth,
    causeThemes,
    selectedThemes,
    toggleTheme,
    isLoading,
    hasGoogleData,
    geoStatus,
    geoError,
    requestGeolocation,
    handleStep1,
    handleStep4,
    handleFinish,
  };
}
