import { useNavigate } from 'react-router-dom';
import { Settings, Building2, Users, Globe, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function OrganizationTab() {
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

        <Card className="opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Gestion des membres</CardTitle>
                <CardDescription>
                  Gérez les rôles et permissions des membres
                </CardDescription>
              </div>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Bientôt</span>
          </CardHeader>
        </Card>

        <Card className="opacity-60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Page publique</CardTitle>
                <CardDescription>
                  Prévisualisez votre page organisation publique
                </CardDescription>
              </div>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Bientôt</span>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
