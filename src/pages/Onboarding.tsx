import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { CauseThemeTag } from '@/components/CauseThemeTag';
import { IdentityVerificationCard } from '@/components/IdentityVerificationCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface CauseTheme {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // État pour la date de naissance (Date object pour le DatePicker)
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined); 
  
  const [causeThemes, setCauseThemes] = useState<CauseTheme[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGoogleData, setHasGoogleData] = useState(false);
  
  // Geolocation state
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'error'>('idle');
  const [geoError, setGeoError] = useState<string | null>(null);

  // Empêcher le scroll pendant tout l'onboarding
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Thèmes par défaut (Fallback)
  const defaultThemes: CauseTheme[] = [
    { name: 'Environnement', icon: 'Leaf', color: '#10b981', id: 'env' },
    { name: 'Éducation', icon: 'GraduationCap', color: '#3b82f6', id: 'edu' },
    { name: 'Solidarité', icon: 'Heart', color: '#ec4899', id: 'solid' },
    { name: 'Santé', icon: 'HeartPulse', color: '#ef4444', id: 'health' },
    { name: 'Culture', icon: 'Palette', color: '#8b5cf6', id: 'culture' },
    { name: 'Sport', icon: 'Dumbbell', color: '#f59e0b', id: 'sport' },
    { name: 'Animaux', icon: 'PawPrint', color: '#84cc16', id: 'animals' },
    { name: 'Insertion professionnelle', icon: 'Briefcase', color: '#06b6d4', id: 'work' },
    { name: 'Logement', icon: 'Home', color: '#f97316', id: 'housing' },
    { name: 'Égalité & diversité', icon: 'Users', color: '#a855f7', id: 'equality' },
  ];
  
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate('/');
      return;
    }
    
    // Pré-remplir les données si elles existent (Google OAuth)
    if (profile) {
      if (profile.first_name) setFirstName(profile.first_name);
      if (profile.last_name) setLastName(profile.last_name);
      
      // Si prénom ET nom sont déjà remplis → sauter l'étape 1
      if (profile.first_name && profile.last_name) {
        setHasGoogleData(true);
        setStep(2);
      }
    }
  }, [profile, navigate]);

  useEffect(() => {
    fetchCauseThemes();
  }, []);

  const fetchCauseThemes = async () => {
    // Note Architecte: Utilisation correcte de supabase.from (lecture simple hors AuthContext)
    // Idéalement, à migrer vers useQuery plus tard pour le cache
    const { data, error } = await supabase
      .from('cause_themes')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Erreur chargement thèmes', error);
      setCauseThemes(defaultThemes);
      return;
    }

    if (!data || data.length === 0) {
      setCauseThemes(defaultThemes);
      return;
    }

    setCauseThemes(data as CauseTheme[]);
  };

  const handleStep1 = async () => {
    if (!firstName || !lastName) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName })
      .eq('id', user?.id);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setStep(2);
  };

  const handleStep2 = () => {
    setStep(3); 
  };
  const requestGeolocation = async () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setGeoStatus('requesting');
    setGeoError(null);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    navigator.geolocation.getCurrentPosition(
      async () => {
        // Success - save preference
        setGeoStatus('granted');
        
        // Save to user_preferences
        if (user?.id) {
          await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              geolocation_enabled: true,
            }, { onConflict: 'user_id' });
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeoStatus('denied');
          if (isIOS) {
            setGeoError('Accès refusé. Allez dans Réglages > Confidentialité > Service de localisation > Safari et autorisez l\'accès.');
          } else {
            setGeoError('Accès refusé. Cliquez sur le cadenas 🔒 dans la barre d\'adresse, puis activez "Position".');
          }
        } else {
          setGeoStatus('error');
          setGeoError('Impossible d\'obtenir votre position. Réessayez.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: isIOS ? 15000 : 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleStep3 = async () => {
    setStep(4);
  };

  const handleStep4 = async () => {
    if (!dateOfBirth) {
      toast.error('Veuillez sélectionner votre date de naissance');
      return;
    }

    // Validation de l'âge minimum (13 ans)
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    if (age < 13) {
      toast.error("Vous devez avoir au moins 13 ans.");
      return;
    }

    setIsLoading(true);
    
    // Convertir la date en format ISO (YYYY-MM-DD) pour Supabase
    const dateString = dateOfBirth.toISOString().split('T')[0];
    
    const { error } = await supabase
      .from('profiles')
      .update({ date_of_birth: dateString })
      .eq('id', user?.id);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setStep(5);
  };

  const handleFinish = async () => {
    if (selectedThemes.length < 2 || selectedThemes.length > 3) {
      toast.error('Veuillez sélectionner entre 2 et 3 thèmes');
      return;
    }

    setIsLoading(true);
    
    // Delete existing themes first to avoid conflicts
    await supabase
      .from('user_cause_themes')
      .delete()
      .eq('user_id', user?.id);

    const themeInserts = selectedThemes.map(themeId => ({
      user_id: user?.id,
      cause_theme_id: themeId
    }));

    const { error: themesError } = await supabase
      .from('user_cause_themes')
      .insert(themeInserts);

    if (themesError) {
      console.error('Error saving themes:', themesError);
      toast.error('Erreur lors de la sauvegarde des thèmes');
      setIsLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user?.id);

    if (profileError) {
      toast.error('Erreur lors de la finalisation');
      setIsLoading(false);
      return;
    }

    // Refresh the profile in AuthContext to update onboarding_completed state
    await refreshProfile();

    // Récupérer les rôles de l'utilisateur pour la redirection
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user?.id);

    const userRoles = rolesData?.map(r => r.role) || [];

    toast.success('Bienvenue sur CitizenVitae !');
    
    if (userRoles.includes('super_admin')) {
      navigate('/admin');
    } else if (userRoles.includes('organization')) {
      navigate('/organization/dashboard');
    } else {
      navigate('/');
    }
  };

  const toggleTheme = (themeId: string) => {
    if (selectedThemes.includes(themeId)) {
      setSelectedThemes(selectedThemes.filter(id => id !== themeId));
    } else if (selectedThemes.length < 3) {
      setSelectedThemes([...selectedThemes, themeId]);
    }
  };

  return (
    <div className="h-screen w-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background gradient */}
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

      <div className="w-full max-w-2xl bg-background rounded-2xl shadow-lg p-8 overflow-y-auto max-h-[calc(100vh-2rem)]">
        {/* Progress indicator - now 5 steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div 
              key={s}
              className={`h-2 w-12 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Informations personnelles</h1>
              <p className="text-muted-foreground">Commençons par faire connaissance</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Prénom</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Nom</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <Button 
              onClick={handleStep1} 
              className="w-full" 
              size="lg"
              disabled={isLoading}
            >
              Continuer
            </Button>
          </div>
        )}

        {/* Step 2: Identity Verification */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Vérification d'identité</h1>
              <p className="text-muted-foreground">
                Vérifiez votre identité pour accéder à toutes les fonctionnalités
              </p>
            </div>

            <IdentityVerificationCard 
              userId={user?.id || ''} 
              isVerified={profile?.id_verified || false}
            />

            <p className="text-sm text-muted-foreground text-center">
              Vous pouvez aussi compléter cette étape plus tard dans vos paramètres
            </p>

            <div className="flex gap-4">
              {!hasGoogleData && (
                <Button 
                  onClick={() => setStep(1)} 
                  variant="outline"
                  className="w-full" 
                  size="lg"
                >
                  Retour
                </Button>
              )}
              <Button 
                onClick={handleStep2} 
                className="w-full" 
                size="lg"
                variant={profile?.id_verified ? "default" : "outline"}
              >
                {profile?.id_verified ? 'Continuer' : 'Passer cette étape'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Geolocation */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Géolocalisation</h1>
              <p className="text-muted-foreground">
                Pour certifier votre présence sur place lors des missions, nous avons besoin d'accéder à votre position
              </p>
            </div>

            <div className="bg-muted/30 rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Pourquoi la géolocalisation ?</h3>
                  <p className="text-sm text-muted-foreground">
                    Elle permet de vérifier que vous êtes bien sur le lieu de la mission pour valider votre participation
                  </p>
                </div>
              </div>

              {geoStatus === 'idle' && (
                <Button 
                  onClick={requestGeolocation} 
                  className="w-full"
                  size="lg"
                >
                  <MapPin className="h-5 w-5 mr-2" />
                  Activer la géolocalisation
                </Button>
              )}

              {geoStatus === 'requesting' && (
                <div className="flex items-center justify-center gap-2 p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Demande d'autorisation...</span>
                </div>
              )}

              {geoStatus === 'granted' && (
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Géolocalisation activée avec succès !</span>
                </div>
              )}

              {(geoStatus === 'denied' || geoStatus === 'error') && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                    <span className="text-sm">{geoError}</span>
                  </div>
                  <Button 
                    onClick={requestGeolocation} 
                    variant="outline"
                    className="w-full"
                  >
                    Réessayer
                  </Button>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Vous pourrez modifier ce paramètre à tout moment dans vos réglages
            </p>

            <div className="flex gap-4">
              <Button 
                onClick={() => setStep(2)} 
                variant="outline"
                className="w-full" 
                size="lg"
              >
                Retour
              </Button>
              <Button 
                onClick={handleStep3} 
                className="w-full" 
                size="lg"
                variant={geoStatus === 'granted' ? "default" : "outline"}
              >
                {geoStatus === 'granted' ? 'Continuer' : 'Passer cette étape'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Date of Birth - DatePicker moderne */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Date de naissance</h1>
              <p className="text-muted-foreground">Cette information reste privée</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date-of-birth">Votre date de naissance</Label>
                <DatePicker
                  date={dateOfBirth}
                  onDateChange={setDateOfBirth}
                  placeholder="JJ/MM/AAAA"
                  maxDate={new Date()}
                  minDate={new Date(1920, 0, 1)}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => setStep(3)} 
                variant="outline"
                className="w-full" 
                size="lg"
              >
                Retour
              </Button>
              <Button 
                onClick={handleStep4} 
                className="w-full" 
                size="lg"
                disabled={isLoading || !dateOfBirth}
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Cause Themes */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Vos centres d'intérêt</h1>
              <p className="text-muted-foreground">
                Choisissez 2 à 3 causes qui vous tiennent à cœur
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedThemes.length}/3 sélectionné(s)
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {causeThemes.map((theme) => (
                <CauseThemeTag
                  key={theme.id}
                  name={theme.name}
                  icon={theme.icon}
                  color={theme.color}
                  selected={selectedThemes.includes(theme.id)}
                  onClick={() => toggleTheme(theme.id)}
                />
              ))}
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => setStep(4)} 
                variant="outline"
                className="w-full" 
                size="lg"
              >
                Retour
              </Button>
              <Button 
                onClick={handleFinish} 
                className="w-full" 
                size="lg"
                disabled={isLoading || selectedThemes.length < 2 || selectedThemes.length > 3}
              >
                Terminer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
