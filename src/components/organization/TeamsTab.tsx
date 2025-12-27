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

export function TeamsTab() {
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

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold">Équipes</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Organisez vos membres en équipes
          </p>
        </div>
        {isAdmin && (
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
      ) : !teamsWithMembers || teamsWithMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted mb-6">
              <Users2 className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Aucune équipe</h3>
            <p className="text-muted-foreground mb-6">
              Créez des équipes pour organiser vos membres et leurs événements
            </p>
            {isAdmin && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une équipe
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teamsWithMembers.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              isAdmin={isAdmin}
              onEdit={() => setEditingTeam({ id: team.id, name: team.name, description: team.description })}
              onDelete={() => handleDeleteTeam(team.id)}
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
