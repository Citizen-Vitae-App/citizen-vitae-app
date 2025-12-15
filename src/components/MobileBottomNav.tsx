import { Link, useLocation } from 'react-router-dom';
import { Home, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';

// Custom Mes Missions icon matching the reference
const MissionsIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
);

export const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { notifications } = useNotifications();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  if (!user) return null;

  const navItems = [
    {
      label: 'Accueil',
      href: '/',
      icon: Home,
      isActive: location.pathname === '/',
    },
    {
      label: 'Mes Missions',
      href: '/my-missions',
      icon: MissionsIcon,
      isActive: location.pathname === '/my-missions',
      badge: 0, // Could show upcoming missions count
    },
    {
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
      isActive: location.pathname === '/notifications',
      badge: unreadCount,
    },
    {
      label: 'Profil',
      href: '/settings',
      icon: User,
      isActive: location.pathname === '/settings',
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
                item.isActive 
                  ? "text-foreground" 
                  : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <Icon className="h-6 w-6" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-medium rounded-full px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
