import { View, Text, Pressable, StyleSheet, Linking, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SettingsSheetHandle, SettingsSubHeader } from '@/components/settings/SettingsChrome';
import type { ProfileSettingsStackParamList } from '@/navigation/types';
import { CvColors } from '@/theme/colors';

type Props = NativeStackScreenProps<ProfileSettingsStackParamList, 'SettingsNotifications'>;

export function SettingsNotificationsScreen({ navigation }: Props) {
  const openSystemSettings = () => {
    void Linking.openSettings();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SettingsSheetHandle />
      <SettingsSubHeader title="Notifications" onBack={() => navigation.goBack()} />
      <View style={styles.body}>
        <Text style={styles.lead}>
          Les notifications push dépendent des réglages système de cet appareil ({Platform.OS === 'ios' ? 'iOS' : 'Android'}
          ).
        </Text>
        <Pressable style={styles.row} onPress={openSystemSettings} accessibilityRole="button">
          <MaterialCommunityIcons name="bell-outline" size={22} color={CvColors.foreground} />
          <Text style={styles.rowLabel}>Ouvrir les réglages système</Text>
          <MaterialCommunityIcons name="chevron-right" size={22} color={CvColors.mutedForeground} />
        </Pressable>
        <Text style={styles.hint}>
          Tu peux aussi consulter l&apos;onglet Notifications dans l&apos;app pour l&apos;historique des messages.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  lead: { fontSize: 14, color: CvColors.mutedForeground, lineHeight: 20, marginBottom: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: CvColors.foreground },
  hint: { fontSize: 13, color: CvColors.mutedForeground, marginTop: 20, lineHeight: 18 },
});
