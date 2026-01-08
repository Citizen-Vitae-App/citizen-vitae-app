import { Link, useLocation } from 'react-router-dom';
import { Calendar, Bell, User, Building2, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserOrganizations } from '@/hooks/useUserOrganizations';

export const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const { canAccessDashboard } = useUserOrganizations();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  if (!user) return null;

  // Build nav items dynamically based on permissions
  const navItems = [
    {
      label: 'Événements',
      href: '/',
      icon: Calendar,
      isActive: location.pathname === '/',
      isCentral: false,
    },
    {
      label: 'Contributeur',
      href: '/my-missions',
      icon: Bell,
      isActive: location.pathname === '/my-missions',
      isCentral: false,
    },
    {
      label: 'Scan',
      href: '/scan-participant',
      icon: ScanLine,
      isActive: location.pathname === '/scan-participant',
      isCentral: true,
    },
    ...(canAccessDashboard ? [{
      label: 'Organisation',
      href: '/organization',
      icon: Building2,
      isActive: location.pathname.startsWith('/organization'),
      isCentral: false,
    }] : []),
    {
      label: 'Profil',
      href: '/profile',
      icon: User,
      isActive: location.pathname === '/profile',
      isCentral: false,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 relative",
                item.isCentral ? "-mt-4" : "",
                item.isActive 
                  ? "text-foreground" 
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center",
                item.isCentral && "bg-primary rounded-full p-3 shadow-lg"
              )}>
                <Icon className={cn(
                  item.isCentral ? "h-6 w-6 text-primary-foreground" : "h-6 w-6"
                )} />
                {item.label === 'Notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-medium rounded-full px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium",
                item.isCentral && "mt-1"
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
