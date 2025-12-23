import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { IdentityVerificationCard } from '@/components/IdentityVerificationCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Pencil, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { UserOrganization } from '@/hooks/useUserProfile';

interface ProfileHeaderProps {
  organizations: UserOrganization[];
  onVerificationComplete?: () => void;
}

export function ProfileHeader({ organizations, onVerificationComplete }: ProfileHeaderProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Don't render until profile is loaded to prevent flash
  if (!profile) return null;

  const getInitials = () => {
    const first = profile?.first_name?.[0] || '';
    const last = profile?.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  // Get primary role/title from first company organization
  const primaryOrg = organizations.find((org) => org.type === 'company') || organizations[0];
  const primaryTitle = primaryOrg
    ? `${primaryOrg.role === 'admin' ? 'Admin' : 'Membre'}, ${primaryOrg.name}`
    : null;

  const handleVerificationComplete = () => {
    refreshProfile?.();
    onVerificationComplete?.();
  };

  const handleStartEdit = () => {
    setEditData({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      bio: (profile as any).bio || '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: editData.first_name,
          last_name: editData.last_name,
          bio: editData.bio,
        } as any)
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profil mis à jour');
      refreshProfile?.();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-2xl p-6 mb-6 relative">
      {/* Edit button */}
      {!isEditing && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleStartEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      {/* Save/Cancel buttons when editing */}
      {isEditing && (
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={handleCancelEdit}
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-green-600 hover:text-green-700"
            onClick={handleSaveEdit}
            disabled={isSaving}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
          <AvatarImage src={profile?.avatar_url || undefined} alt="Photo de profil" />
          <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left w-full">
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={editData.first_name}
                  onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                  placeholder="Prénom"
                  className="flex-1"
                />
                <Input
                  value={editData.last_name}
                  onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                  placeholder="Nom"
                  className="flex-1"
                />
              </div>
              <Textarea
                value={editData.bio}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                placeholder="Décrivez-vous en quelques mots..."
                className="resize-none"
                rows={2}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-bold text-foreground">
                  {profile?.first_name} {profile?.last_name}
                </h1>
                {/* Verified icon - small green checkmark */}
                {profile?.id_verified && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                )}
              </div>
              
              {/* Bio field */}
              {(profile as any).bio && (
                <p className="text-muted-foreground mt-2 text-sm">{(profile as any).bio}</p>
              )}
              
              {primaryTitle && (
                <p className="text-muted-foreground mt-1 text-sm">{primaryTitle}</p>
              )}

              {/* Identity verification CTA - only show if NOT verified */}
              {!profile?.id_verified && (
                <div className="mt-4">
                  <IdentityVerificationCard
                    userId={user?.id || ''}
                    isVerified={false}
                    onVerificationComplete={handleVerificationComplete}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
