import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Users, FolderKanban, ChevronRight, Building2 } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

const sections = [
  {
    id: 'profile' as Section,
    label: 'Paramètres',
    shortLabel: 'Paramètres',
    icon: Building2,
    description: 'Personnalisez l\'identité de votre organisation'
  },
  {
    id: 'members' as Section,
    label: 'Membres',
    shortLabel: 'Membres',
    icon: Users,
    description: 'Gérez les rôles et permissions'
  },
  {
    id: 'teams' as Section,
    label: 'Équipes',
    shortLabel: 'Équipes',
    icon: FolderKanban,
    description: 'Organisez vos équipes'
  }
];

export function OrganizationTab({
  onNavigateToMembers,
  onNavigateToTeams
}: OrganizationTabProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<Section>('profile');

  // Mobile view - show tabs at top like the reference design
  if (isMobile) {
    return (
      <div className="space-y-4 pb-20">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Organisation</h2>
          <p className="text-sm text-muted-foreground">
            Gérez le profil, les membres et les équipes
          </p>
        </div>
        
        <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as Section)} className="w-full">
          <TabsList className="w-full h-auto p-1 bg-muted/50 rounded-full grid grid-cols-3">
            {sections.map(section => {
              const Icon = section.icon;
              return (
                <TabsTrigger
                  key={section.id}
                  value={section.id}
                  className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm py-2.5 px-3 text-sm font-medium"
                >
                  {section.shortLabel}
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          <TabsContent value="profile" className="mt-4">
            <OrganizationSettingsContent embedded />
          </TabsContent>
          
          <TabsContent value="members" className="mt-4">
            <MembersTab canManageMembers />
          </TabsContent>
          
          <TabsContent value="teams" className="mt-4">
            <TeamsTab canCreateTeams />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Desktop view - unified layout with side navigation
  return (
    <div className="flex gap-8">
      {/* Left side navigation */}
      <nav className="w-56 flex-shrink-0">
        <div className="sticky top-32 space-y-1">
          {sections.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{section.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Right content area */}
      <div className="flex-1 min-w-0">
        {activeSection === 'profile' && <OrganizationSettingsContent embedded />}
        {activeSection === 'members' && <MembersTab canManageMembers />}
        {activeSection === 'teams' && <TeamsTab canCreateTeams />}
      </div>
    </div>
  );
}