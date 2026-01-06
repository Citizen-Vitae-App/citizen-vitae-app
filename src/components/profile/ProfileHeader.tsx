import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { IdentityVerificationCard } from '@/components/IdentityVerificationCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Pencil, X, Check, Camera } from 'lucide-react';
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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    ? `${primaryOrg.role === 'admin' ? 'Admin' : 'Membre'} @ ${primaryOrg.name}`
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success('Photo de profil mise à jour');
      refreshProfile?.();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erreur lors du téléchargement de la photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <section className="mb-6 relative">
      {/* Edit button */}
      {!isEditing && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleStartEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      {/* Save/Cancel buttons when editing */}
      {isEditing && (
        <div className="absolute top-0 right-0 flex gap-2">
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

      <div className="flex flex-col items-center text-center">
        {/* Avatar with edit overlay */}
        <div className="relative group">
          <div className="relative">
            <Avatar className="h-24 w-24 ring-4 ring-border shadow-lg">
              <AvatarImage src={profile?.avatar_url || undefined} alt="Photo de profil" />
              <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {/* Verified badge */}
            {profile?.id_verified && (
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                <CheckCircle2 className="h-6 w-6 text-primary fill-primary/20" />
              </div>
            )}
          </div>
          
          {/* Edit overlay */}
          <button
            onClick={handleAvatarClick}
            disabled={isUploadingAvatar}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <Camera className="h-6 w-6 text-white" />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Info */}
        <div className="mt-4 w-full max-w-md">
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex gap-2 justify-center">
                <Input
                  value={editData.first_name}
                  onChange={(e) => setEditData({ ...editData, first_name: e.target.value })}
                  placeholder="Prénom"
                  className="flex-1 max-w-[150px]"
                />
                <Input
                  value={editData.last_name}
                  onChange={(e) => setEditData({ ...editData, last_name: e.target.value })}
                  placeholder="Nom"
                  className="flex-1 max-w-[150px]"
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
              <h1 className="text-2xl font-bold text-foreground">
                {profile?.first_name} {profile?.last_name}
              </h1>
              
              {/* Bio field */}
              {(profile as any).bio && (
                <p className="text-muted-foreground mt-1 text-sm">{(profile as any).bio}</p>
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
