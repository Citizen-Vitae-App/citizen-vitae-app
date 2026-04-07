import { useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { SlideInDown } from 'react-native-reanimated';
import RenderHtml from 'react-native-render-html';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useOrganizationProfile } from '@/hooks/useOrganizationProfile';
import { causeThemeMciName } from '@/lib/causeThemeIcon';
import { sanitizeMobileHtml } from '@/lib/sanitizeMobileHtml';
import { navigationRef } from '@/navigation/navigationRef';
import { formatEventStartDate } from '@/lib/formatEventDate';
import { generateShortTitle } from '@/lib/generateShortTitle';
import { parseOrganizationIdFromHref } from '@/lib/organizationPublicUrl';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=1200&auto=format&fit=crop';
const META = '#6B7280';
const BLUE_LINK = '#0A51EC';
const OVERLAY = 'rgba(93, 93, 93, 0.55)';

function formatOrgType(type: string | null): string {
  switch (type) {
    case 'company':
      return 'Entreprise';
    case 'association':
      return 'Association';
    case 'foundation':
      return 'Fondation';
    case 'institution':
      return 'Institution';
    default:
      return 'Organisation';
  }
}

function normalizeWebsiteUrl(raw: string): string {
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

type Props = {
  visible: boolean;
  organizationId: string | null;
  onClose: () => void;
  /** Évite d’importer le contexte ici (import circulaire) ; ouvre une autre fiche org depuis le HTML. */
  onOpenOrganizationId: (id: string) => void;
};

export function OrganizationProfileBottomSheet({
  visible,
  organizationId,
  onClose,
  onOpenOrganizationId,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const htmlW = width - 48;
  const { data, isLoading, isError, refetch } = useOrganizationProfile(visible ? organizationId : null);

  const htmlLinkProps = useMemo(
    () => ({
      a: {
        onPress: (_evt: unknown, href: string) => {
          const url = href?.trim();
          if (!url) return;
          const linkedOrgId = parseOrganizationIdFromHref(url);
          if (linkedOrgId) {
            onOpenOrganizationId(linkedOrgId);
            return;
          }
          void Linking.openURL(url);
        },
      },
    }),
    [onOpenOrganizationId]
  );

  const org = data?.organization ?? null;

  const openEvent = (eventId: string) => {
    onClose();
    requestAnimationFrame(() => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('EventDetail', { eventId });
      }
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot} pointerEvents="box-none">
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Fermer la fiche" />
        <Animated.View
          entering={SlideInDown.springify().damping(28).stiffness(280)}
          style={[
            styles.sheet,
            {
              maxHeight: '92%',
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderSpacer} />
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Feather name="x" size={22} color={META} />
            </Pressable>
          </View>

          {!organizationId ? null : isLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#012573" />
            </View>
          ) : isError ? (
            <View style={styles.loader}>
              <Text style={styles.errText}>Impossible de charger l&apos;organisation.</Text>
              <Pressable onPress={() => void refetch()} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : !org ? (
            <View style={styles.loader}>
              <Text style={styles.errText}>Organisation introuvable ou accès restreint.</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollPad}
            >
              <View style={styles.coverWrap}>
                <Image
                  source={{ uri: org.cover_image_url?.trim() || DEFAULT_COVER }}
                  style={styles.coverImg}
                  contentFit="cover"
                />
              </View>

              <View style={styles.headerBlock}>
                <View style={styles.logoWrap}>
                  {org.logo_url ? (
                    <Image source={{ uri: org.logo_url }} style={styles.logoImg} contentFit="cover" />
                  ) : (
                    <MaterialCommunityIcons name="domain" size={36} color="#012573" />
                  )}
                </View>
                <View style={styles.titleRow}>
                  <Text style={styles.orgTitle}>{org.name}</Text>
                  <View style={styles.typePill}>
                    <Text style={styles.typePillText}>{formatOrgType(org.type)}</Text>
                  </View>
                </View>
                {org.bio ? (
                  <RenderHtml
                    contentWidth={htmlW}
                    source={{ html: sanitizeMobileHtml(org.bio) }}
                    baseStyle={styles.bioHtml}
                    renderersProps={htmlLinkProps}
                    tagsStyles={{
                      p: { marginTop: 0, marginBottom: 8, color: META, fontSize: 15, lineHeight: 22 },
                      a: { color: BLUE_LINK, textDecorationLine: 'underline' },
                    }}
                  />
                ) : null}
              </View>

              {org.description ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>À propos</Text>
                  <RenderHtml
                    contentWidth={htmlW}
                    source={{ html: sanitizeMobileHtml(org.description) }}
                    baseStyle={styles.bodyHtml}
                    renderersProps={htmlLinkProps}
                    tagsStyles={{
                      p: { marginTop: 0, marginBottom: 10, color: META, fontSize: 15, lineHeight: 22 },
                      a: { color: BLUE_LINK, textDecorationLine: 'underline' },
                      li: { color: META, fontSize: 15 },
                      ul: { marginBottom: 8 },
                      strong: { color: '#111827', fontWeight: '700' as const },
                    }}
                  />
                </View>
              ) : null}

              {data!.causeThemes.length > 0 ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Causes soutenues</Text>
                  <View style={styles.causesWrap}>
                    {data!.causeThemes.map((t) => (
                      <View key={t.id} style={[styles.causeChip, { backgroundColor: t.color || '#012573' }]}>
                        <MaterialCommunityIcons name={causeThemeMciName(t.icon)} size={14} color="#FFFFFF" />
                        <Text style={styles.causeChipText}>{t.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.infoCard}>
                {org.address ? (
                  <Pressable
                    style={styles.infoRow}
                    onPress={() =>
                      void Linking.openURL(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(org.address!)}`
                      )
                    }
                    accessibilityRole="link"
                  >
                    <Feather name="map-pin" size={18} color={META} style={styles.infoIcon} />
                    <Text style={styles.infoLink}>{org.address}</Text>
                  </Pressable>
                ) : null}
                {org.website ? (
                  <Pressable
                    style={styles.infoRow}
                    onPress={() => void Linking.openURL(normalizeWebsiteUrl(org.website!))}
                    accessibilityRole="link"
                  >
                    <Feather name="globe" size={18} color={META} style={styles.infoIcon} />
                    <Text style={styles.infoLink}>{org.website.replace(/^https?:\/\//i, '')}</Text>
                  </Pressable>
                ) : null}
                {org.email ? (
                  <Pressable
                    style={styles.infoRow}
                    onPress={() => void Linking.openURL(`mailto:${org.email}`)}
                    accessibilityRole="link"
                  >
                    <Feather name="mail" size={18} color={META} style={styles.infoIcon} />
                    <Text style={styles.infoLink}>{org.email}</Text>
                  </Pressable>
                ) : null}
                {org.phone ? (
                  <Pressable
                    style={styles.infoRow}
                    onPress={() => void Linking.openURL(`tel:${org.phone}`)}
                    accessibilityRole="link"
                  >
                    <Feather name="phone" size={18} color={META} style={styles.infoIcon} />
                    <Text style={styles.infoLink}>{org.phone}</Text>
                  </Pressable>
                ) : null}
                {org.employee_count != null && org.employee_count > 0 ? (
                  <View style={styles.infoRow}>
                    <Feather name="users" size={18} color={META} style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                      {org.employee_count} employé{org.employee_count > 1 ? 's' : ''}
                    </Text>
                  </View>
                ) : null}
                {org.sector ? (
                  <View style={styles.sectorBlock}>
                    <Text style={styles.sectorLbl}>Secteur</Text>
                    <Text style={styles.sectorVal}>{org.sector}</Text>
                  </View>
                ) : null}
                {org.linkedin_url || org.instagram_url || org.twitter_url ? (
                  <View style={styles.socialBlock}>
                    <Text style={styles.sectorLbl}>Réseaux sociaux</Text>
                    <View style={styles.socialRow}>
                      {org.linkedin_url ? (
                        <Pressable onPress={() => void Linking.openURL(org.linkedin_url!)}>
                          <Text style={styles.socialLink}>LinkedIn</Text>
                        </Pressable>
                      ) : null}
                      {org.instagram_url ? (
                        <Pressable onPress={() => void Linking.openURL(org.instagram_url!)}>
                          <Text style={styles.socialLink}>Instagram</Text>
                        </Pressable>
                      ) : null}
                      {org.twitter_url ? (
                        <Pressable onPress={() => void Linking.openURL(org.twitter_url!)}>
                          <Text style={styles.socialLink}>Twitter</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>

              {data!.upcomingEvents.length > 0 ? (
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Événements à venir</Text>
                  <Text style={styles.eventCountMeta}>
                    {data!.upcomingEvents.length} événement{data!.upcomingEvents.length > 1 ? 's' : ''}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                    {data!.upcomingEvents.map((ev) => (
                      <Pressable
                        key={ev.id}
                        style={styles.eventCard}
                        onPress={() => openEvent(ev.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Voir ${ev.name}`}
                      >
                        <Image
                          source={{ uri: ev.cover_image_url?.trim() || DEFAULT_COVER }}
                          style={styles.eventImg}
                          contentFit="cover"
                        />
                        <Text style={styles.eventCardTitle} numberOfLines={2}>
                          {generateShortTitle(ev.name)}
                        </Text>
                        <Text style={styles.eventCardMeta}>{formatEventStartDate(ev.start_date)}</Text>
                        <Text style={styles.eventCardLoc} numberOfLines={1}>
                          {ev.location}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {data!.pastEvents.length > 0 ? (
                <View style={[styles.block, styles.pastBlock]}>
                  <Text style={styles.blockTitle}>Événements passés</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                    {data!.pastEvents.map((ev) => (
                      <Pressable
                        key={ev.id}
                        style={[styles.eventCard, styles.eventCardPast]}
                        onPress={() => openEvent(ev.id)}
                        accessibilityRole="button"
                      >
                        <Image
                          source={{ uri: ev.cover_image_url?.trim() || DEFAULT_COVER }}
                          style={styles.eventImg}
                          contentFit="cover"
                        />
                        <Text style={styles.eventCardTitle} numberOfLines={2}>
                          {generateShortTitle(ev.name)}
                        </Text>
                        <Text style={styles.eventCardMeta}>
                          {format(parseISO(ev.end_date), 'd MMM yyyy', { locale: fr })}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: OVERLAY,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  sheetHeaderSpacer: { flex: 1 },
  loader: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: 24 },
  errText: { fontSize: 15, color: META, textAlign: 'center' },
  retryBtn: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 20 },
  retryBtnText: { color: BLUE_LINK, fontWeight: '600', fontSize: 16 },
  scrollPad: { paddingBottom: 24 },
  coverWrap: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
    height: 168,
    backgroundColor: '#E5E7EB',
  },
  coverImg: { width: '100%', height: '100%' },
  headerBlock: { paddingHorizontal: 20, marginTop: -36 },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  logoImg: { width: '100%', height: '100%' },
  titleRow: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  orgTitle: { fontSize: 22, fontWeight: '700', color: '#000000', flex: 1, minWidth: 160 },
  typePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typePillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  bioHtml: { color: META, fontSize: 15, marginTop: 8 },
  block: { marginTop: 20, paddingHorizontal: 20 },
  blockTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 10 },
  bodyHtml: { color: META, fontSize: 15 },
  causesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  causeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  causeChipText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  infoCard: {
    backgroundColor: '#FAFAFA',
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  infoIcon: { marginRight: 10, marginTop: 2 },
  infoText: { flex: 1, fontSize: 15, color: '#111827' },
  infoLink: { flex: 1, fontSize: 15, color: BLUE_LINK, textDecorationLine: 'underline', lineHeight: 22 },
  sectorBlock: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  sectorLbl: { fontSize: 13, color: META, marginBottom: 4 },
  sectorVal: { fontSize: 16, fontWeight: '600', color: '#111827' },
  socialBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  socialRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  socialLink: { fontSize: 15, color: BLUE_LINK, fontWeight: '500' },
  eventCountMeta: { fontSize: 14, color: META, marginBottom: 12 },
  hScroll: { gap: 12, paddingRight: 8 },
  eventCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventCardPast: { opacity: 0.85 },
  eventImg: { width: '100%', height: 110, backgroundColor: '#E5E7EB' },
  eventCardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', paddingHorizontal: 10, paddingTop: 8 },
  eventCardMeta: { fontSize: 12, color: META, paddingHorizontal: 10, paddingTop: 4 },
  eventCardLoc: { fontSize: 12, color: META, paddingHorizontal: 10, paddingBottom: 10, paddingTop: 2 },
  pastBlock: { marginBottom: 8 },
});
