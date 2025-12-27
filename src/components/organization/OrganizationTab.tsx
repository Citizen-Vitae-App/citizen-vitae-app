import { useNavigate } from 'react-router-dom';
import { Settings, Users, UsersRound, ChevronRight } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OrganizationTabProps {
  onNavigateToMembers?: () => void;
  onNavigateToTeams?: () => void;
}

export function OrganizationTab({ onNavigateToMembers, onNavigateToTeams }: OrganizationTabProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-bold">Organisation</h2>
      
      <div className="grid gap-4">
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate('/organization/settings')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Paramètres</CardTitle>
                <CardDescription>
                  Personnalisez le profil et les informations de votre organisation
                </CardDescription>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={onNavigateToMembers}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Membres</CardTitle>
                <CardDescription>
                  Gérez les rôles et permissions des membres
                </CardDescription>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={onNavigateToTeams}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UsersRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Équipes</CardTitle>
                <CardDescription>
                  Organisez vos équipes et leurs responsables
                </CardDescription>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
