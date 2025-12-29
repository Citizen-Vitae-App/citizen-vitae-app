import { useNavigate } from 'react-router-dom';
import { LogOut, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function SuperAdminHeader() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const initials = profile
    ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
    : 'SA';

  return (
    <header className="h-16 border-b border-[hsl(217.2,32.6%,17.5%)] bg-[hsl(222.2,84%,4.9%)] flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-[hsl(215,20.2%,65.1%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,17.5%)]" />
        <div>
          <h1 className="text-lg font-semibold text-[hsl(210,40%,98%)]">Console Super Admin</h1>
          <p className="text-xs text-[hsl(215,20.2%,65.1%)]">Gestion globale de la plateforme</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-[hsl(215,20.2%,65.1%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,17.5%)]"
        >
          <Home className="w-4 h-4 mr-2" />
          Retour à la plateforme
        </Button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[hsl(217.2,32.6%,17.5%)]">
          <Avatar className="h-7 w-7">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-emerald-600 text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-[hsl(210,40%,98%)]">
            {profile?.first_name} {profile?.last_name}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="text-[hsl(215,20.2%,65.1%)] hover:text-[hsl(210,40%,98%)] hover:bg-[hsl(217.2,32.6%,17.5%)]"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
