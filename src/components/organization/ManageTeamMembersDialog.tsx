import { useState } from 'react';
import { TeamWithMembers, useTeams } from '@/hooks/useTeams';
import { useOrganizationMembers } from '@/hooks/useOrganizationMembers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Crown, Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ManageTeamMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: TeamWithMembers;
  organizationId: string;
}

export function ManageTeamMembersDialog({
  open,
  onOpenChange,
  team,
  organizationId,
}: ManageTeamMembersDialogProps) {
  const { members: orgMembers } = useOrganizationMembers();
  const { addTeamMember, removeTeamMember, setTeamLeader } = useTeams(organizationId);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  // Members not in this team
  const availableMembers = orgMembers?.filter(
    (m) => !team.members.some((tm) => tm.user_id === m.user_id)
  ) || [];

  const handleAddMember = (userId: string) => {
    setAddingUserId(userId);
    addTeamMember.mutate(
      { teamId: team.id, userId },
      {
        onSuccess: () => {
          toast.success('Membre ajouté à l\'équipe');
          setAddingUserId(null);
        },
        onError: () => {
          toast.error('Erreur lors de l\'ajout');
          setAddingUserId(null);
        },
      }
    );
  };

  const handleRemoveMember = (userId: string) => {
    setRemovingUserId(userId);
    removeTeamMember.mutate(
      { teamId: team.id, userId },
      {
        onSuccess: () => {
          toast.success('Membre retiré de l\'équipe');
          setRemovingUserId(null);
        },
        onError: () => {
          toast.error('Erreur lors du retrait');
          setRemovingUserId(null);
        },
      }
    );
  };

  const handleSetLeader = (userId: string) => {
    setTeamLeader.mutate(
      { teamId: team.id, userId },
      {
        onSuccess: () => {
          toast.success('Leader désigné');
        },
        onError: () => {
          toast.error('Erreur lors de la désignation');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gérer les membres - {team.name}</DialogTitle>
          <DialogDescription>
            Ajoutez ou retirez des membres de cette équipe et désignez un leader
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current team members */}
          <div>
            <h4 className="text-sm font-medium mb-3">Membres de l'équipe ({team.members.length})</h4>
            {team.members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucun membre dans cette équipe
              </p>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {team.members.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.profile?.first_name || null, member.profile?.last_name || null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile?.first_name} {member.profile?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.profile?.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.is_leader ? (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-400">
                            <Crown className="h-3 w-3 mr-1" />
                            Leader
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetLeader(member.user_id)}
                            disabled={setTeamLeader.isPending}
                            className="text-xs"
                          >
                            <Crown className="h-3 w-3 mr-1" />
                            Désigner leader
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={removingUserId === member.user_id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <Separator />

          {/* Available members to add */}
          <div>
            <h4 className="text-sm font-medium mb-3">Ajouter des membres</h4>
            {availableMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Tous les membres de l'organisation sont déjà dans cette équipe
              </p>
            ) : (
              <ScrollArea className="h-[150px]">
                <div className="space-y-2">
                  {availableMembers.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(member.profile?.first_name || null, member.profile?.last_name || null)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.profile?.first_name} {member.profile?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.profile?.email}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddMember(member.user_id)}
                        disabled={addingUserId === member.user_id}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
