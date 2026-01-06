import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Check, QrCode, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/logo.png';
import defaultEventCover from '@/assets/default-event-cover.jpg';
import { format, parseISO, isAfter, isBefore } from 'date-fns';
import { fr } from 'date-fns/locale';

// Notification types that should show QR Code button (upcoming events user is registered for)
const QR_CODE_TYPES = ['mission_reminder', 'mission_starting_soon', 'registration_confirmed'];
// Notification types that should show Certificate button (completed events)
const CERTIFICATE_TYPES = ['mission_completed', 'certificate_available', 'attendance_confirmed'];

const Notifications = () => {
  const { user } = useAuth();
  const { notifications, isLoading, markAsRead, markAllAsRead } = useNotifications();
  const { preferences } = useUserPreferences();
  const navigate = useNavigate();

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
    return format(parseISO(dateString), "d MMM 'à' HH:mm", { locale: fr });
  };

  // Determine if notification should show QR code button
  const shouldShowQRCode = (notification: Notification) => {
    if (!notification.event) return false;
    const now = new Date();
    const endDate = parseISO(notification.event.end_date);
    // Show QR code if event hasn't ended yet and notification type is relevant
    return isAfter(endDate, now) && QR_CODE_TYPES.includes(notification.type);
  };

  // Determine if notification should show Certificate button
  const shouldShowCertificate = (notification: Notification) => {
    if (!notification.event) return false;
    const now = new Date();
    const endDate = parseISO(notification.event.end_date);
    // Show certificate if event has ended and notification type is relevant
    return isBefore(endDate, now) && CERTIFICATE_TYPES.includes(notification.type);
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
                      <p className={`text-sm flex-1 ${notification.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                        {language === 'fr' ? notification.message_fr : notification.message_en}
                      </p>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    {(shouldShowQRCode(notification) || shouldShowCertificate(notification)) && (
                      <div className="mt-2">
                        {shouldShowQRCode(notification) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Navigate to QR code page or show QR modal
                              navigate(`/mes-missions?tab=upcoming&event=${notification.event_id}`);
                            }}
                          >
                            <QrCode className="h-3.5 w-3.5 mr-1.5" />
                            Code QR
                          </Button>
                        )}
                        {shouldShowCertificate(notification) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Navigate to certificates page
                              navigate(`/mes-missions?tab=certificates&event=${notification.event_id}`);
                            }}
                          >
                            <Award className="h-3.5 w-3.5 mr-1.5" />
                            Certificat
                          </Button>
                        )}
                      </div>
                    )}
                    
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
