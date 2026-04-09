import { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  ListRenderItem,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { parseISO, isBefore } from 'date-fns';
import { useMyMissions, type RegistrationWithEvent } from '@/hooks/useMyMissions';
import { useFavoriteMissions, type FavoriteWithEvent } from '@/hooks/useFavoriteMissions';
import { MissionCertificateCard } from '@/components/missions/MissionCertificateCard';
import { MissionUpcomingCard } from '@/components/missions/MissionUpcomingCard';
import { MissionCancelledCard } from '@/components/missions/MissionCancelledCard';
import { MissionFavoriteCard } from '@/components/missions/MissionFavoriteCard';
import { CvColors } from '@/theme/colors';

type MissionTab = 'upcoming' | 'favorites' | 'certificates' | 'cancelled';

function MissionsTabBar({ active, onChange }: { active: MissionTab; onChange: (t: MissionTab) => void }) {
  const { width } = useWindowDimensions();
  const tabs: { id: MissionTab; label: string }[] = [
    { id: 'upcoming', label: 'À venir' },
    { id: 'favorites', label: 'Favoris' },
    { id: 'certificates', label: 'Certificats' },
    { id: 'cancelled', label: 'Annulations' },
  ];
  return (
    <View style={styles.tabBarOuter}>
      <View style={[styles.tabBar, { width }]}>
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <Pressable
              key={t.id}
              style={styles.tabBtn}
              onPress={() => onChange(t.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {t.label}
              </Text>
              <View style={[styles.tabUnderline, isActive && styles.tabUnderlineActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MissionsScreen() {
  const { data: registrations = [], isLoading, isError, error, refetch, isRefetching } = useMyMissions();
  const {
    data: favoriteMissions = [],
    isLoading: favLoading,
    refetch: refetchFavorites,
    isRefetching: favRefetching,
  } = useFavoriteMissions();
  const [tab, setTab] = useState<MissionTab>('upcoming');

  const { upcomingEvents, completedEvents, cancelledEvents } = useMemo(() => {
    const now = new Date();
    const list = registrations;
    const upcoming = list
      .filter((r) => isBefore(now, parseISO(r.events.end_date)))
      .sort(
        (a, b) =>
          parseISO(a.events.start_date).getTime() - parseISO(b.events.start_date).getTime()
      );
    const completed = list.filter(
      (r) => !isBefore(now, parseISO(r.events.end_date)) && r.attended_at !== null
    );
    const cancelled = list.filter(
      (r) => !isBefore(now, parseISO(r.events.end_date)) && r.attended_at === null
    );
    return { upcomingEvents: upcoming, completedEvents: completed, cancelledEvents: cancelled };
  }, [registrations]);

  const listDataRegistrations: RegistrationWithEvent[] = useMemo(() => {
    switch (tab) {
      case 'upcoming':
        return upcomingEvents;
      case 'certificates':
        return completedEvents;
      case 'cancelled':
        return cancelledEvents;
      default:
        return [];
    }
  }, [tab, upcomingEvents, completedEvents, cancelledEvents]);

  const refreshing = isRefetching || favRefetching;

  const onRefresh = () => {
    void Promise.all([refetch(), refetchFavorites()]);
  };

  const renderRegistrationItem: ListRenderItem<RegistrationWithEvent> = ({ item }) => {
    if (tab === 'certificates') return <MissionCertificateCard registration={item} />;
    if (tab === 'upcoming') return <MissionUpcomingCard registration={item} />;
    return <MissionCancelledCard registration={item} />;
  };

  const renderFavoriteItem: ListRenderItem<FavoriteWithEvent> = ({ item }) => (
    <MissionFavoriteCard favorite={item} />
  );

  const emptyMessage = useMemo(() => {
    switch (tab) {
      case 'upcoming':
        return 'Aucune mission à venir';
      case 'favorites':
        return 'Aucune mission en favoris';
      case 'certificates':
        return 'Aucun certificat disponible';
      default:
        return 'Aucune annulation';
    }
  }, [tab]);

  const keyExtractorReg = (item: RegistrationWithEvent) => item.id;
  const keyExtractorFav = (item: FavoriteWithEvent) => item.id;

  if (isLoading && !registrations.length) {
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

  if (tab === 'favorites') {
    if (favLoading && favoriteMissions.length === 0) {
      return (
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.header}>
            <Text style={styles.screenTitle}>Mes Missions</Text>
            <MissionsTabBar active={tab} onChange={setTab} />
          </View>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={CvColors.primary} accessibilityLabel="Chargement des favoris" />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Mes Missions</Text>
          <MissionsTabBar active={tab} onChange={setTab} />
        </View>
        <FlatList
          data={favoriteMissions}
          keyExtractor={keyExtractorFav}
          renderItem={renderFavoriteItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={CvColors.primary}
              colors={[CvColors.primary]}
            />
          }
          contentContainerStyle={
            favoriteMissions.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Mes Missions</Text>
        <MissionsTabBar active={tab} onChange={setTab} />
      </View>
      <FlatList
        data={listDataRegistrations}
        keyExtractor={keyExtractorReg}
        renderItem={renderRegistrationItem}
        extraData={tab}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={CvColors.primary}
            colors={[CvColors.primary]}
          />
        }
        contentContainerStyle={
          listDataRegistrations.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={<Text style={styles.empty}>{emptyMessage}</Text>}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  pad: { flex: 1, padding: 20, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: CvColors.foreground,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  tabBarOuter: { alignSelf: 'stretch' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  tabBtn: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2 },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#94A3B8', textAlign: 'center' },
  tabLabelActive: { color: '#0F172A' },
  tabUnderline: { height: 2, marginTop: 8, alignSelf: 'stretch', backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: '#0F172A' },
  listContent: { paddingTop: 12, paddingBottom: 32 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 48 },
  empty: { fontSize: 15, color: CvColors.mutedForeground, textAlign: 'center', lineHeight: 22 },
  errorCard: {
    backgroundColor: CvColors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CvColors.border,
  },
  errorTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: CvColors.foreground },
  errorBody: { fontSize: 15, color: CvColors.destructive },
});
