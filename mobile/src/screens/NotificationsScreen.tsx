import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNotificationsList, type NotificationRow } from '@/hooks/useNotifications';
import { CvColors } from '@/theme/colors';

const AVATAR_SIZE = 56;
const PLACEHOLDER_BG = '#E5E7EB';

function formatNotificationDate(iso: string): string {
  const d = parseISO(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return format(
    d,
    sameYear ? "d MMM 'à' HH:mm" : "d MMM yyyy 'à' HH:mm",
    { locale: fr }
  );
}

function NotificationCard({ item }: { item: NotificationRow }) {
  const coverUri = item.event?.cover_image_url?.trim();
  const unread = !item.is_read;

  return (
    <View style={styles.card} accessibilityRole="summary" accessibilityLabel={`${item.message_fr}${unread ? ', non lue' : ''}`}>
      {unread ? <View style={styles.unreadDot} /> : null}
      <View style={styles.avatarWrap}>
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.avatarImg} contentFit="cover" />
        ) : (
          <View style={styles.avatarFallback}>
            <MaterialCommunityIcons name="bell-outline" size={26} color="#64748B" />
          </View>
        )}
      </View>
      <View style={[styles.cardBody, unread && styles.cardBodyUnread]}>
        <Text style={styles.message} numberOfLines={4}>
          {item.message_fr}
        </Text>
        <Text style={styles.timestamp}>{formatNotificationDate(item.created_at)}</Text>
      </View>
    </View>
  );
}

export function NotificationsScreen() {
  const { data = [], isLoading, isError, error, refetch, isRefetching } = useNotificationsList();

  if (isLoading && !data.length) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator size="large" color={CvColors.foreground} accessibilityLabel="Chargement des notifications" />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <Text style={styles.pageTitle}>Notifications</Text>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Notifications indisponibles</Text>
          <Text style={styles.errorBody}>{error instanceof Error ? error.message : 'Erreur réseau'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Text style={styles.pageTitle}>Notifications</Text>}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={CvColors.foreground}
            colors={[CvColors.foreground]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          data.length === 0 ? styles.listContentEmpty : null,
        ]}
        ListEmptyComponent={<Text style={styles.empty}>Aucune notification.</Text>}
        renderItem={({ item }) => <NotificationCard item={item} />}
      />
    </SafeAreaView>
  );
}

const PAGE_BG = '#F5F5F5';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE_BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: PAGE_BG },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    letterSpacing: -0.5,
  },
  listContent: {
    paddingBottom: 32,
    paddingTop: 0,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: { fontSize: 15, color: CvColors.mutedForeground, textAlign: 'center', paddingHorizontal: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingRight: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8E8',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    zIndex: 1,
  },
  avatarWrap: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: PLACEHOLDER_BG,
    marginRight: 14,
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PLACEHOLDER_BG,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardBodyUnread: {
    paddingRight: 10,
  },
  message: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 21,
  },
  timestamp: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '400',
  },
  errorCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E8E8E8',
  },
  errorTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: CvColors.foreground },
  errorBody: { fontSize: 15, color: CvColors.destructive },
});
