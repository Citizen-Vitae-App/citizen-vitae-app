import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { RegistrationWithEvent } from '@/hooks/useMyMissions';
import { DEFAULT_EVENT_COVER } from '@/lib/defaultEventCover';
import { CvColors } from '@/theme/colors';

type Props = {
  registration: RegistrationWithEvent;
};

function formatCompactDate(iso: string): string {
  const date = parseISO(iso);
  const dayName = format(date, 'EEE', { locale: fr });
  const rest = format(date, 'dd MMM yyyy • HH:mm', { locale: fr });
  return `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}. ${rest}`;
}

export function MissionCancelledCard({ registration }: Props) {
  const navigation = useNavigation();
  const event = registration.events;
  const coverUri = event.cover_image_url || DEFAULT_EVENT_COVER;

  const goEvent = () => {
    navigation.dispatch(CommonActions.navigate({ name: 'EventDetail', params: { eventId: event.id } }));
  };

  return (
    <Pressable style={styles.row} onPress={goEvent} accessibilityRole="button">
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={2}>
          {event.name}
        </Text>
        <Text style={styles.meta}>{formatCompactDate(event.start_date)}</Text>
      </View>
      <View style={styles.thumbWrap}>
        <Image source={{ uri: coverUri }} style={styles.thumb} contentFit="cover" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E4DE',
    backgroundColor: CvColors.card,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '700', color: CvColors.foreground },
  meta: { fontSize: 13, color: CvColors.mutedForeground, marginTop: 6 },
  thumbWrap: {
    width: 96,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  thumb: { width: '100%', height: '100%' },
});
