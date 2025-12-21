import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { IdentityVerificationCard } from '@/components/IdentityVerificationCard';
import { useAuth } from '@/hooks/useAuth';
import type { UserOrganization } from '@/hooks/useUserProfile';

interface ProfileHeaderProps {
  organizations: UserOrganization[];
  onVerificationComplete?: () => void;
}

export function ProfileHeader({ organizations, onVerificationComplete }: ProfileHeaderProps) {
  const { user, profile, refreshProfile } = useAuth();

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

  return (
    <section className="bg-card border border-border rounded-2xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <Avatar className="h-24 w-24 ring-4 ring-background shadow-lg">
          <AvatarImage src={profile?.avatar_url || undefined} alt="Photo de profil" />
          <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-foreground">
            {profile?.first_name} {profile?.last_name}
          </h1>
          
          {primaryTitle && (
            <p className="text-muted-foreground mt-1">{primaryTitle}</p>
          )}

          {/* Identity verification badge or CTA */}
          <div className="mt-4">
            <IdentityVerificationCard
              userId={user?.id || ''}
              isVerified={profile?.id_verified || false}
              onVerificationComplete={handleVerificationComplete}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
