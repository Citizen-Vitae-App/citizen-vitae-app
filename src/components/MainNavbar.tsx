import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logo from '@/assets/logo.png';
import { useAuth } from '@/hooks/useAuth';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
import { LogOut, User, Settings, Menu, ClipboardList, Home, Shield, Building2, Heart, Globe, HelpCircle } from 'lucide-react';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * MainNavbar - Desktop-only navigation bar for all user pages
 * Shows: Logo (left) | Notifications + Org Avatar + User Avatar + Menu (right)
 * Hidden on mobile (mobile uses MobileBottomNav)
 */
export const MainNavbar = () => {
  const { user, profile, signOut, hasRole } = useAuth();
  const { activeOrganization, canAccessDashboard } = useUserOrganizations();
  const navigate = useNavigate();

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const getOrgInitials = (name: string) => {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  if (!user) {
    // If not logged in, show minimal navbar with login button
    return (
      <header className="hidden md:block sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="hover:opacity-80 transition-opacity">
              <img src={logo} alt="CitizenVitae" className="h-8" width="203" height="32" loading="eager" decoding="async" fetchPriority="high" />
            </Link>
            <Link to="/auth">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Connexion
              </Button>
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <img src={logo} alt="CitizenVitae" className="h-8" width="203" height="32" loading="eager" decoding="async" fetchPriority="high" />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <NotificationDropdown />

            {/* Organization Avatar - if user has access to org dashboard */}
            {canAccessDashboard && activeOrganization && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full p-0"
                    onClick={() => navigate('/organization/dashboard')}
                  >
                    <Avatar className="h-10 w-10 cursor-pointer border-2 border-primary/20">
                      <AvatarImage src={activeOrganization.logo_url || undefined} alt={activeOrganization.name} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {getOrgInitials(activeOrganization.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Console organisation</TooltipContent>
              </Tooltip>
            )}

            {/* User Avatar - click to go to profile */}
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full p-0"
              onClick={() => navigate('/profile')}
            >
              <Avatar className="h-10 w-10 cursor-pointer">
                <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>

            {/* Menu burger - DropdownMenu style like Index page */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-10 px-3 rounded-full border-border hover:shadow-md transition-shadow"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Section principale */}
                <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/')}>
                  <Home className="mr-3 h-4 w-4" />
                  <span>Accueil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/my-missions')}>
                  <ClipboardList className="mr-3 h-4 w-4" />
                  <span>Mes Missions</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/profile')}>
                  <User className="mr-3 h-4 w-4" />
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/favorites')}>
                  <Heart className="mr-3 h-4 w-4" />
                  <span>Mes favoris</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Section paramètres */}
                <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/settings')}>
                  <Settings className="mr-3 h-4 w-4" />
                  <span>Paramètres</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/settings')}>
                  <Globe className="mr-3 h-4 w-4" />
                  <span>Langue</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer py-3">
                  <HelpCircle className="mr-3 h-4 w-4" />
                  <span>Centre d'aide</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                {/* Accès console organisation */}
                {canAccessDashboard && (
                  <DropdownMenuItem onClick={() => navigate('/organization/dashboard')} className="cursor-pointer py-3">
                    <Building2 className="mr-3 h-4 w-4" />
                    <span>Console organisation</span>
                  </DropdownMenuItem>
                )}
                
                {/* Console Super Admin */}
                {hasRole('super_admin') && (
                  <DropdownMenuItem onClick={() => navigate('/super-admin')} className="cursor-pointer py-3">
                    <Shield className="mr-3 h-4 w-4" />
                    <span>Console Super Admin</span>
                  </DropdownMenuItem>
                )}
                
                {/* Déconnexion */}
                <DropdownMenuItem onClick={signOut} className="cursor-pointer py-3">
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};
