import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMyMissions } from '@/hooks/useMyMissions';
import { CvColors } from '@/theme/colors';

export function MissionsScreen() {
  const { data = [], isLoading, isError, error, refetch, isRefetching } = useMyMissions();

  if (isLoading && !data.length) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color={CvColors.primary} accessibilityLabel="Chargement des missions" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.pad} edges={['top']}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Impossible de charger tes missions</Text>
          <Text style={styles.errorBody}>{error instanceof Error ? error.message : 'Erreur réseau'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={CvColors.primary}
            colors={[CvColors.primary]}
          />
        }
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listPad}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Aucune mission pour le moment. Inscris-toi à un événement sur le web.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.eventName}>{item.events?.name ?? 'Événement'}</Text>
            <Text style={styles.org}>{item.events?.organizations?.name ?? ''}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.status}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CvColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CvColors.background },
  pad: { flex: 1, padding: 20, backgroundColor: CvColors.background },
  listPad: { paddingVertical: 8, paddingBottom: 24 },
  errorCard: {
    backgroundColor: CvColors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CvColors.border,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: CvColors.foreground },
  errorBody: { fontSize: 15, color: CvColors.destructive },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  empty: { fontSize: 15, color: CvColors.mutedForeground, textAlign: 'center', lineHeight: 22 },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 18,
    borderRadius: 14,
    backgroundColor: CvColors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CvColors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  eventName: { fontSize: 17, fontWeight: '600', color: CvColors.foreground },
  org: { fontSize: 14, color: CvColors.mutedForeground, marginTop: 4 },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: CvColors.muted,
  },
  badgeText: { fontSize: 12, fontWeight: '600', color: CvColors.mutedForeground },
});
