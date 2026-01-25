import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Camera, Globe, Building2, Users, MapPin, Mail, Phone, Link2, Linkedin, Instagram, Twitter, Save, Loader2, Award, Eye, Heart, Pencil } from 'lucide-react';
import * as Icons from 'lucide-react';
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
import { GooglePlacesAutocomplete } from '@/components/GooglePlacesAutocomplete';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useOrganizationSettings, OrganizationSettings as OrgSettings } from '@/hooks/useOrganizationSettings';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const urlSchema = z.string().url().optional().or(z.literal(''));
const emailSchema = z.string().email().optional().or(z.literal(''));

interface OrganizationSettingsContentProps {
  embedded?: boolean;
}

export function OrganizationSettingsContent({ embedded = false }: OrganizationSettingsContentProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
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
      const { data, error } = await supabase
        .from('organization_members')
        .select('custom_role_title')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single();
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
    
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Veuillez utiliser un fichier PNG ou JPEG.');
      e.target.value = '';
      return;
    }
    
    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`L'image est trop volumineuse (${fileSizeMB} Mo). La taille maximale autorisée est de 2 Mo. Veuillez compresser ou choisir une autre image.`);
      e.target.value = '';
      return;
    }
    
    const url = await uploadImage(file, 'logo');
    if (url) {
      handleInputChange('logo_url', url);
      toast.success('Logo mis à jour avec succès');
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format non supporté. Veuillez utiliser un fichier PNG ou JPEG.');
      e.target.value = '';
      return;
    }
    
    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`L'image est trop volumineuse (${fileSizeMB} Mo). La taille maximale autorisée est de 2 Mo. Veuillez compresser ou choisir une autre image.`);
      e.target.value = '';
      return;
    }
    
    const url = await uploadImage(file, 'cover');
    if (url) {
      handleInputChange('cover_image_url', url);
      toast.success('Image de couverture mise à jour avec succès');
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
      await updateSettings.mutateAsync(formData);

      const currentCauseIds = organizationCauses.map(c => c.cause_theme_id);
      const causesChanged = selectedCauses.length !== currentCauseIds.length || 
        selectedCauses.some(id => !currentCauseIds.includes(id));
      if (causesChanged) {
        await updateCauses.mutateAsync(selectedCauses);
      }

      if (user?.id && organizationId) {
        await supabase
          .from('organization_members')
          .update({ custom_role_title: customRoleTitle || null })
          .eq('user_id', user.id)
          .eq('organization_id', organizationId);
      }
      setHasChanges(false);
      toast.success('Paramètres enregistrés');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin || !organization) {
    return (
      <div className="flex flex-col items-center justify-center h-[40vh] gap-4">
        <p className="text-muted-foreground">Vous n'avez pas accès à cette page.</p>
        {!embedded && (
          <Button variant="outline" onClick={() => navigate('/organization/dashboard')}>
            Retour au tableau de bord
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 -mx-2 md:mx-0">
      {/* LinkedIn-style Header: Cover + Logo */}
      <Card className="overflow-hidden rounded-none md:rounded-lg border-x-0 md:border-x">
        <div className="relative">
          {/* Cover Image */}
          <div className="relative w-full h-32 md:h-44 bg-muted">
            {formData.cover_image_url ? (
              <img src={formData.cover_image_url} alt="Couverture" className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground bg-gradient-to-br from-muted to-muted/50">
                <Camera className="h-8 w-8 opacity-50" />
              </div>
            )}
            {/* Cover edit button */}
            <div className="absolute top-3 right-3 group">
              <label className="cursor-pointer">
                <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleCoverUpload} />
                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background shadow-md" asChild>
                  <span>
                    <Pencil className="h-4 w-4" />
                  </span>
                </Button>
              </label>
              {!formData.cover_image_url && (
                <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <p className="text-xs text-foreground bg-background/95 backdrop-blur-sm px-2 py-1 rounded shadow-lg border border-border whitespace-nowrap">
                    Max 2 Mo
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Logo overlapping cover */}
          <div className="absolute left-6 -bottom-12 md:-bottom-14">
            <div className="relative">
              <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background shadow-lg">
                <AvatarImage src={formData.logo_url || undefined} />
                <AvatarFallback className="text-2xl md:text-3xl bg-muted">
                  {formData.name?.charAt(0) || 'O'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 group">
                <label className="cursor-pointer">
                  <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleLogoUpload} />
                  <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full bg-background shadow-md hover:bg-muted" asChild>
                    <span>
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                  </Button>
                </label>
                {!formData.logo_url && (
                  <div className="absolute top-full right-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <p className="text-[10px] text-foreground bg-background/95 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-lg border border-border whitespace-nowrap">
                      Max 2 Mo
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content below header */}
        <CardContent className="pt-16 md:pt-18 space-y-4 md:space-y-6 px-4 md:px-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de l'organisation</Label>
              <Input 
                id="name" 
                value={formData.name || ''} 
                onChange={e => handleInputChange('name', e.target.value)} 
                placeholder="Nom de votre organisation" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">
                Description courte
                <span className="text-muted-foreground text-xs ml-2">
                  ({(formData.description || '').length}/400)
                </span>
              </Label>
              <Textarea 
                id="description" 
                value={formData.description || ''} 
                onChange={e => handleInputChange('description', e.target.value.slice(0, 400))} 
                placeholder="Décrivez brièvement votre organisation..." 
                className="resize-none" 
                rows={3} 
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Mission & Vision</Label>
            <RichTextEditor 
              value={formData.bio || ''} 
              onChange={html => handleInputChange('bio', html)} 
              placeholder="Décrivez en détail la mission et les valeurs de votre organisation..." 
            />
          </div>
        </CardContent>
      </Card>

      {/* Causes */}
      <Card className="rounded-none md:rounded-lg border-x-0 md:border-x">
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
            {allCauseThemes.map(cause => {
              const IconComponent = (Icons as any)[cause.icon] || Icons.Heart;
              return (
                <Badge 
                  key={cause.id} 
                  variant={selectedCauses.includes(cause.id) ? 'default' : 'outline'} 
                  className="cursor-pointer transition-colors py-1.5 px-3" 
                  style={{
                    backgroundColor: selectedCauses.includes(cause.id) ? cause.color : 'transparent',
                    borderColor: cause.color,
                    color: selectedCauses.includes(cause.id) ? 'white' : cause.color
                  }} 
                  onClick={() => toggleCause(cause.id)}
                >
                  <IconComponent className="h-4 w-4 mr-1" />
                  {cause.name}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Visibility */}
      <Card className="rounded-none md:rounded-lg border-x-0 md:border-x">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Visibilité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Visibilité de la page</Label>
            <RadioGroup 
              value={formData.visibility || 'public'} 
              onValueChange={value => handleInputChange('visibility', value)} 
              className="space-y-2"
            >
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
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="rounded-none md:rounded-lg border-x-0 md:border-x">
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
                <Input 
                  id="email" 
                  type="email" 
                  value={formData.email || ''} 
                  onChange={e => handleInputChange('email', e.target.value)} 
                  className="pl-10" 
                  placeholder="contact@organisation.com" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="phone" 
                  type="tel" 
                  value={formData.phone || ''} 
                  onChange={e => handleInputChange('phone', e.target.value)} 
                  className="pl-10" 
                  placeholder="+33 1 23 45 67 89" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Site web</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                id="website" 
                type="url" 
                value={formData.website || ''} 
                onChange={e => handleInputChange('website', e.target.value)} 
                className="pl-10" 
                placeholder="https://www.organisation.com" 
              />
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
                  <Input 
                    id="linkedin" 
                    value={formData.linkedin_url || ''} 
                    onChange={e => handleInputChange('linkedin_url', e.target.value)} 
                    className="pl-10" 
                    placeholder="LinkedIn" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instagram" className="text-sm text-muted-foreground">Instagram</Label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="instagram" 
                    value={formData.instagram_url || ''} 
                    onChange={e => handleInputChange('instagram_url', e.target.value)} 
                    className="pl-10" 
                    placeholder="Instagram" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="twitter" className="text-sm text-muted-foreground">X (Twitter)</Label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="twitter" 
                    value={formData.twitter_url || ''} 
                    onChange={e => handleInputChange('twitter_url', e.target.value)} 
                    className="pl-10" 
                    placeholder="X" 
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card className="rounded-none md:rounded-lg border-x-0 md:border-x">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Localisation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse du siège</Label>
            <GooglePlacesAutocomplete 
              value={formData.address || ''} 
              onChange={value => handleInputChange('address', value)} 
              onPlaceSelect={handleAddressSelect} 
              placeholder="Rechercher une adresse..." 
            />
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card className="rounded-none md:rounded-lg border-x-0 md:border-x">
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
                  {sectors.map(sector => (
                    <SelectItem key={sector} value={sector}>
                      {sector}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_count">Nombre d'employés / bénévoles</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="employee_count" 
                  type="number" 
                  min={0} 
                  value={formData.employee_count || ''} 
                  onChange={e => handleInputChange('employee_count', e.target.value ? parseInt(e.target.value) : null)} 
                  className="pl-10" 
                  placeholder="Ex: 150" 
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="customRoleTitle" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Titre du signataire (certificats)
            </Label>
            <Input 
              id="customRoleTitle" 
              value={customRoleTitle} 
              onChange={e => {
                setCustomRoleTitle(e.target.value.slice(0, 50));
                setHasChanges(true);
              }} 
              placeholder="Ex: Directeur RSE, Présidente, Responsable Engagement..." 
              maxLength={50} 
            />
            <p className="text-xs text-muted-foreground">
              Ce titre apparaîtra sur les certificats que vous validez ({customRoleTitle.length}/50)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className={embedded ? "pt-4 pb-20 md:pb-0" : "sticky bottom-20 md:bottom-4 bg-background/95 backdrop-blur-sm border-t border-border -mx-2 px-4 py-4 md:mx-0 md:px-0 md:border-0 md:bg-transparent"}>
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isSaving || !!slugError} 
          className="w-full md:w-auto" 
          size="lg"
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}
