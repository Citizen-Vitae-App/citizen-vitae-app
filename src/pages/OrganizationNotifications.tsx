import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrganizationBottomNav } from '@/components/OrganizationBottomNav';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import defaultEventCover from '@/assets/default-event-cover.jpg';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Navbar } from '@/components/Navbar';
import { OrganizationMobileHeader } from '@/components/organization/OrganizationMobileHeader';
import { useIsMobile } from '@/hooks/use-mobile';

const OrganizationNotifications = () => {
  const { user } = useAuth();
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const { preferences } = useUserPreferences();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const language = preferences?.language || 'fr';

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "d MMM 'à' HH:mm", {
      locale: fr
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header: Mobile uses OrganizationMobileHeader, Desktop uses Navbar */}
      {isMobile ? <OrganizationMobileHeader /> : <Navbar />}
      
      <main className={`container mx-auto px-4 py-8 ${isMobile ? 'pt-20' : 'pt-20 md:pt-24'}`}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Notifications
          </h1>
          {notifications && notifications.length > 0 && notifications.some(n => !n.is_read) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead()}
              className="text-xs"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Aucune notification
            </h2>
            <p className="text-muted-foreground">
              Vous n'avez pas encore de notifications
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notification => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full text-left p-4 rounded-lg border border-border transition-colors ${
                  notification.is_read
                    ? 'bg-background hover:bg-muted/50'
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Event thumbnail */}
                  {notification.event && (
                    <img
                      src={notification.event.cover_image_url || defaultEventCover}
                      alt=""
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className={`text-sm flex-1 ${
                        notification.is_read
                          ? 'text-muted-foreground'
                          : 'text-foreground font-medium'
                      }`}>
                        {language === 'fr' ? notification.message_fr : notification.message_en}
                      </p>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-[#e23428]" />
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(notification.created_at || '')}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation - Organization specific */}
      <OrganizationBottomNav 
        activeTab="notifications"
        onTabChange={(tab) => {
          if (tab === 'notifications') return;
          navigate('/organization/dashboard');
        }}
      />
      
      {/* Bottom padding for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default OrganizationNotifications;
