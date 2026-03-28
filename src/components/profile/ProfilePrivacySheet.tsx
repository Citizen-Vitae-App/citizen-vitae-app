import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Eye, Users, Globe, Lock, Building2, Heart, BarChart3, BookOpen, Calendar, Copy, Check, QrCode, ExternalLink, Pencil, X, Link2 } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import sigle from '@/assets/icon-sigle.svg';

interface ProfilePrivacySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfilePrivacySheet({ open, onOpenChange }: ProfilePrivacySheetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  
  const { data: slug } = useQuery({
    queryKey: ['profile-slug', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('slug').eq('id', user.id).single();
      return (data as any)?.slug as string | null;
    },
    enabled: !!user?.id,
  });

  const updateSlug = useMutation({
    mutationFn: async (newSlug: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      const cleaned = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!cleaned || cleaned.length < 3) throw new Error('Le slug doit contenir au moins 3 caractères');
      const { error } = await supabase.from('profiles').update({ slug: cleaned } as any).eq('id', user.id);
      if (error) { if (error.code === '23505') throw new Error('Cette URL est déjà prise'); throw error; }
      return cleaned;
    },
    onSuccess: (newSlug) => {
      queryClient.setQueryData(['profile-slug', user?.id], newSlug);
      toast.success('URL mise à jour');
    },
    onError: (e: Error) => toast.error(e.message),
  });
  
  const [visibility, setVisibility] = useState<'connections' | 'network' | 'public'>('public');
  const [sections, setSections] = useState({
    show_organizations: true,
    show_causes: true,
    show_impact: true,
    show_experiences: true,
    show_upcoming_events: true,
  });
  const [linkCopied, setLinkCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');

  const baseUrl = 'citizenvitae.com/cv/';
  const citizenCVUrl = slug ? `${window.location.origin}/cv/${slug}` : '';

  // Sync from preferences
  useEffect(() => {
    if (preferences) {
      setVisibility((preferences as any).profile_visibility || 'public');
      setSections({
        show_organizations: (preferences as any).show_organizations !== false,
        show_causes: (preferences as any).show_causes !== false,
        show_impact: (preferences as any).show_impact !== false,
        show_experiences: (preferences as any).show_experiences !== false,
        show_upcoming_events: (preferences as any).show_upcoming_events !== false,
      });
    }
  }, [preferences]);

  const handleVisibilityChange = (value: string) => {
    const v = value as 'connections' | 'network' | 'public';
    setVisibility(v);
    updatePreferences({ profile_visibility: v } as any);
  };

  const handleToggle = (key: keyof typeof sections, checked: boolean) => {
    setSections(prev => ({ ...prev, [key]: checked }));
    updatePreferences({ [key]: checked } as any);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(citizenCVUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const sectionItems = [
    { key: 'show_organizations' as const, label: 'Organisations', icon: Building2 },
    { key: 'show_causes' as const, label: 'Causes favorites', icon: Heart },
    { key: 'show_impact' as const, label: 'Impact citoyen (radar)', icon: BarChart3 },
    { key: 'show_experiences' as const, label: 'Expériences citoyennes', icon: BookOpen },
    { key: 'show_upcoming_events' as const, label: 'Événements à venir', icon: Calendar },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Confidentialité du profil
          </SheetTitle>
          <SheetDescription>
            Contrôlez ce qui est visible sur votre profil public et votre CV citoyen.
          </SheetDescription>
        </SheetHeader>

        {/* CV URL Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            Votre URL personnalisée
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Personnalisez l'URL de votre CV citoyen.
          </p>

          {editingSlug ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground whitespace-nowrap">{baseUrl}</span>
                <Input
                  value={slugDraft}
                  onChange={(e) => setSlugDraft(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="h-8 text-sm font-mono"
                  placeholder="votre-nom"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={() => {
                  if (slugDraft && slugDraft !== slug) {
                    updateSlug.mutate(slugDraft, { onSuccess: () => setEditingSlug(false) });
                  } else {
                    setEditingSlug(false);
                  }
                }} disabled={updateSlug.isPending}>
                  <Check className="h-3 w-3 mr-1" />
                  Enregistrer
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingSlug(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs truncate font-mono">
                {baseUrl}<span className="font-semibold text-foreground">{slug || '...'}</span>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => { setSlugDraft(slug || ''); setEditingSlug(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground truncate font-mono">
              {citizenCVUrl || 'Chargement...'}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleCopyLink} disabled={!citizenCVUrl}>
              {linkCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)} className="gap-2 w-full">
            <QrCode className="h-4 w-4" />
            {showQR ? 'Masquer le QR code' : 'Afficher le QR code'}
          </Button>
          {showQR && citizenCVUrl && (
            <div className="mt-3 flex justify-center">
              <div className="bg-background border rounded-lg p-3">
                <QRCodeSVG
                  value={citizenCVUrl}
                  size={150}
                  level="H"
                  includeMargin
                  imageSettings={{ src: sigle, x: undefined, y: undefined, height: 24, width: 24, excavate: true }}
                />
              </div>
            </div>
          )}
        </div>

        <Separator className="mb-6" />

        {/* Visibility Level */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-1">Visibilité publique de votre profil</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Qui peut voir votre CV citoyen via le lien public.
          </p>

          <RadioGroup value={visibility} onValueChange={handleVisibilityChange} className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="connections" id="vis-connections" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="vis-connections" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Connexions directes
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Seuls les membres de vos organisations peuvent voir votre profil.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="network" id="vis-network" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="vis-network" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Réseau étendu
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Les membres de vos organisations et leurs réseaux.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="public" id="vis-public" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="vis-public" className="flex items-center gap-2 font-medium cursor-pointer">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  Public
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Tout le monde peut voir votre CV citoyen via le lien.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <Separator className="mb-6" />

        {/* Section Toggles */}
        <div>
          <h3 className="text-sm font-semibold mb-1">Sections visibles</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Choisissez quelles sections apparaissent sur votre profil public.
          </p>

          <div className="space-y-1">
            {sectionItems.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between py-3 px-1">
                <Label className="flex items-center gap-2.5 font-normal cursor-pointer" htmlFor={key}>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {label}
                </Label>
                <Switch
                  id={key}
                  checked={sections[key]}
                  onCheckedChange={(checked) => handleToggle(key, checked)}
                />
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
