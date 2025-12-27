import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Upload, Camera, Globe, Building2, Users, MapPin, Mail, Phone, Link2, Linkedin, Instagram, Twitter, Save, Loader2, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useOrganizationSettings, OrganizationSettings as OrgSettings } from '@/hooks/useOrganizationSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
const urlSchema = z.string().url().optional().or(z.literal(''));
const emailSchema = z.string().email().optional().or(z.literal(''));
export default function OrganizationSettings() {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    organization,
    organizationId,
    isAdmin,
    isLoading,
    organizationCauses,
    allCauseThemes,
    sectors,
    updateSettings,
    updateCauses,
    uploadImage,
    checkSlugAvailability,
    generateSlug
  } = useOrganizationSettings();
  const [formData, setFormData] = useState<Partial<OrgSettings>>({});
  const [selectedCauses, setSelectedCauses] = useState<string[]>([]);
  const [customRoleTitle, setCustomRoleTitle] = useState<string>('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch current user's custom role title
  useEffect(() => {
    const fetchCustomRoleTitle = async () => {
      if (!user?.id || !organizationId) return;
      const {
        data,
        error
      } = await supabase.from('organization_members').select('custom_role_title').eq('user_id', user.id).eq('organization_id', organizationId).single();
      if (!error && data?.custom_role_title) {
        setCustomRoleTitle(data.custom_role_title);
      }
    };
    fetchCustomRoleTitle();
  }, [user?.id, organizationId]);

  // Initialize form data when organization loads
  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        description: organization.description || '',
        bio: organization.bio || '',
        logo_url: organization.logo_url,
        cover_image_url: organization.cover_image_url,
        slug: organization.slug || '',
        visibility: organization.visibility || 'public',
        address: organization.address || '',
        latitude: organization.latitude,
        longitude: organization.longitude,
        email: organization.email || '',
        phone: organization.phone || '',
        website: organization.website || '',
        linkedin_url: organization.linkedin_url || '',
        instagram_url: organization.instagram_url || '',
        twitter_url: organization.twitter_url || '',
        sector: organization.sector || '',
        employee_count: organization.employee_count
      });
    }
  }, [organization]);

  // Initialize selected causes
  useEffect(() => {
    if (organizationCauses.length > 0) {
      setSelectedCauses(organizationCauses.map(c => c.cause_theme_id));
    }
  }, [organizationCauses]);

  // Check slug availability with debounce
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug) {
      setSlugError(null);
      return;
    }
    setIsCheckingSlug(true);
    const isAvailable = await checkSlugAvailability(slug);
    setSlugError(isAvailable ? null : 'Ce slug est déjà utilisé');
    setIsCheckingSlug(false);
  }, [checkSlugAvailability]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.slug && formData.slug !== organization?.slug) {
        checkSlug(formData.slug);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.slug, organization?.slug, checkSlug]);
  const handleInputChange = (field: keyof OrgSettings, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };
  const handleGenerateSlug = () => {
    if (formData.name) {
      const newSlug = generateSlug(formData.name);
      handleInputChange('slug', newSlug);
    }
  };
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, 'logo');
    if (url) {
      handleInputChange('logo_url', url);
    }
  };
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file, 'cover');
    if (url) {
      handleInputChange('cover_image_url', url);
    }
  };
  const toggleCause = (causeId: string) => {
    setSelectedCauses(prev => {
      const newCauses = prev.includes(causeId) ? prev.filter(id => id !== causeId) : [...prev, causeId];
      setHasChanges(true);
      return newCauses;
    });
  };
  const handleAddressSelect = (place: {
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    setFormData(prev => ({
      ...prev,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude
    }));
    setHasChanges(true);
  };
  const validateForm = (): boolean => {
    // Validate URLs
    if (formData.website) {
      const result = urlSchema.safeParse(formData.website);
      if (!result.success) {
        toast.error('URL du site web invalide');
        return false;
      }
    }
    if (formData.linkedin_url) {
      const result = urlSchema.safeParse(formData.linkedin_url);
      if (!result.success) {
        toast.error('URL LinkedIn invalide');
        return false;
      }
    }
    if (formData.email) {
      const result = emailSchema.safeParse(formData.email);
      if (!result.success) {
        toast.error('Email de contact invalide');
        return false;
      }
    }
    if (slugError) {
      toast.error('Le slug est déjà utilisé');
      return false;
    }
    return true;
  };
  const handleSave = async () => {
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      // Update organization settings
      await updateSettings.mutateAsync(formData);

      // Update causes if changed
      const currentCauseIds = organizationCauses.map(c => c.cause_theme_id);
      const causesChanged = selectedCauses.length !== currentCauseIds.length || selectedCauses.some(id => !currentCauseIds.includes(id));
      if (causesChanged) {
        await updateCauses.mutateAsync(selectedCauses);
      }

      // Update custom role title
      if (user?.id && organizationId) {
        await supabase.from('organization_members').update({
          custom_role_title: customRoleTitle || null
        }).eq('user_id', user.id).eq('organization_id', organizationId);
      }
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };
  if (isLoading) {
    return <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>;
  }
  if (!isAdmin || !organization) {
    return <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground">Vous n'avez pas accès à cette page.</p>
          <Button variant="outline" onClick={() => navigate('/organization/dashboard')}>
            Retour au tableau de bord
          </Button>
        </div>
      </div>;
  }
  return <>
      <Helmet>
        <title>Paramètres de l'organisation | Citizen Vitae</title>
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 pt-20 md:pt-24 pb-24 md:pb-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate('/organization/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Paramètres de l'organisation</h1>
                <p className="text-muted-foreground text-sm">
                  Personnalisez le profil public de votre organisation
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Cover Image */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Image de couverture</CardTitle>
                  <CardDescription>
                    Cette image apparaîtra en haut de votre page publique
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full h-40 md:h-56 rounded-lg overflow-hidden bg-muted border border-border">
                    {formData.cover_image_url ? <img src={formData.cover_image_url} alt="Couverture" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-muted-foreground">
                        <Camera className="h-8 w-8" />
                      </div>}
                    <label className="absolute bottom-4 right-4 cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                      <Button variant="secondary" size="sm" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Modifier
                        </span>
                      </Button>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Logo & Name */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Identité</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-3">
                      <Avatar className="h-24 w-24 border-2 border-border">
                        <AvatarImage src={formData.logo_url || undefined} />
                        <AvatarFallback className="text-2xl">
                          {formData.name?.charAt(0) || 'O'}
                        </AvatarFallback>
                      </Avatar>
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Logo
                          </span>
                        </Button>
                      </label>
                    </div>

                    {/* Name & Description */}
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nom de l'organisation</Label>
                        <Input id="name" value={formData.name || ''} onChange={e => handleInputChange('name', e.target.value)} placeholder="Nom de votre organisation" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">
                          Description courte
                          <span className="text-muted-foreground text-xs ml-2">
                            ({(formData.description || '').length}/400)
                          </span>
                        </Label>
                        <Textarea id="description" value={formData.description || ''} onChange={e => handleInputChange('description', e.target.value.slice(0, 400))} placeholder="Décrivez brièvement votre organisation..." className="resize-none" rows={3} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Mission & Vision (optionnel)</Label>
                    <RichTextEditor value={formData.bio || ''} onChange={html => handleInputChange('bio', html)} placeholder="Décrivez en détail la mission et les valeurs de votre organisation..." />
                  </div>
                </CardContent>
              </Card>

              {/* Causes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Causes favorites
                  </CardTitle>
                  <CardDescription>
                    Sélectionnez les causes qui définissent votre organisation. Elles seront proposées par défaut lors de la création d'événements.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {allCauseThemes.map(cause => <Badge key={cause.id} variant={selectedCauses.includes(cause.id) ? 'default' : 'outline'} className="cursor-pointer transition-colors py-1.5 px-3" style={{
                    backgroundColor: selectedCauses.includes(cause.id) ? cause.color : 'transparent',
                    borderColor: cause.color,
                    color: selectedCauses.includes(cause.id) ? 'white' : cause.color
                  }} onClick={() => toggleCause(cause.id)}>
                        <span className="mr-1">{cause.icon}</span>
                        {cause.name}
                      </Badge>)}
                  </div>
                </CardContent>
              </Card>

              {/* Visibility & URL */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Visibilité & URL
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Visibilité de la page</Label>
                    <RadioGroup value={formData.visibility || 'public'} onValueChange={value => handleInputChange('visibility', value)} className="space-y-2">
                      <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="public" id="public" />
                        <Label htmlFor="public" className="flex-1 cursor-pointer">
                          <span className="font-medium">Public</span>
                          <p className="text-sm text-muted-foreground">
                            Visible par tous sur internet
                          </p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="private" id="private" />
                        <Label htmlFor="private" className="flex-1 cursor-pointer">
                          <span className="font-medium">Privé</span>
                          <p className="text-sm text-muted-foreground">
                            Visible uniquement par les membres
                          </p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value="invite_only" id="invite_only" />
                        <Label htmlFor="invite_only" className="flex-1 cursor-pointer">
                          <span className="font-medium">Sur invitation</span>
                          <p className="text-sm text-muted-foreground">
                            Accessible uniquement sur demande approuvée
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">URL publique</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          citizenvitae.com/org/
                        </span>
                        <Input id="slug" value={formData.slug || ''} onChange={e => handleInputChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} className="pl-[155px]" placeholder="mon-organisation" />
                      </div>
                      <Button variant="outline" onClick={handleGenerateSlug} disabled={!formData.name}>
                        Générer
                      </Button>
                    </div>
                    {isCheckingSlug && <p className="text-xs text-muted-foreground">Vérification...</p>}
                    {slugError && <p className="text-xs text-destructive">{slugError}</p>}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Coordonnées
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email de contact</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" value={formData.email || ''} onChange={e => handleInputChange('email', e.target.value)} className="pl-10" placeholder="contact@organisation.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="phone" type="tel" value={formData.phone || ''} onChange={e => handleInputChange('phone', e.target.value)} className="pl-10" placeholder="+33 1 23 45 67 89" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Site web</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="website" type="url" value={formData.website || ''} onChange={e => handleInputChange('website', e.target.value)} className="pl-10" placeholder="https://www.organisation.com" />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label className="text-base">Réseaux sociaux</Label>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="linkedin" className="text-sm text-muted-foreground">LinkedIn</Label>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="linkedin" value={formData.linkedin_url || ''} onChange={e => handleInputChange('linkedin_url', e.target.value)} className="pl-10" placeholder="LinkedIn" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="instagram" className="text-sm text-muted-foreground">Instagram</Label>
                        <div className="relative">
                          <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="instagram" value={formData.instagram_url || ''} onChange={e => handleInputChange('instagram_url', e.target.value)} className="pl-10" placeholder="Instagram" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="twitter" className="text-sm text-muted-foreground">X (Twitter)</Label>
                        <div className="relative">
                          <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input id="twitter" value={formData.twitter_url || ''} onChange={e => handleInputChange('twitter_url', e.target.value)} className="pl-10" placeholder="X" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Localisation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="address">Adresse du siège</Label>
                    <GooglePlacesAutocomplete value={formData.address || ''} onChange={value => handleInputChange('address', value)} onPlaceSelect={handleAddressSelect} placeholder="Rechercher une adresse..." />
                  </div>
                </CardContent>
              </Card>

              {/* Additional Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Informations complémentaires
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sector">Secteur d'activité</Label>
                      <Select value={formData.sector || ''} onValueChange={value => handleInputChange('sector', value)}>
                        <SelectTrigger id="sector">
                          <SelectValue placeholder="Sélectionner un secteur" />
                        </SelectTrigger>
                        <SelectContent>
                          {sectors.map(sector => <SelectItem key={sector} value={sector}>
                              {sector}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employee_count">Nombre d'employés / bénévoles</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input id="employee_count" type="number" min={0} value={formData.employee_count || ''} onChange={e => handleInputChange('employee_count', e.target.value ? parseInt(e.target.value) : null)} className="pl-10" placeholder="Ex: 150" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="customRoleTitle" className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Titre du signataire (certificats)
                    </Label>
                    <Input id="customRoleTitle" value={customRoleTitle} onChange={e => {
                    setCustomRoleTitle(e.target.value.slice(0, 50));
                    setHasChanges(true);
                  }} placeholder="Ex: Directeur RSE, Présidente, Responsable Engagement..." maxLength={50} />
                    <p className="text-xs text-muted-foreground">
                      Ce titre apparaîtra sur les certificats que vous validez ({customRoleTitle.length}/50)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="sticky bottom-20 md:bottom-4 bg-background/95 backdrop-blur-sm border-t border-border -mx-4 px-4 py-4 md:mx-0 md:px-0 md:border-0 md:bg-transparent">
                <Button onClick={handleSave} disabled={!hasChanges || isSaving || !!slugError} className="w-full md:w-auto" size="lg">
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Enregistrer les modifications
                </Button>
              </div>
            </div>
          </div>
        </main>
        
        <MobileBottomNav />
      </div>
    </>;
}