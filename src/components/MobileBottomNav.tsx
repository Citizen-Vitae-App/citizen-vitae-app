import { Link, useLocation } from 'react-router-dom';
import { Home, ClipboardList, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';

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
      label: 'Missions',
      href: '/my-missions',
      icon: ClipboardList,
      isActive: location.pathname === '/my-missions',
    },
    {
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
      isActive: location.pathname === '/notifications',
      showBadge: true,
    },
    {
      label: 'Profil',
      href: '/profile',
      icon: User,
      isActive: location.pathname === '/profile',
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
              <div className="relative flex items-center justify-center">
                <Icon className="h-6 w-6" />
                {item.showBadge && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-medium rounded-full px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
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
