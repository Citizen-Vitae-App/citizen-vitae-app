import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { FavoriteCause } from '@/hooks/useCitizenProfile';
import { CvColors } from '@/theme/colors';
import { causeThemeMciName } from '@/lib/causeThemeIcon';

type Props = {
  visible: boolean;
  onClose: () => void;
  current: FavoriteCause[];
};

export function FavoriteCausesEditModal({ visible, onClose, current }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) setSelected(new Set(current.map((c) => c.id)));
  }, [visible, current]);

  const { data: allCauses = [], isLoading } = useQuery({
    queryKey: ['all-cause-themes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cause_themes').select('id, name, icon, color').order('name');
      if (error) throw error;
      return data as FavoriteCause[];
    },
    enabled: visible,
    staleTime: 10 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!user?.id) throw new Error('auth');
      await supabase.from('user_cause_themes').delete().eq('user_id', user.id);
      if (ids.length > 0) {
        const { error } = await supabase.from('user_cause_themes').insert(
          ids.map((cause_theme_id) => ({ user_id: user.id, cause_theme_id }))
        );
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-favorite-causes', user?.id] });
      onClose();
    },
    onError: () => {
      Alert.alert('Erreur', 'Impossible d’enregistrer tes causes favorites.');
    },
  });

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  };

  const onSave = () => {
    if (selected.size < 2) {
      Alert.alert('Sélection', 'Choisis au moins 2 causes (maximum 3).');
      return;
    }
    saveMutation.mutate([...selected]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.cancel}>Annuler</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Mes causes</Text>
          <Pressable onPress={onSave} disabled={saveMutation.isPending} hitSlop={12}>
            {saveMutation.isPending ? (
              <ActivityIndicator color={CvColors.primary} />
            ) : (
              <Text style={styles.save}>Enregistrer</Text>
            )}
          </Pressable>
        </View>
        <Text style={styles.modalHint}>Sélectionne 2 à 3 causes ({selected.size}/3)</Text>
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={CvColors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
            {allCauses.map((t) => {
              const on = selected.has(t.id);
              return (
                <Pressable
                  key={t.id}
                  onPress={() => toggle(t.id)}
                  style={[
                    styles.chip,
                    { borderColor: on ? t.color : CvColors.border },
                    on && { backgroundColor: `${t.color}22` },
                  ]}
                >
                  <MaterialCommunityIcons name={causeThemeMciName(t.icon)} size={18} color={t.color} />
                  <Text style={[styles.chipText, on && { fontWeight: '700', color: CvColors.foreground }]}>
                    {t.name}
                  </Text>
                  {on ? (
                    <MaterialCommunityIcons name="check-circle" size={18} color={t.color} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: CvColors.background, paddingTop: 8 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CvColors.border,
  },
  cancel: { fontSize: 16, color: CvColors.mutedForeground },
  modalTitle: { fontSize: 17, fontWeight: '700', color: CvColors.foreground },
  save: { fontSize: 16, fontWeight: '700', color: CvColors.primary },
  modalHint: { paddingHorizontal: 20, paddingVertical: 12, fontSize: 14, color: CvColors.mutedForeground },
  loader: { padding: 40, alignItems: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 10, paddingBottom: 40 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: CvColors.card,
  },
  chipText: { fontSize: 14, color: CvColors.mutedForeground },
});
