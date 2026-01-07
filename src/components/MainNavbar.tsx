import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logo from '@/assets/logo.png';
import { useAuth } from '@/hooks/useAuth';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
import { LogOut, User, Settings, Menu, ClipboardList, Home, Shield, Building2, Heart } from 'lucide-react';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState } from 'react';

/**
 * MainNavbar - Desktop-only navigation bar for all user pages
 * Shows: Logo (left) | Notifications + Org Avatar + User Avatar + Menu (right)
 * Hidden on mobile (mobile uses MobileBottomNav)
 */
export const MainNavbar = () => {
  const { user, profile, signOut, hasRole } = useAuth();
  const { activeOrganization, canAccessDashboard } = useUserOrganizations();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

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
              <img src={logo} alt="CitizenVitae" className="h-8" />
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
            <img src={logo} alt="CitizenVitae" className="h-8" />
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

            {/* Menu burger with Sheet */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-10 px-3 rounded-full border-border hover:shadow-md transition-shadow"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <nav className="flex flex-col gap-2 mt-8">
                  <Button 
                    variant="ghost" 
                    className="justify-start gap-3 h-12" 
                    onClick={() => { navigate('/'); setDrawerOpen(false); }}
                  >
                    <Home className="h-5 w-5" />
                    Accueil
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start gap-3 h-12" 
                    onClick={() => { navigate('/profile'); setDrawerOpen(false); }}
                  >
                    <User className="h-5 w-5" />
                    Mon profil
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start gap-3 h-12" 
                    onClick={() => { navigate('/my-missions'); setDrawerOpen(false); }}
                  >
                    <ClipboardList className="h-5 w-5" />
                    Mes missions
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="justify-start gap-3 h-12" 
                    onClick={() => { navigate('/favorites'); setDrawerOpen(false); }}
                  >
                    <Heart className="h-5 w-5" />
                    Mes favoris
                  </Button>

                  {canAccessDashboard && (
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12" 
                      onClick={() => { navigate('/organization/dashboard'); setDrawerOpen(false); }}
                    >
                      <Building2 className="h-5 w-5" />
                      Console organisation
                    </Button>
                  )}

                  {hasRole('super_admin') && (
                    <Button 
                      variant="ghost" 
                      className="justify-start gap-3 h-12" 
                      onClick={() => { navigate('/super-admin'); setDrawerOpen(false); }}
                    >
                      <Shield className="h-5 w-5" />
                      Super Admin
                    </Button>
                  )}

                  <Separator className="my-2" />

                  <Button 
                    variant="ghost" 
                    className="justify-start gap-3 h-12" 
                    onClick={() => { navigate('/settings'); setDrawerOpen(false); }}
                  >
                    <Settings className="h-5 w-5" />
                    Paramètres
                  </Button>

                  <Button 
                    variant="ghost" 
                    className="justify-start gap-3 h-12 text-destructive hover:text-destructive" 
                    onClick={() => { signOut(); setDrawerOpen(false); }}
                  >
                    <LogOut className="h-5 w-5" />
                    Se déconnecter
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};
