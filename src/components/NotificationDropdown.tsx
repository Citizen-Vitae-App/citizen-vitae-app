import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const NotificationItem = ({
  notification,
  language,
  onRead,
}: {
  notification: Notification;
  language: 'fr' | 'en';
  onRead: (id: string) => void;
}) => {
  const navigate = useNavigate();
  const message = language === 'fr' ? notification.message_fr : notification.message_en;
  const locale = language === 'fr' ? fr : enUS;

  const handleClick = () => {
    if (!notification.is_read) {
      onRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <DropdownMenuItem
      className={cn(
        'flex flex-col items-start gap-1 p-3 cursor-pointer',
        !notification.is_read && 'bg-primary/5'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between w-full gap-2">
        <p className={cn('text-sm', !notification.is_read && 'font-medium')}>
          {message}
        </p>
        {!notification.is_read && (
          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {formatDistanceToNow(new Date(notification.created_at), {
          addSuffix: true,
          locale,
        })}
      </span>
    </DropdownMenuItem>
  );
};

export const NotificationDropdown = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { preferences } = useUserPreferences();
  const language = preferences?.language || 'fr';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-background border border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <h4 className="font-semibold text-sm">
            {language === 'fr' ? 'Notifications' : 'Notifications'}
          </h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead();
              }}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              {language === 'fr' ? 'Tout marquer comme lu' : 'Mark all as read'}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {language === 'fr' 
              ? 'Aucune notification' 
              : 'No notifications'}
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                language={language}
                onRead={markAsRead}
              />
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
