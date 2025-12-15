import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useNotifications } from '@/hooks/useNotifications';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/logo.png';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const Notifications = () => {
  const { user } = useAuth();
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const { preferences } = useUserPreferences();
  const navigate = useNavigate();

  const language = preferences?.language || 'fr';

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "d MMM 'à' HH:mm", { locale: fr });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 text-foreground" />
              <img src={logo} alt="CitizenVitae" className="h-8" />
            </Link>
            {notifications && notifications.some(n => !n.is_read) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => markAllAsRead()}
                className="text-muted-foreground"
              >
                <Check className="h-4 w-4 mr-2" />
                Tout marquer lu
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Notifications</h1>

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
            {notifications.map((notification) => (
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
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${notification.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                      {language === 'fr' ? notification.message_fr : notification.message_en}
                    </p>
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

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* Bottom padding for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Notifications;
