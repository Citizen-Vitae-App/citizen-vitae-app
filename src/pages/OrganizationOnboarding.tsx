import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Building2, Globe, Users, ArrowRight, Check, UserPlus, AlertTriangle, Loader2, Upload, X } from 'lucide-react';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
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
  const [typeIsLocked, setTypeIsLocked] = useState(false);
  const [sector, setSector] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  
  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [existingLogoUrl, setExistingLogoUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [invitationAccepted, setInvitationAccepted] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);

  // Capture owner invitation on mount
  useEffect(() => {
    captureOwnerInvitation();
  }, []);

  // Accept the owner invitation via RPC (bypasses RLS)
  const acceptOwnerInvitation = async () => {
    if (!orgId || !user) return false;
    
    console.log('[OrgOnboarding] Accepting owner invitation for org:', orgId);
    
    const { data, error } = await supabase.rpc('accept_owner_invitation', {
      _org_id: orgId
    });
    
    if (error) {
      console.error('[OrgOnboarding] RPC error:', error);
      setInvitationError("Erreur lors de l'acceptation de l'invitation");
      return false;
    }
    
    const result = data as { success: boolean; error?: string; message?: string };
    
    if (!result.success) {
      console.error('[OrgOnboarding] Invitation not accepted:', result.error);
      setInvitationError(result.error || "Invitation invalide ou expirée");
      return false;
    }
    
    console.log('[OrgOnboarding] Invitation accepted:', result.message);
    setInvitationAccepted(true);
    return true;
  };

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
    
    // First accept the invitation, then load the organization
    const initializeOnboarding = async () => {
      const accepted = await acceptOwnerInvitation();
      if (accepted) {
        await loadOrganization();
      }
    };
    
    initializeOnboarding();
  }, [user, authLoading, orgId, orgNameFromUrl, navigate]);

  const loadOrganization = async () => {
    if (!orgId) return;
    
    console.log('[OrgOnboarding] Loading organization:', orgId);
    
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();
    
    if (error) {
      console.error('[OrgOnboarding] Error loading organization:', error);
      toast.error("Impossible de charger l'organisation");
      return;
    }
    
    if (data) {
      console.log('[OrgOnboarding] Organization loaded:', data.name);
      setOrgName(data.name || '');
      setOrgType(data.type || '');
      // Lock the type field if it was pre-defined by super admin
      if (data.type && data.type !== '') {
        setTypeIsLocked(true);
      }
      setSector(data.sector || '');
      setDescription(data.description || '');
      setWebsite(data.website || '');
      setAddress(data.address || '');
      setEmployeeCount(data.employee_count?.toString() || '');
      if (data.logo_url) {
        setExistingLogoUrl(data.logo_url);
      }
    }
  };

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Le fichier est trop volumineux (max 5 Mo)');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStep1 = async () => {
    if (!orgName || !orgType) {
      toast.error('Veuillez remplir le nom et le type de l\'organisation');
      return;
    }

    setIsLoading(true);
    
    let logoUrl = existingLogoUrl;
    
    // Upload logo if a new file was selected
    if (logoFile && orgId) {
      const fileExt = logoFile.name.split('.').pop();
      const filePath = `logos/${orgId}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(filePath, logoFile, { upsert: true });
      
      if (uploadError) {
        console.error('Error uploading logo:', uploadError);
        toast.error('Erreur lors de l\'upload du logo');
        setIsLoading(false);
        return;
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(filePath);
      
      logoUrl = publicUrlData.publicUrl;
    }
    
    // Mettre à jour l'organisation existante
    const { error } = await supabase
      .from('organizations')
      .update({ 
        name: orgName, 
        type: orgType,
        visibility: 'public',
        logo_url: logoUrl || null,
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
    
    // Mark organization as verified/active since onboarding is complete
    await supabase
      .from('organizations')
      .update({ is_verified: true })
      .eq('id', orgId);
    
    // Mark user onboarding as completed to prevent redirect loop
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user?.id);
    
    setIsLoading(false);
    toast.success('Organisation configurée avec succès !');
    
    // Clear the invitation handoff since we're done
    clearOwnerInvitation();
    
    navigate('/organization/dashboard');
  };

  const handleFinishWithoutProfile = async () => {
    setIsLoading(true);
    
    // Mark organization as verified/active since onboarding is complete
    await supabase
      .from('organizations')
      .update({ is_verified: true })
      .eq('id', orgId);
    
    // Mark user onboarding as completed
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user?.id);

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
        {/* Error state */}
        {invitationError && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-destructive">Invitation invalide</h1>
              <p className="text-muted-foreground mt-2">{invitationError}</p>
            </div>
            <Button onClick={() => navigate('/')} variant="outline">
              Retour à l'accueil
            </Button>
          </div>
        )}

        {/* Loading state while accepting invitation */}
        {!invitationError && !invitationAccepted && (
          <div className="space-y-6 text-center py-12">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto" />
            <div>
              <h1 className="text-xl font-semibold">Préparation de votre espace...</h1>
              <p className="text-muted-foreground">Veuillez patienter</p>
            </div>
          </div>
        )}

        {/* Main wizard - only show after invitation accepted */}
        {!invitationError && invitationAccepted && (
          <>
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
              {/* Logo upload */}
              <div className="space-y-2">
                <Label>Logo de l'organisation</Label>
                <div className="flex items-center gap-4">
                  {(logoPreview || existingLogoUrl) ? (
                    <div className="relative">
                      <img 
                        src={logoPreview || existingLogoUrl} 
                        alt="Logo preview" 
                        className="w-20 h-20 rounded-lg object-cover border border-border"
                      />
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                    >
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoPreview || existingLogoUrl ? 'Changer le logo' : 'Ajouter un logo'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG jusqu'à 5 Mo</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </div>
              </div>

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
                <Select value={orgType} onValueChange={setOrgType} disabled={typeIsLocked}>
                  <SelectTrigger className={typeIsLocked ? 'opacity-60 cursor-not-allowed' : ''}>
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
                <GooglePlacesAutocomplete
                  value={address}
                  onChange={setAddress}
                  onPlaceSelect={(place) => setAddress(place.address)}
                  placeholder="Rechercher une adresse..."
                  inputClassName="border border-input rounded-md bg-background"
                />
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
          </>
        )}
      </div>
    </div>
  );
}
