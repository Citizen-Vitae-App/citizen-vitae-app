import { useTeams } from '@/hooks/useTeams';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface TeamSelectorProps {
  organizationId: string;
  selectedTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  userRole: 'admin' | 'leader' | 'member';
  userTeamId?: string | null;
  disabled?: boolean;
}

export function TeamSelector({
  organizationId,
  selectedTeamId,
  onTeamChange,
  userRole,
  userTeamId,
  disabled = false,
}: TeamSelectorProps) {
  const { teams, isLoading: isLoadingTeams } = useTeams(organizationId);

  // If user is a leader, only show their team and disable selection
  const isLeader = userRole === 'leader';
  const isDisabled = disabled || isLeader;

  // Filter teams based on user role
  const availableTeams = isLeader && userTeamId
    ? teams?.filter(t => t.id === userTeamId) || []
    : teams || [];

  // For leaders, auto-select their team
  const effectiveSelectedId = isLeader && userTeamId ? userTeamId : selectedTeamId;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Équipe</Label>
      <Select
        value={effectiveSelectedId || 'none'}
        onValueChange={(value) => onTeamChange(value === 'none' ? null : value)}
        disabled={isDisabled || isLoadingTeams}
      >
        <SelectTrigger className="bg-black/[0.03] hover:bg-black/[0.05] border-0">
          <div className="flex items-center gap-2">
            <Users2 className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Sélectionner une équipe" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {!isLeader && (
            <SelectItem value="none">
              <span className="text-muted-foreground">Aucune (organisation entière)</span>
            </SelectItem>
          )}
          {availableTeams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isLeader && (
        <p className="text-xs text-muted-foreground">
          En tant que leader d'équipe, vos événements sont associés à votre équipe
        </p>
      )}
    </div>
  );
}
