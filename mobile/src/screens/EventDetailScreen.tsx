import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Share,
  Linking,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import RenderHtml from 'react-native-render-html';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AppStackParamList } from '@/navigation/types';
import { useEventDetail } from '@/hooks/useEventDetail';
import { useGeocodeAddress } from '@/hooks/useGeocodeAddress';
import { useMobileFavorites } from '@/hooks/useMobileFavorites';
import { useMobileEventRegistration } from '@/hooks/useMobileEventRegistration';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { CertifyPresenceButton } from '@/components/eventDetail/CertifyPresenceButton';
import { EventCertificationModal } from '@/components/eventDetail/certification/EventCertificationModal';
import { UnregisterConfirmModal } from '@/components/eventDetail/UnregisterConfirmModal';
import { EventMapBlock } from '@/components/eventDetail/EventMapBlock';
import { buildWebAppPath } from '@/lib/webAppUrl';
import { useOrganizationSheet } from '@/contexts/OrganizationSheetContext';
import { sanitizeMobileHtml } from '@/lib/sanitizeMobileHtml';
import { parseOrganizationIdFromHref } from '@/lib/organizationPublicUrl';
const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=1200&auto=format&fit=crop';

const BLUE_LINK = '#0A51EC';
const META = '#6B7280';
const PRIMARY_BLUE = '#012573';

type Props = NativeStackScreenProps<AppStackParamList, 'EventDetail'>;

