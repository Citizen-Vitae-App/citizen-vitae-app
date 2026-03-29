import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { supabase } from '@/lib/supabase';

type CauseTheme = { id: string; name: string };

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedCauseIds: string[];
  onApply: (causeIds: string[]) => void;
};

export function EventFiltersModal({ visible, onClose, selectedCauseIds, onApply }: Props) {
  const [causes, setCauses] = useState<CauseTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    setDraft([...selectedCauseIds]);
  }, [visible, selectedCauseIds]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('cause_themes').select('id, name').order('name');
        if (error) throw error;
        if (!cancelled) setCauses((data as CauseTheme[]) || []);
      } catch {
        if (!cancelled) setCauses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const toggle = (id: string) => {
    setDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const reset = () => setDraft([]);

  const apply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
        <SafeAreaView style={styles.sheet}>
        <View style={styles.handleRow}>
          <Text style={styles.title}>Filtres</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fermer">
            <Text style={styles.closeText}>Fermer</Text>
          </Pressable>
        </View>
        <Text style={styles.sectionLabel}>Thématiques</Text>
        {loading ? (
          <ActivityIndicator style={styles.loader} color="#111827" />
        ) : (
          <FlatList
            data={causes}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => {
              const on = draft.includes(item.id);
              return (
                <Pressable
                  style={[styles.causeRow, on && styles.causeRowOn]}
                  onPress={() => toggle(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                >
                  <View style={[styles.checkbox, on && styles.checkboxOn]} />
                  <Text style={styles.causeName}>{item.name}</Text>
                </Pressable>
              );
            }}
          />
        )}
        <View style={styles.footer}>
          <Pressable style={styles.btnGhost} onPress={reset} accessibilityRole="button">
            <Text style={styles.btnGhostText}>Réinitialiser</Text>
          </Pressable>
          <Pressable style={styles.btnPrimary} onPress={apply} accessibilityRole="button">
            <Text style={styles.btnPrimaryText}>Appliquer</Text>
          </Pressable>
        </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    maxHeight: '72%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeText: { fontSize: 16, color: '#6B7280', fontWeight: '600' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  loader: { marginVertical: 24 },
  list: { paddingHorizontal: 12, maxHeight: 320 },
  causeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  causeRowOn: { backgroundColor: '#F3F4F6' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  checkboxOn: { backgroundColor: '#111827', borderColor: '#111827' },
  causeName: { fontSize: 16, color: '#111827', flex: 1 },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  btnGhost: {
    flex: 1,
    marginRight: 6,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  btnGhostText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  btnPrimary: {
    flex: 1,
    marginLeft: 6,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
