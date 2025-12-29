import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logo from '@/assets/logo.png';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Settings, Menu, ClipboardList, Globe, HelpCircle, Home, Shield, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useState } from 'react';

interface UserRoleProps {
  isOwner: boolean;
  isAdmin: boolean;
  isLeader: boolean;
  canViewOrganizationSettings: boolean;
}

interface NavbarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  userRole?: UserRoleProps;
}

export const Navbar = ({ activeTab, onTabChange, userRole }: NavbarProps) => {
  const { user, profile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Check if we're in organization dashboard mode (has tabs)
  const isOrganizationMode = !!(activeTab && onTabChange);
  
  // Determine tabs based on user role
  const getTabs = () => {
    if (!isOrganizationMode) return null;
    
    // If no role info, show default tabs
    if (!userRole) {
      return [
        { value: 'events', label: 'Événements' },
        { value: 'people', label: 'Contributeurs' },
        { value: 'organization', label: 'Organisation' }
      ];
    }
    
    const { isOwner, isAdmin, isLeader, canViewOrganizationSettings } = userRole;
    
    // Owners and Admins see full tabs
    if (isOwner || isAdmin) {
      return [
        { value: 'events', label: 'Événements' },
        { value: 'people', label: 'Contributeurs' },
        { value: 'organization', label: 'Organisation' }
      ];
    }
    
    // Leaders see limited tabs (no organization settings)
    if (isLeader) {
      return [
        { value: 'events', label: 'Événements' },
        { value: 'people', label: 'Contributeurs' },
        { value: 'members', label: 'Mon équipe' }
      ];
    }
    
    // Default tabs
    return [
      { value: 'events', label: 'Événements' },
      { value: 'people', label: 'Contributeurs' },
      { value: 'organization', label: 'Organisation' }
    ];
  };
  
  const tabs = getTabs();

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const handleTabChange = (tab: string) => {
    onTabChange?.(tab);
    setDrawerOpen(false);
  };

  return (
    <header className="absolute top-0 left-0 right-0 px-4 md:px-8 py-4 md:py-6 z-10">
      <div className="flex items-center justify-between">
        <Link 
          to="/" 
          className="hover:opacity-80 transition-opacity"
        >
          <img src={logo} alt="CitizenVitae" className="h-6 md:h-8" />
        </Link>
        
        {/* Tabs au centre pour les organisations - Desktop only */}
        {tabs && !isMobile && (
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={cn(
                  "px-8 py-2 text-sm font-medium transition-all rounded-full",
                  activeTab === tab.value
                    ? "bg-muted text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <>
              <NotificationDropdown />
              
              {/* Menu burger mobile pour les tabs organisation */}
              {tabs && isMobile && (
                <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-64 p-0 pt-12">
                    <div className="p-4 space-y-2">
                      {tabs.map((tab) => (
                        <button
                          key={tab.value}
                          onClick={() => handleTabChange(tab.value)}
                          className={cn(
                            "w-full px-4 py-3 text-left text-base font-medium transition-all rounded-lg",
                            activeTab === tab.value
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                      
                      {/* Separator and link to public page */}
                      <div className="border-t border-border my-2" />
                      <button
                        onClick={() => {
                          navigate('/');
                          setDrawerOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-base font-medium transition-all rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground flex items-center gap-3"
                      >
                        <Home className="h-4 w-4" />
                        Page publique
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              {/* Avatar cliquable vers profil - Desktop */}
              {!isMobile && (
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
              )}

              {/* Menu burger style Airbnb - Desktop */}
              {!isMobile && (
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
                    <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/my-missions')}>
                      <ClipboardList className="mr-3 h-4 w-4" />
                      <span>Mes Missions</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/profile')}>
                      <User className="mr-3 h-4 w-4" />
                      <span>Profil</span>
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
                    
                    {/* Link to public page when in organization mode - after Centre d'aide */}
                    {isOrganizationMode && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/')}>
                          <Home className="mr-3 h-4 w-4" />
                          <span>Page publique</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {/* Console organisation for organization members */}
                    {hasRole('organization') && !isOrganizationMode && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/organization/dashboard')}>
                          <Building2 className="mr-3 h-4 w-4" />
                          <span>Console organisation</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {/* Console Super Admin for super_admin users - Always visible */}
                    {hasRole('super_admin') && (
                      <>
                        {!hasRole('organization') && !isOrganizationMode && <DropdownMenuSeparator />}
                        <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/super-admin')}>
                          <Shield className="mr-3 h-4 w-4" />
                          <span>Console Super Admin</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    {/* Déconnexion */}
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer py-3">
                      <LogOut className="mr-3 h-4 w-4" />
                      <span>Déconnexion</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Menu avatar mobile (garde l'ancien comportement) */}
              {isMobile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                      <Avatar className="h-10 w-10 cursor-pointer">
                        <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-0">
                    <div className="flex items-center gap-3 p-4 pb-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">
                          {profile?.first_name} {profile?.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Voir le profil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/my-missions')}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      <span>Mes missions</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Paramètres</span>
                    </DropdownMenuItem>
                    
                    {/* Console organisation for organization members - Mobile */}
                    {hasRole('organization') && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/organization/dashboard')}>
                          <Building2 className="mr-2 h-4 w-4" />
                          <span>Console organisation</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {/* Console Super Admin for super_admin users - Mobile */}
                    {hasRole('super_admin') && (
                      <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/super-admin')}>
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Console Super Admin</span>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Déconnexion</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          ) : (
            <Button asChild variant="ghost" size="sm" className="text-foreground font-medium">
              <Link to="/auth">Se connecter</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};