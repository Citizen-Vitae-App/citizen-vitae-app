import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { PublicEventRow } from '@/hooks/usePublicEvents';
import type { AppStackParamList } from '@/navigation/types';
import { generateShortTitle } from '@/lib/generateShortTitle';
import { formatEventStartDate } from '@/lib/formatEventDate';
import { useOrganizationSheet } from '@/contexts/OrganizationSheetContext';

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&auto=format&fit=crop';

const META = '#6B7280';
const RADIUS = 16;
const IMG_H = 216;

function overlayLines(shortTitle: string): string[] {
  const words = shortTitle.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return [words.join(' ') || ''];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

type Props = {
  event: PublicEventRow;
};

export function EventListCard({ event }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { openOrganization } = useOrganizationSheet();
  const uri = event.cover_image_url?.trim() || DEFAULT_COVER;
  const short = generateShortTitle(event.name);
  const lines = overlayLines(short.toUpperCase());
  const orgName = event.organization_name?.trim() || 'Organisation';
  const dateLabel = formatEventStartDate(event.start_date);

  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [pressed && styles.cardPressed]}
        onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
        accessibilityRole="button"
        accessibilityLabel={`Événement ${event.name}`}
      >
        <View style={styles.imageWrap}>
          <Image source={{ uri }} style={styles.image} contentFit="cover" transition={200} />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.65)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.overlayTextBlock}>
            {lines.map((line, i) => (
              <Text key={i} style={styles.overlayLine} numberOfLines={1}>
                {line}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.address} numberOfLines={2}>
            {event.location}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {event.name}
          </Text>
          <Text style={styles.dateMeta}>{dateLabel}</Text>
        </View>
      </Pressable>

      <View style={styles.orgRow}>
        <Text style={styles.orgPrefix}>Organisé par </Text>
        <Pressable
          onPress={() => openOrganization(event.organization_id)}
          accessibilityRole="button"
          accessibilityLabel={`Organisation ${orgName}`}
        >
          <Text style={styles.orgLink}>{orgName}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: RADIUS,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardPressed: { opacity: 0.96 },
  imageWrap: {
    height: IMG_H,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  image: { width: '100%', height: '100%' },
  overlayTextBlock: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
  },
  overlayLine: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  body: { paddingHorizontal: 4, paddingTop: 16, paddingBottom: 4 },
  address: { fontSize: 14, color: META, lineHeight: 20 },
  title: { marginTop: 8, fontSize: 18, fontWeight: '700', color: '#000000', lineHeight: 24 },
  dateMeta: { marginTop: 6, fontSize: 14, color: META },
  orgRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 10,
    paddingBottom: 16,
  },
  orgPrefix: { fontSize: 14, color: META },
  orgLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textDecorationLine: 'underline',
  },
});
