import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Users, Globe, Lock, Building2, Heart, BarChart3, BookOpen, Calendar, Copy, Check, QrCode, ChevronDown, ChevronUp, Share2, ExternalLink } from 'lucide-react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/hooks/useAuth';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import sigle from '@/assets/icon-sigle.svg';

export function ProfileSidebar() {
  const { user } = useAuth();
  const { preferences, updatePreferences } = useUserPreferences();

  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const citizenCVUrl = user ? `${window.location.origin}/citizen/${user.id}` : '';

  const visibility = (preferences as any)?.profile_visibility || 'public';
  const sections = {
    show_organizations: (preferences as any)?.show_organizations !== false,
    show_causes: (preferences as any)?.show_causes !== false,
    show_impact: (preferences as any)?.show_impact !== false,
    show_experiences: (preferences as any)?.show_experiences !== false,
    show_upcoming_events: (preferences as any)?.show_upcoming_events !== false,
  };

  const handleVisibilityChange = (value: string) => {
    updatePreferences({ profile_visibility: value as any } as any);
  };

  const handleToggle = (key: string, checked: boolean) => {
    updatePreferences({ [key]: checked } as any);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(citizenCVUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { /* fallback */ }
  };

  const sectionItems = [
    { key: 'show_organizations', label: 'Organisations', icon: Building2 },
    { key: 'show_causes', label: 'Causes favorites', icon: Heart },
    { key: 'show_impact', label: 'Impact citoyen', icon: BarChart3 },
    { key: 'show_experiences', label: 'Expériences', icon: BookOpen },
    { key: 'show_upcoming_events', label: 'Événements à venir', icon: Calendar },
  ];

  const visibilityOptions = [
    { value: 'connections', label: 'Connexions', description: 'Membres de vos organisations', icon: Lock },
    { value: 'network', label: 'Réseau étendu', description: 'Vos relations et leurs réseaux', icon: Users },
    { value: 'public', label: 'Public', description: 'Tout le monde', icon: Globe },
  ];

  return (
    <div className="space-y-3 sticky top-20">
      {/* Privacy toggle button */}
      <button
        onClick={() => { setPrivacyOpen(!privacyOpen); if (shareOpen) setShareOpen(false); }}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
          privacyOpen ? 'bg-primary/10 text-primary' : 'bg-muted/50 hover:bg-muted text-foreground'
        }`}
      >
        <span className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Confidentialité
        </span>
        {privacyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Privacy inline panel */}
      <AnimatePresence>
        {privacyOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-muted/30 p-4 space-y-4">
              {/* Visibility level */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Qui peut voir votre profil
                </p>
                <RadioGroup value={visibility} onValueChange={handleVisibilityChange} className="space-y-1.5">
                  {visibilityOptions.map(({ value, label, description, icon: Icon }) => (
                    <label
                      key={value}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        visibility === value ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <RadioGroupItem value={value} id={`vis-${value}`} />
                      <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{label}</span>
                        <p className="text-xs text-muted-foreground leading-tight">{description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <Separator />

              {/* Section toggles */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Sections visibles
                </p>
                <div className="space-y-0.5">
                  {sectionItems.map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between py-2 px-1">
                      <Label className="flex items-center gap-2 text-sm font-normal cursor-pointer" htmlFor={`sidebar-${key}`}>
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {label}
                      </Label>
                      <Switch
                        id={`sidebar-${key}`}
                        checked={sections[key as keyof typeof sections]}
                        onCheckedChange={(checked) => handleToggle(key, checked)}
                        className="scale-90"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share / Export button */}
      <button
        onClick={() => { setShareOpen(!shareOpen); if (privacyOpen) setPrivacyOpen(false); }}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
          shareOpen ? 'bg-primary/10 text-primary' : 'bg-muted/50 hover:bg-muted text-foreground'
        }`}
      >
        <span className="flex items-center gap-2">
          <Share2 className="h-4 w-4" />
          Partager mon CV
        </span>
        {shareOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Share inline panel */}
      <AnimatePresence>
        {shareOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-muted/30 p-4 space-y-3">
              {/* CV Link */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Lien du CV citoyen
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-background rounded-lg px-3 py-2 text-xs text-muted-foreground truncate font-mono border border-border">
                    {citizenCVUrl}
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleCopyLink}>
                    {linkCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center pt-2">
                <div className="bg-background rounded-xl p-3 border border-border">
                  <QRCodeSVG
                    value={citizenCVUrl}
                    size={120}
                    level="H"
                    includeMargin
                    imageSettings={{ src: sigle, x: undefined, y: undefined, height: 20, width: 20, excavate: true }}
                  />
                </div>
              </div>

              {/* View public profile link */}
              <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                <a href={citizenCVUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Voir mon CV public
                </a>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
