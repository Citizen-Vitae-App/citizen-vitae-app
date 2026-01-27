import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
import { useIsMobile } from '@/hooks/use-mobile';

export const OrganizationMobileHeader = () => {
  const { profile } = useAuth();
  const { activeOrganization } = useUserOrganizations();
  const isMobile = useIsMobile();

  // Only show on mobile
  if (!isMobile) return null;

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left: Organization logo */}
        <Link to="/organization/dashboard" className="flex items-center gap-2">
          {activeOrganization?.logo_url ? (
            <img 
              src={activeOrganization.logo_url} 
              alt={activeOrganization.name}
              className="h-8 w-8 rounded-lg object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">
                {activeOrganization?.name?.substring(0, 2).toUpperCase() || 'ORG'}
              </span>
            </div>
          )}
          <span className="font-semibold text-sm truncate max-w-[150px]">
            {activeOrganization?.name || 'Organisation'}
          </span>
        </Link>

        {/* Right: Avatar/Profile button - redirects to profile with context */}
        <Link to="/profile?context=organization" className="hover:opacity-80 transition-opacity">
          <Avatar className="h-9 w-9 ring-2 ring-border">
            <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
};
