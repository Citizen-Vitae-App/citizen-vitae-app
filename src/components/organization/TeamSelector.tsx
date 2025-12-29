import { useTeams } from '@/hooks/useTeams';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users2, Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface TeamSelectorProps {
  organizationId: string;
  selectedTeamId: string | null;
  onTeamChange: (teamId: string | null) => void;
  userRole: 'admin' | 'leader' | 'member';
  userTeamId?: string | null;
  disabled?: boolean;
  showLabel?: boolean;
}

export function TeamSelector({
  organizationId,
  selectedTeamId,
  onTeamChange,
  userRole,
  userTeamId,
  disabled = false,
  showLabel = true,
}: TeamSelectorProps) {
  const { teams, isLoading: isLoadingTeams } = useTeams(organizationId);

  // If user is a leader or member, lock the team selection to their team
  const isLocked = userRole === 'leader' || userRole === 'member';
  const isDisabled = disabled || isLocked;

  // Filter teams based on user role
  const availableTeams = isLocked && userTeamId
    ? teams?.filter(t => t.id === userTeamId) || []
    : teams || [];

  // For leaders/members, auto-select their team
  const effectiveSelectedId = isLocked && userTeamId ? userTeamId : selectedTeamId;

  // Get selected team name for display
  const selectedTeamName = availableTeams.find(t => t.id === effectiveSelectedId)?.name;

  return (
    <div className="space-y-2">
      {showLabel && <Label className="text-sm font-medium">Équipe</Label>}
      <Select
        value={effectiveSelectedId || 'none'}
        onValueChange={(value) => onTeamChange(value === 'none' ? null : value)}
        disabled={isDisabled || isLoadingTeams}
      >
        <SelectTrigger className="bg-black/[0.03] hover:bg-black/[0.05] border-0">
          <div className="flex items-center gap-2 w-full">
            {isLocked ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Users2 className="h-4 w-4 text-muted-foreground" />
            )}
            <SelectValue placeholder="Sélectionner une équipe">
              {effectiveSelectedId && effectiveSelectedId !== 'none' 
                ? selectedTeamName 
                : 'Sélectionner une équipe'}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {!isLocked && (
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
      {isLocked && (
        <p className="text-xs text-muted-foreground">
          {userRole === 'leader' 
            ? "En tant que leader d'équipe, les événements sont associés à votre équipe"
            : "En tant que membre, les événements sont associés à votre équipe"}
        </p>
      )}
    </div>
  );
}
