import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Phone, Globe, Bell, MessageSquare } from 'lucide-react';

const maskPhoneNumber = (phone: string | null): string => {
  if (!phone || phone.length < 4) return phone || '';
  return phone.slice(0, 3) + '•'.repeat(phone.length - 6) + phone.slice(-3);
};

const maskEmail = (email: string | null): string => {
  if (!email) return '';
  const [localPart, domain] = email.split('@');
  if (!localPart || localPart.length < 3) return email;
  return localPart.slice(0, 2) + '•'.repeat(Math.min(localPart.length - 2, 5)) + '@' + domain;
};

export default function Settings() {
  const { user, profile } = useAuth();
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);

  const handlePhoneSave = () => {
    updatePreferences({ phone_number: phoneNumber });
    setIsEditingPhone(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-2xl">
        <h1 className="text-2xl font-bold mb-8">Paramètres</h1>

        {/* Language Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Langue</h2>
          </div>
          <div className="bg-black/[0.03] rounded-lg p-4">
            <Label htmlFor="language" className="text-sm text-muted-foreground mb-2 block">
              Langue de l'interface et des notifications
            </Label>
            <Select
              value={preferences?.language || 'fr'}
              onValueChange={(value: 'fr' | 'en') => updatePreferences({ language: value })}
              disabled={isUpdating}
            >
              <SelectTrigger id="language" className="w-48 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Notifications</h2>
          </div>
          
          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="bg-black/[0.03] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="email-opt-in" className="font-medium">
                      Notifications par email
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez des rappels et mises à jour par email
                    </p>
                  </div>
                </div>
                <Switch
                  id="email-opt-in"
                  checked={preferences?.email_opt_in ?? true}
                  onCheckedChange={(checked) => updatePreferences({ email_opt_in: checked })}
                  disabled={isUpdating}
                />
              </div>
              {user?.email && (
                <p className="text-sm text-muted-foreground mt-3 pl-8">
                  Email : {maskEmail(user.email)}
                </p>
              )}
            </div>

            {/* SMS Notifications */}
            <div className="bg-black/[0.03] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="sms-opt-in" className="font-medium">
                      Notifications par SMS
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez des rappels importants par SMS
                    </p>
                  </div>
                </div>
                <Switch
                  id="sms-opt-in"
                  checked={preferences?.sms_opt_in ?? false}
                  onCheckedChange={(checked) => updatePreferences({ sms_opt_in: checked })}
                  disabled={isUpdating}
                />
              </div>
              
              <div className="mt-3 pl-8">
                {preferences?.phone_number && !isEditingPhone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {maskPhoneNumber(preferences.phone_number)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-auto py-1"
                      onClick={() => {
                        setPhoneNumber(preferences.phone_number || '');
                        setIsEditingPhone(true);
                      }}
                    >
                      Modifier
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="tel"
                      placeholder="+33 6 12 34 56 78"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-48 h-9 bg-background"
                    />
                    <Button
                      size="sm"
                      onClick={handlePhoneSave}
                      disabled={isUpdating || !phoneNumber}
                    >
                      Enregistrer
                    </Button>
                    {isEditingPhone && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingPhone(false)}
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* In-app Notifications Info */}
            <div className="bg-black/[0.03] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Notifications in-app</p>
                  <p className="text-sm text-muted-foreground">
                    Toujours activées pour vous tenir informé des mises à jour importantes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Account Info Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Compte</h2>
          </div>
          <div className="bg-black/[0.03] rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Nom : </span>
                {profile?.first_name} {profile?.last_name}
              </p>
              <p>
                <span className="text-muted-foreground">Email : </span>
                {user?.email}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* Bottom padding for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
}
