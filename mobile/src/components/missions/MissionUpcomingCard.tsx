import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RegistrationWithEvent } from '@/hooks/useMyMissions';
import { DEFAULT_EVENT_COVER } from '@/lib/defaultEventCover';
import { CvColors } from '@/theme/colors';

type Props = {
  registration: RegistrationWithEvent;
};

function formatUpcomingLine(iso: string): string {
  const date = parseISO(iso);
  const dayName = format(date, 'EEE', { locale: fr });
  const dayMonth = format(date, 'dd MMM', { locale: fr });
  const time = format(date, 'HH:mm', { locale: fr });
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}. ${dayMonth}. • ${time}`;
}

export function MissionUpcomingCard({ registration }: Props) {
  const navigation = useNavigation();
  const event = registration.events;
  const coverUri = event.cover_image_url || DEFAULT_EVENT_COVER;

  const goEvent = () => {
    navigation.dispatch(CommonActions.navigate({ name: 'EventDetail', params: { eventId: event.id } }));
  };

  return (
    <Pressable style={styles.card} onPress={goEvent} accessibilityRole="button">
      <View style={styles.imageWrap}>
        <Image source={{ uri: coverUri }} style={styles.image} contentFit="cover" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {event.name}
        </Text>
        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={16} color={CvColors.mutedForeground} />
          <Text style={styles.dateText}>{formatUpcomingLine(event.start_date)}</Text>
        </View>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Certifier ma présence</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E4DE',
    backgroundColor: CvColors.card,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  imageWrap: { aspectRatio: 16 / 9, width: '100%', backgroundColor: '#E5E7EB' },
  image: { width: '100%', height: '100%' },
  body: { padding: 16, gap: 12 },
  title: { fontSize: 17, fontWeight: '700', color: CvColors.foreground },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 14, color: CvColors.mutedForeground, flex: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#000000',
    borderRadius: 999,
    paddingVertical: 12,
    marginTop: 4,
  },
  ctaText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
