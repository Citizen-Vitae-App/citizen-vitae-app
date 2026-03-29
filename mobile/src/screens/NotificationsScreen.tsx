import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNotificationsList } from '@/hooks/useNotifications';
import { CvColors } from '@/theme/colors';

export function NotificationsScreen() {
  const { data = [], isLoading, isError, error, refetch, isRefetching } = useNotificationsList();

  if (isLoading && !data.length) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color={CvColors.primary} accessibilityLabel="Chargement des notifications" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.pad} edges={['top']}>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Notifications indisponibles</Text>
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
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.empty}>Aucune notification.</Text>}
        renderItem={({ item }) => (
          <View
            style={[styles.row, !item.is_read && styles.unread]}
            accessibilityRole="text"
            accessibilityLabel={`${item.message_fr}${item.is_read ? '' : ', non lue'}`}
          >
            {!item.is_read ? <View style={styles.dot} /> : null}
            <View style={styles.rowBody}>
              <Text style={styles.message}>{item.message_fr}</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleString('fr-FR')}</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const UNREAD_BG = '#F3EEFF';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CvColors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: CvColors.background },
  pad: { flex: 1, padding: 20, backgroundColor: CvColors.background },
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
  empty: { fontSize: 15, color: CvColors.mutedForeground, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CvColors.border,
    backgroundColor: CvColors.card,
  },
  unread: { backgroundColor: UNREAD_BG },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CvColors.ring,
    marginRight: 12,
    marginTop: 6,
  },
  rowBody: { flex: 1 },
  message: { fontSize: 15, color: CvColors.foreground, lineHeight: 21 },
  date: { fontSize: 12, color: CvColors.mutedForeground, marginTop: 6 },
});
