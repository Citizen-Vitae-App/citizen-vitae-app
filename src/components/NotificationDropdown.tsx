import { Bell, Check, CheckCheck, QrCode, Award } from 'lucide-react';
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
import { formatDistanceToNow, parseISO, isAfter, isBefore } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import defaultEventCover from '@/assets/default-event-cover.jpg';

// Notification types that should show QR Code button
const QR_CODE_TYPES = ['mission_reminder', 'mission_starting_soon', 'registration_confirmed'];
// Notification types that should show Certificate button
const CERTIFICATE_TYPES = ['mission_completed', 'certificate_available', 'attendance_confirmed'];

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

  // Determine if notification should show QR code button
  const shouldShowQRCode = () => {
    if (!notification.event) return false;
    const now = new Date();
    const endDate = parseISO(notification.event.end_date);
    return isAfter(endDate, now) && QR_CODE_TYPES.includes(notification.type);
  };

  // Determine if notification should show Certificate button
  const shouldShowCertificate = () => {
    if (!notification.event) return false;
    const now = new Date();
    const endDate = parseISO(notification.event.end_date);
    return isBefore(endDate, now) && CERTIFICATE_TYPES.includes(notification.type);
  };

  return (
    <DropdownMenuItem
      className={cn(
        'flex flex-col items-start gap-1 p-3 cursor-pointer',
        !notification.is_read && 'bg-primary/5'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 w-full">
        {/* Event thumbnail */}
        {notification.event && (
          <img 
            src={notification.event.cover_image_url || defaultEventCover}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between w-full gap-2">
            <p className={cn('text-sm', !notification.is_read && 'font-medium')}>
              {message}
            </p>
            {!notification.is_read && (
              <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
            )}
          </div>
          
          {/* Action buttons */}
          {(shouldShowQRCode() || shouldShowCertificate()) && (
            <div className="mt-2">
              {shouldShowQRCode() && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/mes-missions?tab=upcoming&event=${notification.event_id}`);
                  }}
                >
                  <QrCode className="h-3 w-3 mr-1" />
                  Code QR
                </Button>
              )}
              {shouldShowCertificate() && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/mes-missions?tab=certificates&event=${notification.event_id}`);
                  }}
                >
                  <Award className="h-3 w-3 mr-1" />
                  Certificat
                </Button>
              )}
            </div>
          )}
          
          <span className="text-xs text-muted-foreground mt-1 block">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale,
            })}
          </span>
        </div>
      </div>
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
      <DropdownMenuContent align="end" className="w-96 bg-background border border-border">
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
          <ScrollArea className="h-[350px]">
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
