import { useState } from 'react';
import { Heart, Pencil, X, Check, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as Icons from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { UserCauseTheme } from '@/hooks/useUserProfile';

interface FavoriteCausesSectionProps {
  causes: UserCauseTheme[];
}

export function FavoriteCausesSection({ causes }: FavoriteCausesSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch all available cause themes
  const { data: allCauses = [] } = useQuery({
    queryKey: ['all-cause-themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cause_themes')
        .select('id, name, icon, color')
        .order('name');
      if (error) throw error;
      return data as UserCauseTheme[];
    },
    staleTime: 10 * 60 * 1000,
    enabled: isEditing,
  });

  const saveMutation = useMutation({
    mutationFn: async (newCauseIds: string[]) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Delete existing
      const { error: deleteError } = await supabase
        .from('user_cause_themes')
        .delete()
        .eq('user_id', user.id);
      if (deleteError) throw deleteError;

      // Insert new
      if (newCauseIds.length > 0) {
        const { error: insertError } = await supabase
          .from('user_cause_themes')
          .insert(newCauseIds.map(cause_theme_id => ({
            user_id: user.id,
            cause_theme_id,
          })));
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-favorite-causes'] });
      toast.success('Causes favorites mises à jour');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde');
    },
  });

  const handleStartEdit = () => {
    setSelectedIds(new Set(causes.map(c => c.id)));
    setIsEditing(true);
  };

  const handleToggleCause = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = () => {
    saveMutation.mutate(Array.from(selectedIds));
  };

  if (isEditing) {
    return (
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Heart className="h-5 w-5 text-muted-foreground" />
            Mes causes favorites
          </h2>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setIsEditing(false)}
              disabled={saveMutation.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-primary"
              onClick={handleSave}
              disabled={saveMutation.isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {allCauses.map((cause) => {
            const IconComponent = (Icons as any)[cause.icon] || Icons.Heart;
            const isSelected = selectedIds.has(cause.id);
            return (
              <Badge
                key={cause.id}
                className="px-3 py-1.5 text-sm flex items-center gap-2 cursor-pointer transition-all"
                style={{
                  backgroundColor: isSelected ? cause.color : 'transparent',
                  borderColor: cause.color,
                  color: isSelected ? 'white' : cause.color,
                  borderWidth: '1.5px',
                  opacity: isSelected ? 1 : 0.7,
                }}
                onClick={() => handleToggleCause(cause.id)}
              >
                <IconComponent className="h-4 w-4" />
                {cause.name}
              </Badge>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {selectedIds.size} cause{selectedIds.size !== 1 ? 's' : ''} sélectionnée{selectedIds.size !== 1 ? 's' : ''}
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-muted-foreground" />
          Mes causes favorites
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleStartEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      </div>
      {causes.length === 0 ? (
        <button
          onClick={handleStartEdit}
          className="w-full border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 text-center text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
        >
          <Plus className="h-5 w-5 mx-auto mb-1" />
          Ajouter vos causes favorites
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          {causes.map((cause) => {
            const IconComponent = (Icons as any)[cause.icon] || Icons.Heart;
            return (
              <Badge
                key={cause.id}
                className="px-3 py-1.5 text-sm flex items-center gap-2"
                style={{
                  backgroundColor: cause.color,
                  borderColor: cause.color,
                  color: 'white',
                }}
              >
                <IconComponent className="h-4 w-4" />
                {cause.name}
              </Badge>
            );
          })}
        </div>
      )}
    </section>
  );
}
