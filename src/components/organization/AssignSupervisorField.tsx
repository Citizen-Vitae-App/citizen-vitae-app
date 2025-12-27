import { useState } from 'react';
import { useContributorsForSupervisor } from '@/hooks/useEventSupervisors';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Info } from 'lucide-react';

interface AssignSupervisorFieldProps {
  organizationId: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedSupervisorId: string | null;
  onSupervisorChange: (supervisorId: string | null) => void;
}

export function AssignSupervisorField({
  organizationId,
  enabled,
  onEnabledChange,
  selectedSupervisorId,
  onSupervisorChange,
}: AssignSupervisorFieldProps) {
  const { contributors, isLoading } = useContributorsForSupervisor(organizationId);

  const getInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const selectedContributor = contributors?.find(c => c.id === selectedSupervisorId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-normal">Assigner un superviseur</Label>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            onEnabledChange(checked);
            if (!checked) {
              onSupervisorChange(null);
            }
          }}
        />
      </div>

      {enabled && (
        <div className="pl-6 space-y-2">
          <Select
            value={selectedSupervisorId || 'none'}
            onValueChange={(value) => onSupervisorChange(value === 'none' ? null : value)}
            disabled={isLoading}
          >
            <SelectTrigger className="bg-black/[0.03] hover:bg-black/[0.05] border-0">
              {selectedContributor ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={selectedContributor.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(selectedContributor.first_name, selectedContributor.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    {selectedContributor.first_name} {selectedContributor.last_name}
                  </span>
                </div>
              ) : (
                <SelectValue placeholder="Sélectionner un superviseur" />
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">Aucun superviseur</span>
              </SelectItem>
              {contributors?.map((contributor) => (
                <SelectItem key={contributor.id} value={contributor.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={contributor.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(contributor.first_name, contributor.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      {contributor.first_name} {contributor.last_name}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {contributors && contributors.length === 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-muted/50 text-sm">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                Aucun contributeur disponible. Les superviseurs sont sélectionnés parmi les personnes ayant déjà participé à vos événements.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
