import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeHeader } from '@/components/home/HomeHeader';
import { EventFiltersModal } from '@/components/home/EventFiltersModal';
import { EventListCard } from '@/components/home/EventListCard';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePublicEvents } from '@/hooks/usePublicEvents';

export function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [selectedCauseIds, setSelectedCauseIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { events, isLoading, isRefetching, error, refetch } = usePublicEvents({
    searchQuery: debouncedSearch,
    causeFilters: selectedCauseIds,
  });

  const activeFilterCount = selectedCauseIds.length;

  const listHeader = useMemo(
    () => (
      <HomeHeader
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onOpenFilters={() => setFiltersOpen(true)}
        activeFilterCount={activeFilterCount}
      />
    ),
    [searchQuery, activeFilterCount]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyCenter}>
          <ActivityIndicator size="large" color="#111827" accessibilityLabel="Chargement des événements" />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.emptyCenter}>
          <Text style={styles.errorTitle}>Impossible de charger les événements</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={48} color="#9CA3AF" />
        </View>
        <Text style={styles.emptyTitle}>Aucun événement disponible</Text>
        <Text style={styles.emptySub}>Revenez bientôt pour découvrir de nouveaux événements</Text>
      </View>
    );
  }, [isLoading, error]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={renderEmpty}
        renderItem={({ item }) => <EventListCard event={item} />}
        contentContainerStyle={events.length === 0 ? styles.listEmptyGrow : styles.listPad}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor="#111827"
            colors={['#111827']}
          />
        }
      />
      <EventFiltersModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        selectedCauseIds={selectedCauseIds}
        onApply={setSelectedCauseIds}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  listPad: { paddingBottom: 24 },
  listEmptyGrow: { flexGrow: 1 },
  emptyCenter: {
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center' },
  errorBody: { fontSize: 15, color: '#B91C1C', textAlign: 'center' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
    minHeight: 360,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