export function EventDetailScreen({ navigation, route }: Props) {
  const { eventId } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile, user } = useAuth();
  const { openOrganization } = useOrganizationSheet();
  const { showToast } = useToast();
  const registrationCallbacks = useMemo(
    () => ({
      onRegistered: () => showToast({ type: 'success', title: 'Inscription confirmée' }),
      onUnregistered: () =>
        showToast({
          type: 'success',
          title: 'Désinscription confirmée',
          visualVariant: 'unsubscribe',
        }),
      onRegisterFailed: (message: string) => showToast({ type: 'error', title: message }),
    }),
    [showToast]
  );
  const [unregisterModalVisible, setUnregisterModalVisible] = useState(false);
  const [certModalVisible, setCertModalVisible] = useState(false);
  const { data: event, isLoading, error } = useEventDetail(eventId);
  const { coords, isGeocoding } = useGeocodeAddress(event?.location, event?.latitude, event?.longitude);
  const { isFavorite, toggleFavorite, isPending: favPending } = useMobileFavorites();
  const {
    isRegistered,
    registration,
    isRegistering,
    isUnregistering,
    isAnimating,
    register,
    unregister,
    canUnregister,
  } = useMobileEventRegistration(eventId, registrationCallbacks);

  const htmlWidth = width - 48;

  const htmlRenderersProps = useMemo(
    () => ({
      a: {
        onPress: (_evt: unknown, href: string) => {
          const url = href?.trim();
          if (!url) return;
          const orgId = parseOrganizationIdFromHref(url);
          if (orgId) {
            openOrganization(orgId);
            return;
          }
          void Linking.openURL(url);
        },
      },
    }),
    [openOrganization]
  );

  const formatTime = (iso: string) => format(parseISO(iso), "HH'h'mm", { locale: fr });

  const formatMobileDateRange = useMemo(() => {
    if (!event) return '';
    const startDate = parseISO(event.start_date);
    const endDate = parseISO(event.end_date);
    const startDay = format(startDate, 'd', { locale: fr });
    const endDay = format(endDate, 'd', { locale: fr });
    const month = format(endDate, 'MMM', { locale: fr }).replace('.', '');
    if (startDay === endDay) return `${startDay} ${month}.`;
    return `${startDay}-${endDay} ${month}.`;
  }, [event]);

  const openMapsExternal = () => {
    if (!event) return;
    const q = encodeURIComponent(event.location);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  const openOrg = () => {
    if (!event) return;
    openOrganization(event.organizations.id);
  };

  const onShare = async () => {
    if (!event) return;
    const path = buildWebAppPath(`/events/${event.id}`);
    try {
      await Share.share({
        title: event.name,
        message: path ? `${event.name}\n${path}` : event.name,
      });
    } catch {
      /* ignore */
    }
  };

  const onFavorite = async () => {
    if (!event) return;
    const r = await toggleFavorite(event.id);
    if (r.needsAuth) {
      Alert.alert('Connexion requise', 'Tu dois être connecté pour utiliser les favoris.');
    }
  };

  const onRegister = () => {
    if (!event) return;
    const r = register(event.name, event.organization_id, profile?.id_verified);
    if (r.error === 'auth') {
      Alert.alert('Connexion requise', 'Connecte-toi pour t’inscrire.');
      return;
    }
    if (r.error === 'verify') {
      Alert.alert(
        'Vérification requise',
        'Vérifie ton identité depuis le profil ou le site web avant de t’inscrire.'
      );
    }
  };

  const onUnregister = () => {
    if (!event) return;
    if (!canUnregister(event.end_date)) return;
    setUnregisterModalVisible(true);
  };

  const onConfirmUnregister = () => {
    if (!event) return;
    setUnregisterModalVisible(false);
    const r = unregister(event.end_date);
    if (r.error === 'deadline') {
      Alert.alert(
        'Impossible',
        'Désinscription impossible moins de 24h avant la fin de l’événement.'
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_BLUE} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errTitle}>Événement introuvable</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const liked = isFavorite(event.id);
  const cover = event.cover_image_url?.trim() || DEFAULT_COVER;
  const safeDesc = event.description ? sanitizeMobileHtml(event.description) : '';

  const certifyAlreadyDone =
    registration?.status === 'self_certified' || !!registration?.attended_at;

  const venueLatitude = event.latitude ?? coords?.latitude ?? null;
  const venueLongitude = event.longitude ?? coords?.longitude ?? null;
  const isVenueCoordsLoading =
    (event.latitude == null || event.longitude == null) && isGeocoding;

  return (
    <View style={styles.root}>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.hero}>
          <Image source={{ uri: cover }} style={styles.heroImg} contentFit="cover" />
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.55)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            style={[styles.circleTop, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
          <View style={styles.heroActions}>
            <Pressable
              style={[styles.circleHero, styles.circleHeroFirst]}
              onPress={() => void onFavorite()}
              disabled={favPending}
              accessibilityRole="button"
              accessibilityLabel="Favori"
            >
              {liked ? (
                <MaterialCommunityIcons name="heart" size={22} color="#EF4444" />
              ) : (
                <Feather name="heart" size={20} color="#111827" />
              )}
            </Pressable>
            <Pressable style={styles.circleHero} onPress={() => void onShare()} accessibilityRole="button" accessibilityLabel="Partager">
              <Feather name="share-2" size={20} color="#111827" />
            </Pressable>
          </View>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.eventTitle}>{event.name}</Text>

          {event.event_cause_themes && event.event_cause_themes.length > 0 ? (
            <View style={styles.pillRow}>
              {event.event_cause_themes.map((ect) => (
                <View
                  key={ect.cause_themes.id}
                  style={[styles.pill, { backgroundColor: ect.cause_themes.color || PRIMARY_BLUE }]}
                >
                  <Text style={styles.pillText}>{ect.cause_themes.name}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.hr} />

          <Pressable style={styles.orgBlock} onPress={openOrg} accessibilityRole="button">
            <View style={styles.orgAvatar}>
              {event.organizations.logo_url ? (
                <Image
                  source={{ uri: event.organizations.logo_url }}
                  style={styles.orgAvatarImg}
                  contentFit="cover"
                />
              ) : (
                <MaterialCommunityIcons name="leaf" size={28} color="#15803D" />
              )}
            </View>
            <View style={styles.orgTextCol}>
              <Text style={styles.orgHint}>Organisé par</Text>
              <Text style={styles.orgName}>{event.organizations.name}</Text>
            </View>
          </Pressable>

          <View style={styles.hr} />

          {safeDesc.length > 0 ? (
            <View style={styles.descBlock}>
              <Text style={styles.sectionTitle}>À propos de l&apos;événement</Text>
              <RenderHtml
                contentWidth={htmlWidth}
                source={{ html: safeDesc }}
                baseStyle={styles.htmlBase}
                renderersProps={htmlRenderersProps}
                tagsStyles={{
                  p: { marginTop: 0, marginBottom: 10, color: META, fontSize: 15, lineHeight: 22 },
                  a: { color: BLUE_LINK, textDecorationLine: 'underline', fontSize: 15 },
                  li: { color: META, fontSize: 15, lineHeight: 22 },
                  ul: { marginBottom: 8 },
                  strong: { color: '#111827', fontWeight: '700' },
                }}
              />
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Où se situe l&apos;événement</Text>
          <Pressable onPress={openMapsExternal} style={styles.addrRow} accessibilityRole="link">
            <Feather name="map-pin" size={16} color={META} style={styles.addrIcon} />
            <Text style={styles.addrLink}>{event.location}</Text>
          </Pressable>

          {coords ? (
            <View style={styles.mapWrap}>
              <EventMapBlock latitude={coords.latitude} longitude={coords.longitude} />
            </View>
          ) : (
            <View style={styles.mapFallback}>
              <Text style={styles.mapFallbackText}>
                Carte non disponible (coordonnées ou clé Google Maps manquantes).
              </Text>
            </View>
          )}

          <View style={{ height: 168 }} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {isRegistered ? (
          <View style={styles.footerRow}>
            <CertifyPresenceButton
              eventStartDate={event.start_date}
              eventEndDate={event.end_date}
              eventLatitude={venueLatitude}
              eventLongitude={venueLongitude}
              isVenueCoordsLoading={isVenueCoordsLoading}
              certifyDisabled={certifyAlreadyDone}
              onCertifyPress={() => setCertModalVisible(true)}
            />
            <Pressable
              style={[
                styles.outlineBtn,
                styles.outlineBtnBelowCertify,
                !canUnregister(event.end_date) && styles.outlineDisabled,
              ]}
              onPress={onUnregister}
              disabled={isUnregistering || !canUnregister(event.end_date)}
            >
              {isUnregistering ? (
                <ActivityIndicator color="#B91C1C" />
              ) : (
                <Text style={styles.outlineBtnText}>Me désinscrire</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.footerRowCta}>
            <LinearGradient
              colors={['#012573', '#083AD2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaGrad}
            >
              <Pressable
                style={styles.ctaInner}
                onPress={onRegister}
                disabled={isRegistering}
                accessibilityRole="button"
                accessibilityLabel="Je m'engage"
              >
                {isRegistering ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : isAnimating ? (
                  <Text style={styles.ctaText}>Inscrit !</Text>
                ) : (
                  <Text style={styles.ctaText}>Je m&apos;engage</Text>
                )}
              </Pressable>
            </LinearGradient>
            <View style={styles.footerMeta}>
              <View style={styles.metaLine}>
                <Feather name="calendar" size={14} color={META} style={styles.metaIcon} />
                <Text style={styles.metaDate}>{formatMobileDateRange}</Text>
              </View>
              <View style={styles.metaLine}>
                <Feather name="clock" size={13} color={META} style={styles.metaIconSm} />
                <Text style={styles.metaTime}>{formatTime(event.start_date)}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
      <UnregisterConfirmModal
        visible={unregisterModalVisible}
        onClose={() => setUnregisterModalVisible(false)}
        onConfirm={onConfirmUnregister}
      />
      {user && registration ? (
        <EventCertificationModal
          visible={certModalVisible}
          onClose={() => setCertModalVisible(false)}
          eventId={event.id}
          organizationId={event.organization_id}
          eventName={event.name}
          eventStartDate={event.start_date}
          eventEndDate={event.end_date}
          eventLatitude={venueLatitude}
          eventLongitude={venueLongitude}
          allowSelfCertification={!!event.allow_self_certification}
          registrationId={registration.id}
          userId={user.id}
          registration={registration}
        />
      ) : null}
    </View>
  );
}

const HERO_H = Platform.OS === 'ios' ? 320 : 300;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 0 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  errTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  backLink: { padding: 12 },
  backLinkText: { color: BLUE_LINK, fontWeight: '600' },
  hero: { height: HERO_H, width: '100%', backgroundColor: '#E5E7EB' },
  heroImg: { ...StyleSheet.absoluteFillObject },
  circleTop: {
    position: 'absolute',
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActions: {
    position: 'absolute',
    right: 20,
    bottom: 52,
    flexDirection: 'row',
    alignItems: 'center',
  },
  circleHeroFirst: { marginLeft: 0 },
  circleHero: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sheet: {
    marginTop: -24,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginHorizontal: 4,
    marginBottom: 6,
  },
  pillText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },
  orgBlock: { flexDirection: 'row', alignItems: 'center' },
  orgAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orgAvatarImg: { width: '100%', height: '100%' },
  orgTextCol: { marginLeft: 14, flex: 1 },
  orgHint: { fontSize: 14, color: META },
  orgName: { fontSize: 16, fontWeight: '700', color: '#000000' },
  descBlock: { marginBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 12 },
  htmlBase: { color: META, fontSize: 15 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  addrIcon: { marginRight: 8, marginTop: 3 },
  addrLink: {
    flex: 1,
    fontSize: 14,
    color: BLUE_LINK,
    textDecorationLine: 'underline',
    lineHeight: 20,
  },
  mapWrap: { marginBottom: 8 },
  mapFallback: {
    height: 120,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  mapFallbackText: { textAlign: 'center', color: META, fontSize: 14 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  footerRow: {},
  outlineBtnBelowCertify: { marginTop: 12 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  outlineDisabled: { opacity: 0.45 },
  outlineBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 16 },
  footerRowCta: { flexDirection: 'row', alignItems: 'center' },
  ctaGrad: { flex: 1, borderRadius: 16, overflow: 'hidden', minHeight: 52, marginRight: 12 },
  ctaInner: { flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  footerMeta: { alignItems: 'flex-end' },
  metaLine: { flexDirection: 'row', alignItems: 'center' },
  metaIcon: { marginRight: 6 },
  metaIconSm: { marginRight: 5 },
  metaDate: { fontSize: 13, fontWeight: '700', color: '#111827', textDecorationLine: 'underline' },
  metaTime: { fontSize: 12, color: META },
});
