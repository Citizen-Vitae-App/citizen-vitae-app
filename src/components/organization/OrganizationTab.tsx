import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, FolderKanban, ChevronRight, Building2 } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { MembersTab } from './MembersTab';
import { TeamsTab } from './TeamsTab';
import { OrganizationSettingsContent } from './OrganizationSettingsContent';
interface OrganizationTabProps {
  onNavigateToMembers?: () => void;
  onNavigateToTeams?: () => void;
}
type Section = 'profile' | 'members' | 'teams';
const sections = [{
  id: 'profile' as Section,
  label: 'Profil & Branding',
  icon: Building2,
  description: 'Personnalisez l\'identité de votre organisation'
}, {
  id: 'members' as Section,
  label: 'Membres',
  icon: Users,
  description: 'Gérez les rôles et permissions'
}, {
  id: 'teams' as Section,
  label: 'Équipes',
  icon: FolderKanban,
  description: 'Organisez vos équipes'
}];
export function OrganizationTab({
  onNavigateToMembers,
  onNavigateToTeams
}: OrganizationTabProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<Section>('profile');

  // Mobile view - show cards that navigate to separate tabs/pages
  if (isMobile) {
    return <div className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold">Organisation</h2>
        
        <div className="grid gap-4">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/organization/settings')}>
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

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onNavigateToMembers}>
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

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={onNavigateToTeams}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FolderKanban className="h-5 w-5 text-primary" />
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
      </div>;
  }

  // Desktop view - unified layout with side navigation
  return <div className="flex gap-8">
        {/* Left side navigation */}
        <nav className="w-56 flex-shrink-0">
          <div className="sticky top-32 space-y-1">
            {sections.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return <button key={section.id} onClick={() => setActiveSection(section.id)} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all", isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{section.label}</span>
                </button>;
          })}
          </div>
        </nav>

        {/* Right content area */}
        <div className="flex-1 min-w-0">
        {activeSection === 'profile' && <OrganizationSettingsContent embedded />}
          {activeSection === 'members' && <MembersTab canManageMembers />}
          {activeSection === 'teams' && <TeamsTab canCreateTeams />}
        </div>
      </div>;
}