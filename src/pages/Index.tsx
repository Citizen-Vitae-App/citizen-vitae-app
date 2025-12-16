import { Search, Calendar, SlidersHorizontal, User, Settings, LogOut } from "lucide-react";
import { NotificationDropdown } from '@/components/NotificationDropdown';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from '@/assets/logo.png';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EventCard from "@/components/EventCard";
import EventFilters, { DateRange } from "@/components/EventFilters";
import { useAuth } from '@/hooks/useAuth';
import { usePublicEvents } from '@/hooks/useEvents';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

const Index = () => {
  const { user, profile, signOut, needsOnboarding, isLoading: isAuthLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ start: null, end: null });
  const [selectedCauses, setSelectedCauses] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  const { events, isLoading: isEventsLoading } = usePublicEvents({
    searchQuery,
    dateRange,
    causeFilters: selectedCauses
  });

  const activeFiltersCount = (dateRange.start ? 1 : 0) + selectedCauses.length;

  useEffect(() => {
    if (!isAuthLoading && user) {
      if (needsOnboarding) {
        navigate('/onboarding');
      } else if (hasRole('super_admin')) {
        navigate('/admin');
      } else if (hasRole('organization')) {
        navigate('/organization/dashboard');
      }
    }
  }, [user, needsOnboarding, isAuthLoading, hasRole, navigate]);

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const formatEventDate = (startDate: string) => {
    return format(parseISO(startDate), "d MMMM yyyy 'à' HH'h'mm", { locale: fr });
  };

  const generateShortTitle = (name: string) => {
    const words = name.split(' ').slice(0, 2);
    return words.join(' ');
  };

  const getDateButtonLabel = () => {
    if (!dateRange.start) return 'Quand ?';
    if (!dateRange.end) return format(dateRange.start, 'd MMM', { locale: fr });
    return `${format(dateRange.start, 'd MMM', { locale: fr })} - ${format(dateRange.end, 'd MMM', { locale: fr })}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16 gap-3">
            {/* Logo */}
            <div className="flex-shrink-0">
              <img src={logo} alt="CitizenVitae" className="h-6 md:h-8" />
            </div>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-xl mx-8 items-center gap-4">
              {/* Search + Date Combined */}
              <div className="flex-1 border border-border rounded-md px-6 py-2 flex items-center gap-4 shadow-sm bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 flex-1">
                  <Search className="w-5 h-5 text-foreground flex-shrink-0" />
                  <Input
                    type="search"
                    placeholder="Rechercher un événement..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground font-medium"
                  />
                </div>
                
                {/* Vertical Separator */}
                <div className="h-8 w-px bg-border"></div>
                
                <button 
                  onClick={() => setIsFiltersOpen(true)}
                  className="flex items-center gap-3 whitespace-nowrap hover:opacity-70 transition-opacity"
                >
                  <Calendar className="w-5 h-5 text-foreground" />
                  <span className="text-foreground text-sm">{getDateButtonLabel()}</span>
                </button>
              </div>

              {/* Filters Button - Desktop */}
              <button 
                onClick={() => setIsFiltersOpen(true)}
                className="border border-border rounded-md px-6 py-3.5 flex items-center gap-3 shadow-sm whitespace-nowrap bg-background/50 backdrop-blur-sm hover:bg-background/70 relative"
              >
                <SlidersHorizontal className="w-4 h-4 text-foreground" />
                <span className="text-foreground text-sm">Filtres</span>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Search Bar - Mobile */}
            <div className="flex md:hidden flex-1 items-center gap-2">
              <div className="flex-1 border border-border rounded-md px-3 py-2 flex items-center gap-2 bg-background/50">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  type="search"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-sm"
                />
              </div>
              
              {/* Filters Button - Mobile (icon only) */}
              <button 
                onClick={() => setIsFiltersOpen(true)}
                className="border border-border rounded-md p-2.5 flex items-center justify-center bg-background/50 hover:bg-background/70 relative flex-shrink-0"
              >
                <SlidersHorizontal className="w-4 h-4 text-foreground" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-xs w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* User Actions - Desktop only */}
            <div className="hidden md:flex flex-shrink-0 items-center gap-3">
              {user ? (
                <>
                  <NotificationDropdown />
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                        <Avatar className="h-10 w-10 cursor-pointer">
                          <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials()}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 p-0">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-base text-foreground">
                            {profile?.first_name} {profile?.last_name?.toLowerCase()}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <div className="py-2 px-2 space-y-1">
                        <DropdownMenuItem className="cursor-pointer px-3 py-3 text-base">
                          <User className="mr-3 h-4 w-4" />
                          <span>Voir le profil</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer px-3 py-3 text-base">
                          <Settings className="mr-3 h-4 w-4" />
                          <span>Paramètres</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={signOut} className="cursor-pointer px-3 py-3 text-base">
                          <LogOut className="mr-3 h-4 w-4" />
                          <span>Se déconnecter</span>
                        </DropdownMenuItem>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Link to="/auth">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    Connexion
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Filters Modal */}
      <EventFilters
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedCauses={selectedCauses}
        onCausesChange={setSelectedCauses}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {isEventsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Aucun événement disponible</h3>
            <p className="text-muted-foreground">
              {searchQuery || activeFiltersCount > 0 ? 'Aucun événement ne correspond à vos critères' : 'Revenez bientôt pour découvrir de nouveaux événements'}
            </p>
            {activeFiltersCount > 0 && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setDateRange({ start: null, end: null });
                  setSelectedCauses([]);
                }}
              >
                Effacer les filtres
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
            {events.map((event) => (
              <EventCard 
                key={event.id}
                id={event.id}
                title={event.name}
                shortTitle={generateShortTitle(event.name)}
                organization={event.organization_name || 'Organisation'}
                date={formatEventDate(event.start_date)}
                location={event.location}
                image={event.cover_image_url || 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&auto=format&fit=crop'}
              />
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

export default Index;