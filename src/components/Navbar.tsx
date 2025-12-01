import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Bell, Settings } from 'lucide-react';

export const Navbar = () => {
  const { user, profile, signOut } = useAuth();

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  return (
    <header className="absolute top-0 left-0 right-0 px-8 py-6 z-10">
      <div className="flex items-center justify-between">
        <Link 
          to="/" 
          className="text-2xl font-bold text-foreground hover:opacity-80 transition-opacity"
        >
          CitizenVitae
        </Link>
        
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
              </Button>
              
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
                  <div className="flex items-center gap-3 p-4 pb-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={profile?.avatar_url || undefined} alt="Avatar" />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">
                        {profile?.first_name} {profile?.last_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>View Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm" className="text-foreground font-medium">
              <Link to="/auth">Se connecter</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
