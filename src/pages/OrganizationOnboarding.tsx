import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Globe, MapPin, Users, ArrowRight, Check, UserPlus } from 'lucide-react';
import { captureOwnerInvitation, clearOwnerInvitation } from '@/lib/invitationHandoff';

const organizationTypes = [
  { value: 'company', label: 'Entreprise' },
  { value: 'association', label: 'Association' },
  { value: 'foundation', label: 'Fondation' },
  { value: 'institution', label: 'Institution publique' },
];

const sectors = [
  'Agriculture',
  'Agroalimentaire',
  'Banque & Assurance',
  'BTP & Construction',
  'Commerce & Distribution',
  'Culture & Médias',
  'Éducation & Formation',
  'Énergie',
  'Environnement',
  'Industrie',
  'Informatique & Tech',
  'Juridique',
  'Luxe & Mode',
  'ONG & Humanitaire',
  'Santé',
  'Services aux entreprises',
  'Sport & Loisirs',
  'Tourisme & Hôtellerie',
  'Transport & Logistique',
  'Autre',
];

export default function OrganizationOnboarding() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  
  // Organization info from URL
  const orgId = searchParams.get('org');
  const orgNameFromUrl = searchParams.get('orgName');
  
  // Form state
  const [orgName, setOrgName] = useState(orgNameFromUrl || '');
  const [orgType, setOrgType] = useState('');
  const [sector, setSector] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Capture owner invitation on mount
  useEffect(() => {
    captureOwnerInvitation();
  }, []);

  useEffect(() => {
    // Ne rien faire tant que l'auth est en cours de chargement
    if (authLoading) {
      return;
    }

    // Vérifier si l'utilisateur est connecté
    if (!user) {
      // Préserver le redirect vers cette page pour après l'auth
      const currentUrl = `/organization/onboarding${orgId ? `?org=${orgId}` : ''}${orgNameFromUrl ? `&orgName=${encodeURIComponent(orgNameFromUrl)}` : ''}`;
      toast.error("Veuillez vous connecter d'abord");
      navigate(`/auth?redirect=${encodeURIComponent(currentUrl)}`);
      return;
    }

    // Valider que l'orgId est présent
    if (!orgId) {
      toast.error("Lien d'invitation invalide ou incomplet");
      navigate('/');
      return;
    }
    
    // Charger les données de l'organisation existante
    loadOrganization();
  }, [user, authLoading, orgId, orgNameFromUrl, navigate]);

  const loadOrganization = async () => {
    if (!orgId) return;
    
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    
    if (error) {
      console.error('Erreur chargement organisation:', error);
      return;
    }
    
    if (data) {
      setOrgName(data.name || '');
      setOrgType(data.type || '');
      setSector(data.sector || '');
      setDescription(data.description || '');
      setWebsite(data.website || '');
      setAddress(data.address || '');
      setEmployeeCount(data.employee_count?.toString() || '');
    }
  };

  const handleStep1 = async () => {
    if (!orgName || !orgType) {
      toast.error('Veuillez remplir le nom et le type de l\'organisation');
      return;
    }

    setIsLoading(true);
    
    // Mettre à jour l'organisation existante
    const { error } = await supabase
      .from('organizations')
      .update({ 
        name: orgName, 
        type: orgType,
        visibility: 'public'
      })
      .eq('id', orgId);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setStep(2);
  };

  const handleStep2 = async () => {
    setIsLoading(true);
    
    const { error } = await supabase
      .from('organizations')
      .update({ 
        sector,
        description,
        employee_count: employeeCount ? parseInt(employeeCount) : null,
      })
      .eq('id', orgId);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setStep(3);
  };

  const handleStep3 = async () => {
    setIsLoading(true);
    
    const { error } = await supabase
      .from('organizations')
      .update({ 
        website,
        address,
      })
      .eq('id', orgId);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(error);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    setStep(4);
  };

  const handleFinishWithProfile = async () => {
    setIsLoading(true);
    
    // Créer le membership pour l'owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .upsert({
        organization_id: orgId,
        user_id: user?.id,
        role: 'admin',
        is_owner: true,
      }, { onConflict: 'organization_id,user_id' });

    if (memberError) {
      console.error('Erreur membership:', memberError);
      toast.error('Erreur lors de la configuration');
      setIsLoading(false);
      return;
    }

    // Ajouter le rôle organization si pas déjà présent
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user?.id)
      .eq('role', 'organization')
      .single();

    if (!existingRole) {
      await supabase
        .from('user_roles')
        .insert({ user_id: user?.id, role: 'organization' });
    }

    // Mettre à jour l'invitation comme acceptée
    await supabase
      .from('organization_invitations')
      .update({ 
        status: 'accepted', 
        responded_at: new Date().toISOString() 
      })
      .eq('organization_id', orgId)
      .eq('invitation_type', 'owner');

    setIsLoading(false);
    toast.success('Organisation configurée avec succès !');
    
    // Clear the invitation handoff since we're done
    clearOwnerInvitation();
    
    // Toujours rediriger vers le dashboard org, l'onboarding user est optionnel
    navigate('/organization/dashboard');
  };

  const handleFinishWithoutProfile = async () => {
    setIsLoading(true);
    
    // Créer le membership pour l'owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .upsert({
        organization_id: orgId,
        user_id: user?.id,
        role: 'admin',
        is_owner: true,
      }, { onConflict: 'organization_id,user_id' });

    if (memberError) {
      console.error('Erreur membership:', memberError);
      toast.error('Erreur lors de la configuration');
      setIsLoading(false);
      return;
    }

    // Ajouter le rôle organization
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user?.id)
      .eq('role', 'organization')
      .single();

    if (!existingRole) {
      await supabase
        .from('user_roles')
        .insert({ user_id: user?.id, role: 'organization' });
    }

    // Marquer l'onboarding comme complété pour ne pas redemander
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user?.id);

    // Mettre à jour l'invitation comme acceptée
    await supabase
      .from('organization_invitations')
      .update({ 
        status: 'accepted', 
        responded_at: new Date().toISOString() 
      })
      .eq('organization_id', orgId)
      .eq('invitation_type', 'owner');

    setIsLoading(false);
    toast.success('Organisation configurée avec succès !');
    
    // Clear the invitation handoff since we're done
    clearOwnerInvitation();
    
    navigate('/organization/dashboard');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute top-0 left-0 right-0 bottom-0 -z-10 bg-background">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] opacity-50 blur-3xl"
          style={{
            background: `radial-gradient(circle, 
              hsl(142, 76%, 85%) 0%,
              hsl(142, 70%, 90%) 35%,
              hsl(120, 60%, 92%) 60%,
              transparent 80%
            )`
          }}
        />
      </div>

      <div className="w-full max-w-2xl bg-background rounded-2xl shadow-lg p-8">
        {/* Progress indicator - 4 steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s}
              className={`h-2 w-12 rounded-full transition-colors ${
                s <= step ? 'bg-emerald-500' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Configurez votre organisation</h1>
                <p className="text-muted-foreground">Informations de base</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Nom de l'organisation *</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Ex: Croix-Rouge française"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgType">Type d'organisation *</Label>
                <Select value={orgType} onValueChange={setOrgType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleStep1} 
              className="w-full bg-emerald-600 hover:bg-emerald-700" 
              size="lg"
              disabled={isLoading}
            >
              Continuer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Détails de l'organisation</h1>
                <p className="text-muted-foreground">Parlez-nous de votre structure</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sector">Secteur d'activité</Label>
                <Select value={sector} onValueChange={setSector}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un secteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez brièvement votre organisation et sa mission..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeCount">Nombre d'employés</Label>
                <Input
                  id="employeeCount"
                  type="number"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  placeholder="Ex: 50"
                />
              </div>
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
                className="w-full bg-emerald-600 hover:bg-emerald-700" 
                size="lg"
                disabled={isLoading}
              >
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Contact Info */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Globe className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Coordonnées</h1>
                <p className="text-muted-foreground">Comment vous trouver</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="website">Site web</Label>
                <Input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.exemple.org"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 rue de l'exemple, 75001 Paris"
                    className="pl-10"
                  />
                </div>
              </div>
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
                onClick={handleStep3} 
                className="w-full bg-emerald-600 hover:bg-emerald-700" 
                size="lg"
                disabled={isLoading}
              >
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Finish */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Organisation configurée !</h1>
                <p className="text-muted-foreground">Encore une dernière étape</p>
              </div>
            </div>

            <div className="bg-muted/30 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold">Récapitulatif de votre organisation</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nom :</span>
                  <span className="font-medium">{orgName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type :</span>
                  <span className="font-medium">
                    {organizationTypes.find(t => t.value === orgType)?.label || orgType}
                  </span>
                </div>
                {sector && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Secteur :</span>
                    <span className="font-medium">{sector}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Souhaitez-vous compléter votre profil personnel maintenant ?
              </p>
              
              <Button 
                onClick={handleFinishWithProfile} 
                className="w-full bg-emerald-600 hover:bg-emerald-700" 
                size="lg"
                disabled={isLoading}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Oui, compléter mon profil
              </Button>

              <Button 
                onClick={handleFinishWithoutProfile} 
                variant="outline"
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                Non, aller directement au dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
