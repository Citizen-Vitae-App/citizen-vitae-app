import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import logo from '@/assets/logo.png';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Settings, Menu, ClipboardList, Globe, HelpCircle, Home, Shield, Building2, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { useIsMobile } from '@/hooks/use-mobile';

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

  return <header className="hidden md:block absolute top-0 left-0 right-0 px-4 md:px-8 py-4 md:py-6 z-10">
      <div className="flex items-center justify-between">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <img src={logo} alt="CitizenVitae" className="h-6 md:h-8" />
        </Link>
        
        {/* Tabs au centre pour les organisations - Desktop only */}
        {tabs && <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            {tabs.map(tab => <button key={tab.value} onClick={() => onTabChange?.(tab.value)} className={cn("px-8 py-2 text-sm font-medium transition-all rounded-full", activeTab === tab.value ? "bg-muted text-foreground border border-border" : "text-muted-foreground hover:text-foreground")}>
                {tab.label}
              </button>)}
          </div>}
        
        {/* Right side - Desktop only */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <NotificationDropdown />
          
          {/* Avatar - links to profile */}
          <Link to="/profile" className="hover:opacity-80 transition-opacity">
            <Avatar className="h-10 w-10 ring-2 ring-border">
              <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </Link>
          
          {/* User menu - DropdownMenu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-2">
          <DropdownMenuItem onClick={() => navigate('/my-missions')} className="cursor-pointer py-3">
                <ClipboardList className="mr-3 h-5 w-5" />
                Mes Missions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer py-3">
                <User className="mr-3 h-5 w-5" />
                Profil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/favorites')} className="cursor-pointer py-3">
                <Heart className="mr-3 h-5 w-5" />
                Mes favoris
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer py-3">
                <Settings className="mr-3 h-5 w-5" />
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-3">
                <Globe className="mr-3 h-5 w-5" />
                Langue
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer py-3">
                <HelpCircle className="mr-3 h-5 w-5" />
                Centre d'aide
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {hasRole('organization') && (
                <DropdownMenuItem onClick={() => navigate('/organization')} className="cursor-pointer py-3">
                  <Building2 className="mr-3 h-5 w-5" />
                  Console organisation
                </DropdownMenuItem>
              )}
              {hasRole('super_admin') && (
                <DropdownMenuItem onClick={() => navigate('/super-admin')} className="cursor-pointer py-3">
                  <Shield className="mr-3 h-5 w-5" />
                  Console Super Admin
                </DropdownMenuItem>
              )}
              
              {(hasRole('organization') || hasRole('super_admin')) && <DropdownMenuSeparator />}
              
              <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer py-3 text-destructive focus:text-destructive">
                <LogOut className="mr-3 h-5 w-5" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>;
};