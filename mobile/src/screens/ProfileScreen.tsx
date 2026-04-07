import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useCitizenProfile, type UserOrgMembership, type ManualExperience } from '@/hooks/useCitizenProfile';
import { buildWebAppPath, getWebAppOrigin } from '@/lib/webAppUrl';
import { useOrganizationSheet } from '@/contexts/OrganizationSheetContext';
import { causeThemeMciName } from '@/lib/causeThemeIcon';
import { buildProfileTimeline } from '@/lib/profileTimeline';
import { experienceTypeLabel, MONTHS_FR } from '@/lib/manualExperienceConstants';
import { FavoriteCausesEditModal } from '@/components/profile/FavoriteCausesEditModal';
import { AddManualExperienceModal } from '@/components/profile/AddManualExperienceModal';
import { CitizenVitaeSigil } from '@/components/branding/CitizenVitaeSigil';
import { CvColors } from '@/theme/colors';

function formatOrgRole(org: UserOrgMembership): string {
  if (org.is_owner) return 'Admin';
  const r = (org.role || '').toLowerCase();
  if (r === 'admin' || r === 'owner') return 'Admin';
  return org.role ? org.role.charAt(0).toUpperCase() + org.role.slice(1) : 'Membre';
}

function formatManualPeriod(m: ManualExperience): string {
  const start = `${MONTHS_FR[m.start_month]} ${m.start_year}`;
  if (m.is_current) return `${start} — Présent`;
  if (m.end_month && m.end_year) {
    return `${start} — ${MONTHS_FR[m.end_month]} ${m.end_year}`;
  }
  return start;
}

function orgInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation();
  const { organizations, favoriteCauses, experiences, manualExperiences, isLoading } = useCitizenProfile();
  const { openOrganization } = useOrganizationSheet();
  const [causesModalOpen, setCausesModalOpen] = useState(false);
  const [addManualOpen, setAddManualOpen] = useState(false);

  const timeline = buildProfileTimeline(experiences, manualExperiences);
  const experienceTotal = experiences.length + manualExperiences.length;
  const webAppOrigin = getWebAppOrigin();

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Citoyen';

  const openSettings = () => {
    navigation.dispatch(CommonActions.navigate({ name: 'ProfileSettings' }));
  };

  const openWebProfile = () => {
    const url = buildWebAppPath('/profile');
    if (url) void Linking.openURL(url);
  };

  const goToCertifiedEvent = (eventId: string) => {
    navigation.dispatch(CommonActions.navigate({ name: 'EventDetail', params: { eventId } }));
  };

  const primaryOrg = organizations[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View style={styles.topSpacer} />
          <Pressable
            onPress={openSettings}
            style={styles.gearBtn}
            accessibilityRole="button"
            accessibilityLabel="Réglages"
            hitSlop={12}
          >
            <MaterialCommunityIcons name="cog-outline" size={26} color={CvColors.foreground} />
          </Pressable>
        </View>

        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <MaterialCommunityIcons name="account" size={56} color={CvColors.mutedForeground} />
            )}
          </View>
          {profile?.id_verified ? (
            <View style={styles.verifiedBadge} accessibilityLabel="Identité vérifiée">
              <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
            </View>
          ) : null}
        </View>

        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.bio} numberOfLines={3}>
          {profile?.bio?.trim() ? profile.bio : 'Bio'}
        </Text>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={CvColors.primary} />
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <MaterialCommunityIcons name="home-variant-outline" size={22} color={CvColors.foreground} />
            <Text style={styles.sectionTitle}>Mon association</Text>
          </View>
          {primaryOrg ? (
            <Pressable
              style={styles.assocCard}
              onPress={() => openOrganization(primaryOrg.id)}
              accessibilityRole="button"
              accessibilityLabel={`Organisation ${primaryOrg.name}`}
            >
              <View style={styles.assocLogo}>
                {primaryOrg.logo_url ? (
                  <Image source={{ uri: primaryOrg.logo_url }} style={styles.assocLogoImg} contentFit="cover" />
                ) : (
                  <MaterialCommunityIcons name="domain" size={28} color={CvColors.mutedForeground} />
                )}
              </View>
              <View style={styles.assocMid}>
                <Text style={styles.assocName}>{primaryOrg.name}</Text>
                <View style={styles.rolePill}>
                  <MaterialCommunityIcons name="shield-check" size={14} color="#FFFFFF" />
                  <Text style={styles.rolePillText}>{formatOrgRole(primaryOrg)}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={CvColors.mutedForeground} />
            </Pressable>
          ) : (
            <View style={styles.assocCardMuted}>
              <Text style={styles.muted}>Tu n&apos;es rattaché à aucune organisation pour le moment.</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRowBetween}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="heart-outline" size={22} color={CvColors.foreground} />
              <Text style={styles.sectionTitle}>Mes causes favorites</Text>
            </View>
            <Pressable
              onPress={() => setCausesModalOpen(true)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Modifier les causes favorites"
            >
              <MaterialCommunityIcons name="pencil-outline" size={22} color={CvColors.foreground} />
            </Pressable>
          </View>
          <View style={styles.causesRow}>
            {favoriteCauses.length === 0 ? (
              <Text style={styles.muted}>Aucune cause sélectionnée — appuie sur le crayon pour en ajouter.</Text>
            ) : (
              favoriteCauses.map((c) => (
                <View key={c.id} style={[styles.causeTag, { backgroundColor: c.color }]}>
                  <MaterialCommunityIcons name={causeThemeMciName(c.icon)} size={14} color="#FFFFFF" />
                  <Text style={styles.causeTagText}>{c.name}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionTitleRowBetween}>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="book-open-page-variant" size={22} color={CvColors.foreground} />
              <Text style={styles.sectionTitle}>Expériences citoyennes</Text>
              {experienceTotal > 0 ? (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{experienceTotal}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.expActions}>
              <Pressable
                onPress={() => setAddManualOpen(true)}
                hitSlop={10}
                accessibilityLabel="Ajouter une expérience non certifiée"
              >
                <MaterialCommunityIcons name="plus" size={24} color={CvColors.foreground} />
              </Pressable>
              {webAppOrigin ? (
                <Pressable onPress={openWebProfile} hitSlop={10} accessibilityLabel="Modifier sur le web">
                  <MaterialCommunityIcons name="pencil-outline" size={22} color={CvColors.foreground} />
                </Pressable>
              ) : null}
            </View>
          </View>

          {timeline.length === 0 ? (
            <Text style={styles.muted}>
              Aucune expérience pour le moment. Utilise le + pour ajouter une expérience déclarative, ou participe à des
              événements pour des certifications Citizen Vitae.
            </Text>
          ) : (
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {timeline.slice(0, 30).map((entry, index) =>
                entry.kind === 'certified' ? (
                  <View key={`c-${entry.data.id}`} style={styles.timelineItem}>
                    <View style={styles.timelineGutter}>
                      <View style={[styles.timelineDot, index === 0 && styles.timelineDotFirst]} />
                    </View>
                    <Pressable
                      style={styles.expCard}
                      onPress={() => goToCertifiedEvent(entry.data.event_id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Voir l’événement ${entry.data.event_name}`}
                    >
                      <View style={[styles.expCardTop, styles.expCardTopRel]}>
                        <View style={styles.expLogo}>
                          {entry.data.organization_logo ? (
                            <Image
                              source={{ uri: entry.data.organization_logo }}
                              style={styles.expLogoImg}
                              contentFit="cover"
                            />
                          ) : (
                            <MaterialCommunityIcons name="domain" size={22} color={CvColors.mutedForeground} />
                          )}
                        </View>
                        <View style={styles.expCardBody}>
                          <Text style={styles.expTitle} numberOfLines={2}>
                            {entry.data.event_name}
                          </Text>
                          <View style={styles.expMetaRow}>
                            <MaterialCommunityIcons name="domain" size={14} color={CvColors.mutedForeground} />
                            <Text style={styles.expMeta} numberOfLines={1}>
                              {entry.data.organization_name}
                            </Text>
                          </View>
                          <View style={styles.expMetaRow}>
                            <MaterialCommunityIcons name="calendar-outline" size={14} color={CvColors.mutedForeground} />
                            <Text style={styles.expMeta}>
                              {format(parseISO(entry.data.attended_at), 'd MMMM yyyy', { locale: fr })}
                            </Text>
                          </View>
                          {entry.data.causes[0] ? (
                            <View style={[styles.miniCause, { borderColor: entry.data.causes[0].color }]}>
                              <MaterialCommunityIcons
                                name={causeThemeMciName(entry.data.causes[0].icon)}
                                size={12}
                                color={entry.data.causes[0].color}
                              />
                              <Text style={[styles.miniCauseText, { color: entry.data.causes[0].color }]}>
                                {entry.data.causes[0].name}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.certBadge}>
                          <View style={styles.certSigilWrap}>
                            <CitizenVitaeSigil size={13} />
                          </View>
                          <Text style={styles.certBadgeText}>Certifié</Text>
                        </View>
                      </View>
                    </Pressable>
                  </View>
                ) : (
                  <View key={`m-${entry.data.id}`} style={styles.timelineItem}>
                    <View style={styles.timelineGutter}>
                      <View style={[styles.timelineDot, index === 0 && styles.timelineDotFirst]} />
                    </View>
                    <View style={styles.expCard}>
                      <View style={[styles.expCardTop, styles.expCardTopRel]}>
                        <View style={styles.expLogo}>
                          <Text style={styles.expInitials}>{orgInitials(entry.data.organization_name)}</Text>
                        </View>
                        <View style={styles.expCardBody}>
                          <Text style={styles.expTitle} numberOfLines={2}>
                            {entry.data.title}
                          </Text>
                          <View style={styles.expMetaRow}>
                            <MaterialCommunityIcons name="domain" size={14} color={CvColors.mutedForeground} />
                            <Text style={styles.expMeta} numberOfLines={1}>
                              {entry.data.organization_name}
                            </Text>
                          </View>
                          <View style={styles.expMetaRow}>
                            <MaterialCommunityIcons name="calendar-outline" size={14} color={CvColors.mutedForeground} />
                            <Text style={styles.expMeta}>{formatManualPeriod(entry.data)}</Text>
                          </View>
                          <View style={styles.typePill}>
                            <Text style={styles.typePillText}>{experienceTypeLabel(entry.data.experience_type)}</Text>
                          </View>
                        </View>
                        <View style={styles.declBadge}>
                          <Text style={styles.declBadgeText}>Déclaratif</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )
              )}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <FavoriteCausesEditModal
        visible={causesModalOpen}
        onClose={() => setCausesModalOpen(false)}
        current={favoriteCauses}
      />
      <AddManualExperienceModal visible={addManualOpen} onClose={() => setAddManualOpen(false)} />
    </SafeAreaView>
  );
}

const SLATE_100 = '#F1F5F9';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  topSpacer: { flex: 1 },
  gearBtn: { padding: 4 },
  avatarWrap: { alignSelf: 'center', marginBottom: 12 },
  avatarCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: CvColors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: CvColors.card,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarImg: { width: '100%', height: '100%' },
  verifiedBadge: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F8FAFC',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: CvColors.foreground,
    textAlign: 'center',
  },
  bio: {
    marginTop: 8,
    fontSize: 15,
    color: CvColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  loading: { paddingVertical: 24, alignItems: 'center' },
  section: { marginTop: 28 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitleRowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: CvColors.foreground },
  expActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  assocCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CvColors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: SLATE_100,
    gap: 12,
  },
  assocCardMuted: {
    backgroundColor: CvColors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: SLATE_100,
  },
  assocLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: CvColors.muted,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assocLogoImg: { width: '100%', height: '100%' },
  assocMid: { flex: 1, minWidth: 0 },
  assocName: { fontSize: 16, fontWeight: '700', color: CvColors.foreground },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  rolePillText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  causesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  causeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  causeTagText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  muted: { fontSize: 14, color: CvColors.mutedForeground, lineHeight: 20 },
  countBadge: {
    marginLeft: 6,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: SLATE_100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: { fontSize: 13, fontWeight: '700', color: CvColors.mutedForeground },
  timeline: {
    marginTop: 4,
    paddingLeft: 8,
    position: 'relative',
  },
  /** Ligne centrée sur la colonne de 32 px (centre à 16 px, ligne 2 px → left 15). */
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 18,
    bottom: 18,
    width: 2,
    backgroundColor: '#E2E8F0',
    borderRadius: 1,
  },
  timelineItem: { flexDirection: 'row', alignItems: 'stretch', marginBottom: 16 },
  /** Colonne alignée sur la ligne : point centré verticalement sur la carte. */
  timelineGutter: {
    width: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginRight: 0,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: CvColors.card,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    zIndex: 1,
  },
  timelineDotFirst: {
    backgroundColor: CvColors.primary,
    borderColor: CvColors.primary,
  },
  expCard: {
    flex: 1,
    backgroundColor: CvColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SLATE_100,
    overflow: 'hidden',
  },
  expCardTop: { flexDirection: 'row', padding: 12, gap: 10, paddingRight: 88 },
  expCardTopRel: { position: 'relative' },
  expLogo: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: CvColors.muted,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expLogoImg: { width: '100%', height: '100%' },
  expCardBody: { flex: 1, minWidth: 0 },
  expTitle: { fontSize: 15, fontWeight: '700', color: CvColors.foreground },
  expMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  expMeta: { fontSize: 13, color: CvColors.mutedForeground, flex: 1 },
  miniCause: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFBEB',
  },
  miniCauseText: { fontSize: 12, fontWeight: '600' },
  certBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  certSigilWrap: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  certBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  declBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: CvColors.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CvColors.border,
  },
  declBadgeText: { fontSize: 10, fontWeight: '700', color: CvColors.mutedForeground },
  expInitials: { fontSize: 14, fontWeight: '800', color: CvColors.mutedForeground },
  typePill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  typePillText: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  bottomSpacer: { height: 24 },
});
