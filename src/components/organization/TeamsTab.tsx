import { useState } from 'react';
import { useTeams } from '@/hooks/useTeams';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users2 } from 'lucide-react';
import { TeamCard } from './TeamCard';
import { CreateTeamDialog } from './CreateTeamDialog';
import { ManageTeamMembersDialog } from './ManageTeamMembersDialog';
import { toast } from 'sonner';

interface TeamsTabProps {
  userTeamId?: string;
  canCreateTeams?: boolean;
  isLeader?: boolean;
}

export function TeamsTab({ userTeamId, canCreateTeams = true, isLeader = false }: TeamsTabProps) {
  const { organizationId, isAdmin } = useOrganizationMembers();
  const { 
    teamsWithMembers, 
    isLoadingWithMembers, 
    createTeam, 
    updateTeam, 
    deleteTeam 
  } = useTeams(organizationId || '');
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [manageMembersTeamId, setManageMembersTeamId] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<{ id: string; name: string; description: string | null } | null>(null);

  // Filter teams for Leaders - they only see their own team
  const displayedTeams = userTeamId && isLeader 
    ? teamsWithMembers?.filter(t => t.id === userTeamId)
    : teamsWithMembers;

  const handleCreateTeam = (name: string, description?: string) => {
    createTeam.mutate(
      { name, description },
      {
        onSuccess: () => {
          setCreateDialogOpen(false);
          toast.success('Équipe créée avec succès');
        },
        onError: () => {
          toast.error('Erreur lors de la création de l\'équipe');
        },
      }
    );
  };

  const handleUpdateTeam = (teamId: string, name: string, description?: string) => {
    updateTeam.mutate(
      { teamId, name, description },
      {
        onSuccess: () => {
          setEditingTeam(null);
          toast.success('Équipe mise à jour');
        },
        onError: () => {
          toast.error('Erreur lors de la mise à jour');
        },
      }
    );
  };

  const handleDeleteTeam = (teamId: string) => {
    deleteTeam.mutate(teamId, {
      onSuccess: () => {
        toast.success('Équipe supprimée');
      },
      onError: () => {
        toast.error('Erreur lors de la suppression');
      },
    });
  };

  const managingTeam = teamsWithMembers?.find(t => t.id === manageMembersTeamId);

  // For leaders, show "Mon équipe" title
  const pageTitle = isLeader ? 'Mon équipe' : 'Équipes';
  const pageDescription = isLeader 
    ? 'Gérez les membres de votre équipe'
    : 'Organisez vos membres en équipes';

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">{pageTitle}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {pageDescription}
          </p>
        </div>
        {canCreateTeams && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer une équipe
          </Button>
        )}
      </div>

      {isLoadingWithMembers ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : !displayedTeams || displayedTeams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted mb-6">
              <Users2 className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {isLeader ? 'Aucune équipe assignée' : 'Aucune équipe'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {isLeader 
                ? 'Vous n\'êtes pas encore assigné à une équipe'
                : 'Créez des équipes pour organiser vos membres et leurs événements'
              }
            </p>
            {canCreateTeams && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une équipe
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedTeams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isAdmin={isAdmin || isLeader}
              onEdit={canCreateTeams ? () => setEditingTeam({ id: team.id, name: team.name, description: team.description }) : undefined}
              onDelete={canCreateTeams ? () => handleDeleteTeam(team.id) : undefined}
              onManageMembers={() => setManageMembersTeamId(team.id)}
            />
          ))}
        </div>
      )}

      {/* Create Team Dialog */}
      <CreateTeamDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTeam}
        isLoading={createTeam.isPending}
      />

      {/* Edit Team Dialog (reuse CreateTeamDialog) */}
      {editingTeam && (
        <CreateTeamDialog
          open={!!editingTeam}
          onOpenChange={(open) => !open && setEditingTeam(null)}
          onSubmit={(name, description) => handleUpdateTeam(editingTeam.id, name, description)}
          isLoading={updateTeam.isPending}
          initialValues={{ name: editingTeam.name, description: editingTeam.description || '' }}
          mode="edit"
        />
      )}

      {/* Manage Members Dialog */}
      {managingTeam && organizationId && (
        <ManageTeamMembersDialog
          open={!!manageMembersTeamId}
          onOpenChange={(open) => !open && setManageMembersTeamId(null)}
          team={managingTeam}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
