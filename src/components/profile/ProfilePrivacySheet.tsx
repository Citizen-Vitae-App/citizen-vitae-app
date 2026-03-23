import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Eye, Users, Globe, Lock, Building2, Heart, BarChart3, BookOpen, Calendar, Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import sigle from '@/assets/icon-sigle.svg';

interface ProfilePrivacySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfilePrivacySheet({ open, onOpenChange }: ProfilePrivacySheetProps) {
  const { user } = useAuth();
  const { preferences, updatePreferences, isUpdating } = useUserPreferences();
  
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

  const citizenCVUrl = user ? `${window.location.origin}/citizen/${user.id}` : '';

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

        {/* CV Export Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            Lien du CV citoyen
          </h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground truncate font-mono">
              {citizenCVUrl}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleCopyLink}>
              {linkCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowQR(!showQR)} className="gap-2 w-full">
            <QrCode className="h-4 w-4" />
            {showQR ? 'Masquer le QR code' : 'Afficher le QR code'}
          </Button>
          {showQR && (
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
