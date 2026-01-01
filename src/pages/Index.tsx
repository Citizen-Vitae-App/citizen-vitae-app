import { Search, Calendar, SlidersHorizontal, User, Settings, LogOut, Lock, Menu, ClipboardList, Globe, HelpCircle, Building, Shield, Heart } from "lucide-react";
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
import { useUserOrganizations } from '@/hooks/useUserOrganizations';
import { generateShortTitle } from '@/lib/utils';
import { hasActiveOwnerInvitation, getOwnerInvitationRedirectUrl, captureOwnerInvitation } from '@/lib/invitationHandoff';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const Index = () => {
  const { user, profile, signOut, needsOnboarding, isLoading: isAuthLoading, hasRole } = useAuth();
  const { activeOrganization, canAccessDashboard } = useUserOrganizations();
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

  // Capture any owner invitation from URL on mount
  useEffect(() => {
    captureOwnerInvitation();
  }, []);

  // Handle redirections - with owner invitation exception
  useEffect(() => {
    if (!isAuthLoading && user) {
      // Check if there's an active owner invitation
      if (hasActiveOwnerInvitation()) {
        const redirectUrl = getOwnerInvitationRedirectUrl();
        if (redirectUrl) {
          console.log('[Index] Owner invitation active, redirecting to org onboarding:', redirectUrl);
          navigate(redirectUrl);
          return;
        }
      }
      
      // Standard onboarding redirect only if NO owner invitation
      if (needsOnboarding) {
        console.log('[Index] No owner invitation, redirecting to user onboarding');
        navigate('/onboarding');
      }
    }
  }, [user, needsOnboarding, isAuthLoading, navigate]);

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const getOrgInitials = (name: string) => {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  const formatEventDate = (startDate: string) => {
    return format(parseISO(startDate), "d MMMM yyyy 'à' HH'h'mm", { locale: fr });
  };


  const getDateButtonLabel = () => {
    if (!dateRange.start) return 'Quand ?';
    if (!dateRange.end) return format(dateRange.start, 'd MMM', { locale: fr });
    return `${format(dateRange.start, 'd MMM', { locale: fr })} - ${format(dateRange.end, 'd MMM', { locale: fr })}`;
  };

  // Show login prompt for unauthenticated users on mobile
  const showMobileLoginPrompt = !isAuthLoading && !user;

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
              <div className="flex-1 border border-border rounded-md px-6 py-2 flex items-center gap-4 shadow-sm bg-background/50 backdrop-blur-sm hover:shadow-md hover:border-primary/30 transition-all duration-200">
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
                className="border border-border rounded-md px-6 py-3.5 flex items-center gap-3 shadow-sm whitespace-nowrap bg-background/50 backdrop-blur-sm hover:bg-background/70 hover:shadow-md hover:border-primary/30 transition-all duration-200 relative"
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

            {/* Search Bar - Mobile (disabled when not logged in) */}
            <div className="flex md:hidden flex-1 items-center gap-2">
              <div className={`flex-1 border border-border rounded-md px-3 py-2 flex items-center gap-2 bg-background/50 transition-all duration-200 ${showMobileLoginPrompt ? 'opacity-50 pointer-events-none' : 'hover:shadow-md hover:border-primary/30'}`}>
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Input
                  type="search"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={showMobileLoginPrompt}
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-base"
                  style={{ fontSize: '16px' }}
                />
              </div>
              
              {/* Filters Button - Mobile (icon only, disabled when not logged in) */}
              <button
                onClick={() => !showMobileLoginPrompt && setIsFiltersOpen(true)}
                disabled={showMobileLoginPrompt}
                className={`border border-border rounded-md p-2.5 flex items-center justify-center bg-background/50 relative flex-shrink-0 transition-all duration-200 ${showMobileLoginPrompt ? 'opacity-50 pointer-events-none' : 'hover:bg-background/70 hover:shadow-md hover:border-primary/30'}`}
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
                  
                  {/* Bouton accès console organisation - juste avant l'avatar */}
                  {canAccessDashboard && activeOrganization && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          className="relative h-10 w-10 rounded-full p-0"
                          onClick={() => navigate('/organization/dashboard')}
                        >
                          <Avatar className="h-10 w-10 cursor-pointer border-2 border-primary/20">
                            <AvatarImage src={activeOrganization.logo_url || undefined} alt={activeOrganization.name} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {getOrgInitials(activeOrganization.name)}
                            </AvatarFallback>
                          </Avatar>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Console organisation</TooltipContent>
                    </Tooltip>
                  )}
                  
                  {/* Avatar cliquable vers profil */}
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full p-0"
                    onClick={() => navigate('/profile')}
                  >
                    <Avatar className="h-10 w-10 cursor-pointer">
                      <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>

                  {/* Menu burger style Airbnb */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="h-10 px-3 rounded-full border-border hover:shadow-md transition-shadow"
                      >
                        <Menu className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* Section principale */}
                      <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/my-missions')}>
                        <ClipboardList className="mr-3 h-4 w-4" />
                        <span>Mes Missions</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/profile')}>
                        <User className="mr-3 h-4 w-4" />
                        <span>Profil</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/favorites')}>
                        <Heart className="mr-3 h-4 w-4" />
                        <span>Mes favoris</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      {/* Section paramètres */}
                      <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/settings')}>
                        <Settings className="mr-3 h-4 w-4" />
                        <span>Paramètres</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer py-3" onClick={() => navigate('/settings')}>
                        <Globe className="mr-3 h-4 w-4" />
                        <span>Langue</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer py-3">
                        <HelpCircle className="mr-3 h-4 w-4" />
                        <span>Centre d'aide</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      {/* Accès console organisation */}
                      {canAccessDashboard && (
                        <DropdownMenuItem onClick={() => navigate('/organization/dashboard')} className="cursor-pointer py-3">
                          <Building className="mr-3 h-4 w-4" />
                          <span>Console organisation</span>
                        </DropdownMenuItem>
                      )}
                      
                      {/* Console Super Admin */}
                      {hasRole('super_admin') && (
                        <DropdownMenuItem onClick={() => navigate('/super-admin')} className="cursor-pointer py-3">
                          <Shield className="mr-3 h-4 w-4" />
                          <span>Console Super Admin</span>
                        </DropdownMenuItem>
                      )}
                      
                      {/* Déconnexion */}
                      <DropdownMenuItem onClick={signOut} className="cursor-pointer py-3">
                        <LogOut className="mr-3 h-4 w-4" />
                        <span>Déconnexion</span>
                      </DropdownMenuItem>
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

      {/* Mobile Login Prompt - Centered overlay */}
      {showMobileLoginPrompt && (
        <div className="md:hidden fixed inset-0 top-14 z-40 flex items-center justify-center bg-background/95 backdrop-blur-sm px-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              Accédez aux missions citoyennes
            </h2>
            <p className="text-muted-foreground mb-8">
              Connectez-vous ou créez un compte pour découvrir et participer aux événements solidaires près de chez vous.
            </p>
            <Link to="/auth" className="block">
              <Button size="lg" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Se connecter / Créer un compte
              </Button>
            </Link>
          </div>
        </div>
      )}

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
                organizationId={event.organization_id}
                date={formatEventDate(event.start_date)}
                location={event.location}
                image={event.cover_image_url || 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&auto=format&fit=crop'}
              />
            ))}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation - Only show when logged in */}
      {user && <MobileBottomNav />}
      
      {/* Bottom padding for mobile nav */}
      {user && <div className="h-16 md:hidden" />}
    </div>
  );
};

export default Index;