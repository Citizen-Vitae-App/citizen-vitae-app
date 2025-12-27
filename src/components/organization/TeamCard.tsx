import { TeamWithMembers } from '@/hooks/useTeams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Pencil, Trash2, Users, Crown } from 'lucide-react';
import { useState } from 'react';

interface TeamCardProps {
  team: TeamWithMembers;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onManageMembers: () => void;
}

export function TeamCard({ team, isAdmin, onEdit, onDelete, onManageMembers }: TeamCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const leader = team.members.find(m => m.is_leader);
  const memberCount = team.members.length;

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{team.name}</CardTitle>
            {team.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{team.description}</p>
            )}
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onManageMembers}>
                  <Users className="h-4 w-4 mr-2" />
                  Gérer les membres
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Leader section */}
          {leader && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={leader.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(leader.profile?.first_name || null, leader.profile?.last_name || null)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {leader.profile?.first_name} {leader.profile?.last_name}
                </p>
              </div>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-400 shrink-0">
                <Crown className="h-3 w-3 mr-1" />
                Leader
              </Badge>
            </div>
          )}

          {/* Members avatars stack */}
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {team.members.slice(0, 5).map((member) => (
                <Avatar key={member.user_id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={member.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(member.profile?.first_name || null, member.profile?.last_name || null)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {memberCount > 5 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">+{memberCount - 5}</span>
                </div>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {memberCount} membre{memberCount > 1 ? 's' : ''}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette équipe ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'équipe "{team.name}" sera supprimée. Les membres ne seront pas supprimés de l'organisation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setDeleteDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
