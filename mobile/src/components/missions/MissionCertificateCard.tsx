import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RegistrationWithEvent } from '@/hooks/useMyMissions';
import { buildWebAppPath } from '@/lib/webAppUrl';
import { useOrganizationSheet } from '@/contexts/OrganizationSheetContext';
import { shareWebLink } from '@/lib/shareWebLink';
import { DEFAULT_EVENT_COVER } from '@/lib/defaultEventCover';
import { CvColors } from '@/theme/colors';

const BADGE_GREEN = '#27AE60';

type Props = {
  registration: RegistrationWithEvent;
};

export function MissionCertificateCard({ registration }: Props) {
  const navigation = useNavigation();
  const { openOrganization } = useOrganizationSheet();
  const event = registration.events;
  const organization = event.organizations;
  const hasCertificateData = registration.certificate_data !== null;
  const canViewOrShare = hasCertificateData || !!registration.certificate_id;
  const isSelfCertified = registration.status === 'self_certified' || !registration.validated_by;

  const startParsed = parseISO(event.start_date);
  const endParsed = parseISO(event.end_date);
  const dateRaw = format(startParsed, 'EEEE d MMMM yyyy', { locale: fr });
  const dateDisplay = dateRaw.charAt(0).toUpperCase() + dateRaw.slice(1);
  const timeDisplay = `${format(startParsed, "HH'h'mm", { locale: fr })} - ${format(endParsed, "HH'h'mm", { locale: fr })}`;

  const openCertificate = () => {
    if (registration.certificate_id) {
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Certificate',
          params: { certificateId: registration.certificate_id },
        })
      );
      return;
    }
    if (hasCertificateData) {
      navigation.dispatch(CommonActions.navigate({ name: 'EventDetail', params: { eventId: event.id } }));
      return;
    }
    Alert.alert('Indisponible', 'Certificat non disponible pour le moment.');
  };

  const onShare = async () => {
    const url =
      registration.certificate_id != null
        ? buildWebAppPath(`/certificate/${registration.certificate_id}`)
        : buildWebAppPath(`/events/${event.id}`);
    if (!url) {
      Alert.alert('Partage indisponible', 'Configure EXPO_PUBLIC_WEB_APP_ORIGIN pour partager un lien.');
      return;
    }
    await shareWebLink(url, { title: event.name });
  };

  const openEvent = () => {
    navigation.dispatch(CommonActions.navigate({ name: 'EventDetail', params: { eventId: event.id } }));
  };

  const coverUri = event.cover_image_url || DEFAULT_EVENT_COVER;

  return (
    <View style={styles.card}>
      <View style={styles.heroWrap}>
        <Image source={{ uri: coverUri }} style={styles.heroImg} contentFit="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.badgeTopRight}>
          <View style={[styles.badge, isSelfCertified ? styles.badgeSelf : styles.badgeOrg]}>
            <MaterialCommunityIcons
              name={isSelfCertified ? 'shield-check' : 'check-decagram'}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.badgeText}>{isSelfCertified ? 'Auto-certifié' : 'Certifié'}</Text>
          </View>
        </View>

        <Pressable
          style={styles.orgRow}
          onPress={() => openOrganization(event.organization_id)}
          accessibilityRole="button"
          accessibilityLabel={`Organisation ${organization.name}`}
        >
          <View style={styles.orgAvatar}>
            {organization.logo_url ? (
              <Image source={{ uri: organization.logo_url }} style={styles.orgAvatarImg} contentFit="cover" />
            ) : (
              <Text style={styles.orgAvatarFallback}>{organization.name.charAt(0).toUpperCase()}</Text>
            )}
          </View>
          <Text style={styles.orgName} numberOfLines={1}>
            {organization.name}
          </Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Pressable onPress={openEvent}>
          <Text style={styles.title} numberOfLines={2}>
            {event.name}
          </Text>
        </Pressable>

        <View style={styles.metaBlock}>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={META_ICON} />
            <Text style={styles.metaText} numberOfLines={2}>
              {dateDisplay}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={META_ICON} />
            <Text style={styles.metaText}>{timeDisplay}</Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={18} color={META_ICON} />
            <Text style={styles.metaText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryBtn, !canViewOrShare && styles.btnDisabled]}
            onPress={openCertificate}
            disabled={!canViewOrShare}
            accessibilityRole="button"
            accessibilityLabel="Voir le certificat"
          >
            <MaterialCommunityIcons name="file-document-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Voir le certificat</Text>
          </Pressable>
          <Pressable
            style={[styles.shareBtn, !canViewOrShare && styles.btnDisabled]}
            onPress={() => void onShare()}
            disabled={!canViewOrShare}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Partager"
          >
            <MaterialCommunityIcons name="share-variant" size={22} color={CvColors.foreground} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const META_ICON = '#64748B';

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: CvColors.card,
    borderWidth: 1,
    borderColor: '#E8E4DE',
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroWrap: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  heroImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  badgeTopRight: { position: 'absolute', top: 12, right: 12, zIndex: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeSelf: { backgroundColor: BADGE_GREEN },
  badgeOrg: { backgroundColor: CvColors.foreground },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  orgRow: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 2,
  },
  orgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgAvatarImg: { width: '100%', height: '100%' },
  orgAvatarFallback: { fontSize: 14, fontWeight: '800', color: CvColors.foreground },
  orgName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  body: { padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: CvColors.foreground, lineHeight: 24 },
  metaBlock: { gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  metaText: { flex: 1, fontSize: 14, color: META_ICON, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#000000',
    borderRadius: 999,
    paddingVertical: 14,
    minHeight: 48,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  shareBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  btnDisabled: { opacity: 0.45 },
});
