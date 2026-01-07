import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logo from '@/assets/logo.png';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Settings, Menu, ClipboardList, Globe, HelpCircle, Home, Shield, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
interface UserRoleProps {
  isOwner: boolean;
  isAdmin: boolean;
  isLeader: boolean;
  isMember: boolean;
  canViewOrganizationSettings: boolean;
}
interface NavbarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  userRole?: UserRoleProps;
}
export const Navbar = ({
  activeTab,
  onTabChange,
  userRole
}: NavbarProps) => {
  const {
    user,
    profile,
    signOut,
    hasRole
  } = useAuth();
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
      return [{
        value: 'events',
        label: 'Événements'
      }, {
        value: 'people',
        label: 'Contributeurs'
      }, {
        value: 'organization',
        label: 'Organisation'
      }];
    }
    const {
      isOwner,
      isAdmin,
      isLeader,
      isMember,
      canViewOrganizationSettings
    } = userRole;

    // Owners and Admins see full tabs
    if (isOwner || isAdmin) {
      return [{
        value: 'events',
        label: 'Événements'
      }, {
        value: 'people',
        label: 'Contributeurs'
      }, {
        value: 'organization',
        label: 'Organisation'
      }];
    }

    // Leaders see limited tabs (no organization settings)
    if (isLeader) {
      return [{
        value: 'events',
        label: 'Événements'
      }, {
        value: 'people',
        label: 'Contributeurs'
      }, {
        value: 'members',
        label: 'Mon équipe'
      }];
    }

    // Regular members only see Events and People (filtered to their team)
    if (isMember) {
      return [{
        value: 'events',
        label: 'Événements'
      }, {
        value: 'people',
        label: 'Contributeurs'
      }];
    }

    // Default tabs (shouldn't reach here)
    return [{
      value: 'events',
      label: 'Événements'
    }, {
      value: 'people',
      label: 'Contributeurs'
    }];
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
  return <header className="hidden md:block absolute top-0 left-0 right-0 px-4 md:px-8 py-4 md:py-6 z-10">
      <div className="flex items-center justify-between">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <img src={logo} alt="CitizenVitae" className="h-6 md:h-8" />
        </Link>
        
        {/* Tabs au centre pour les organisations - Desktop only */}
        {tabs && <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            {tabs.map(tab => <button key={tab.value} onClick={() => onTabChange(tab.value)} className={cn("px-8 py-2 text-sm font-medium transition-all rounded-full", activeTab === tab.value ? "bg-muted text-foreground border border-border" : "text-muted-foreground hover:text-foreground")}>
                {tab.label}
              </button>)}
          </div>}
        
        {/* Right side - Desktop only */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <NotificationDropdown />
          
          {/* User menu */}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer">
                <Avatar className="h-10 w-10 ring-2 ring-border">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
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
                  onClick={() => { navigate('/missions'); setDrawerOpen(false); }}
                >
                  <ClipboardList className="h-5 w-5" />
                  Mes missions
                </Button>
                {hasRole('organization') && (
                  <Button 
                    variant="ghost" 
                    className="justify-start gap-3 h-12" 
                    onClick={() => { navigate('/organization'); setDrawerOpen(false); }}
                  >
                    <Building2 className="h-5 w-5" />
                    Mon organisation
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
                <DropdownMenuSeparator className="my-2" />
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
    </header>;
};