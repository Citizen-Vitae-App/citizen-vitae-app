import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { CauseThemeTag } from '@/components/CauseThemeTag';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
  const [birthDate, setBirthDate] = useState<Date>();
  const [causeThemes, setCauseThemes] = useState<CauseTheme[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate('/');
    }
  }, [profile, navigate]);

  useEffect(() => {
    fetchCauseThemes();
  }, []);

  const fetchCauseThemes = async () => {
    const { data } = await supabase
      .from('cause_themes')
      .select('*')
      .order('name');
    
    if (data) setCauseThemes(data);
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

  const handleStep2 = async () => {
    if (!birthDate) {
      toast.error('Veuillez sélectionner votre date de naissance');
      return;
    }

    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ date_of_birth: format(birthDate, 'yyyy-MM-dd') })
      .eq('id', user?.id);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setStep(3);
  };

  const handleFinish = async () => {
    if (selectedThemes.length < 2 || selectedThemes.length > 3) {
      toast.error('Veuillez sélectionner entre 2 et 3 thèmes');
      return;
    }

    setIsLoading(true);
    
    const themeInserts = selectedThemes.map(themeId => ({
      user_id: user?.id,
      cause_theme_id: themeId
    }));

    const { error: themesError } = await supabase
      .from('user_cause_themes')
      .insert(themeInserts);

    if (themesError) {
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

    toast.success('Bienvenue sur CitizenVitae !');
    navigate('/');
  };

  const toggleTheme = (themeId: string) => {
    if (selectedThemes.includes(themeId)) {
      setSelectedThemes(selectedThemes.filter(id => id !== themeId));
    } else if (selectedThemes.length < 3) {
      setSelectedThemes([...selectedThemes, themeId]);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
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

      <div className="w-full max-w-2xl bg-background rounded-2xl shadow-lg p-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div 
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

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

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2">Date de naissance</h1>
              <p className="text-muted-foreground">Quand êtes-vous né(e) ?</p>
            </div>

            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={birthDate}
                onSelect={setBirthDate}
                locale={fr}
                disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                initialFocus
                className="rounded-md border"
              />
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={() => setStep(1)} 
                variant="outline"
                className="w-full" 
                size="lg"
              >
                Retour
              </Button>
              <Button 
                onClick={handleStep2} 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                Continuer
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
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
                onClick={() => setStep(2)} 
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
