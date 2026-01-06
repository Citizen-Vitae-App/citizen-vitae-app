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
  return <header className="absolute top-0 left-0 right-0 px-4 md:px-8 py-4 md:py-6 z-10">
      <div className="flex items-center justify-between">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <img src={logo} alt="CitizenVitae" className="h-6 md:h-8" />
        </Link>
        
        {/* Tabs au centre pour les organisations - Desktop only */}
        {tabs && !isMobile && <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            {tabs.map(tab => <button key={tab.value} onClick={() => onTabChange(tab.value)} className={cn("px-8 py-2 text-sm font-medium transition-all rounded-full", activeTab === tab.value ? "bg-muted text-foreground border border-border" : "text-muted-foreground hover:text-foreground")}>
                {tab.label}
              </button>)}
          </div>}
        
        
      </div>
    </header>;
};