import { View, Text, Pressable, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SettingsSheetHandle, SettingsSubHeader } from '@/components/settings/SettingsChrome';
import type { ProfileSettingsStackParamList } from '@/navigation/types';
import { useUserPreferences, type ProfileVisibility } from '@/hooks/useUserPreferences';
import { CvColors } from '@/theme/colors';

type Props = NativeStackScreenProps<ProfileSettingsStackParamList, 'SettingsVisibility'>;

const VIS_OPTIONS: {
  value: ProfileVisibility;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  {
    value: 'connections',
    title: 'Connexions directes',
    description: 'Seuls les membres de vos organisations.',
    icon: 'lock-outline',
  },
  {
    value: 'network',
    title: 'Réseau étendu',
    description: 'Membres de vos organisations et leurs réseaux.',
    icon: 'account-group-outline',
  },
  {
    value: 'public',
    title: 'Public',
    description: 'Tout le monde peut voir votre CV citoyen.',
    icon: 'earth',
  },
];

const SECTION_ROWS: {
  key:
    | 'show_organizations'
    | 'show_causes'
    | 'show_impact'
    | 'show_experiences'
    | 'show_upcoming_events';
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { key: 'show_organizations', label: 'Organisations', icon: 'domain' },
  { key: 'show_causes', label: 'Causes favorites', icon: 'heart-outline' },
  { key: 'show_impact', label: 'Impact citoyen', icon: 'chart-bar' },
  { key: 'show_experiences', label: 'Expériences citoyennes', icon: 'book-open-page-variant' },
  { key: 'show_upcoming_events', label: 'Événements à venir', icon: 'calendar-outline' },
];

export function SettingsVisibilityScreen({ navigation }: Props) {
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();

  if (isLoading || !preferences) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SettingsSheetHandle />
        <SettingsSubHeader title="Visibilité" onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={CvColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const visibility = preferences.profile_visibility ?? 'public';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SettingsSheetHandle />
      <SettingsSubHeader title="Visibilité" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHead}>
          <MaterialCommunityIcons name="eye-outline" size={22} color={CvColors.foreground} />
          <Text style={styles.sectionTitle}>Visibilité du profil</Text>
        </View>
        <Text style={styles.caption}>Qui peut voir votre CV citoyen via le lien public.</Text>

        <View style={styles.radioBlock}>
          {VIS_OPTIONS.map((opt) => {
            const selected = visibility === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.radioCard, selected && styles.radioCardOn]}
                onPress={() => updatePreferences({ profile_visibility: opt.value })}
                disabled={isUpdating}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <View style={[styles.radioOuter, selected && styles.radioOuterOn]}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
                <MaterialCommunityIcons name={opt.icon} size={22} color={CvColors.foreground} />
                <View style={styles.radioTextCol}>
                  <Text style={styles.radioTitle}>{opt.title}</Text>
                  <Text style={styles.radioDesc}>{opt.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.sectionsLabel}>Sections visibles</Text>

        <View style={styles.togglesCard}>
          {SECTION_ROWS.map((row, index) => (
            <View
              key={row.key}
              style={[styles.toggleRow, index === SECTION_ROWS.length - 1 && styles.toggleRowLast]}
            >
              <MaterialCommunityIcons name={row.icon} size={22} color={CvColors.foreground} />
              <Text style={styles.toggleLabel}>{row.label}</Text>
              <Switch
                value={preferences[row.key] !== false}
                onValueChange={(v) => updatePreferences({ [row.key]: v })}
                disabled={isUpdating}
                trackColor={{ false: '#E5E7EB', true: '#171717' }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E7EB"
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: CvColors.foreground },
  caption: { fontSize: 13, color: CvColors.mutedForeground, marginTop: 6, marginBottom: 16 },
  radioBlock: { gap: 10 },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  radioCardOn: { borderColor: CvColors.foreground, backgroundColor: '#FAFAFA' },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterOn: { borderColor: CvColors.foreground },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: CvColors.foreground },
  radioTextCol: { flex: 1, minWidth: 0 },
  radioTitle: { fontSize: 15, fontWeight: '700', color: CvColors.foreground },
  radioDesc: { fontSize: 13, color: CvColors.mutedForeground, marginTop: 4, lineHeight: 18 },
  sectionsLabel: { fontSize: 17, fontWeight: '700', color: CvColors.foreground, marginTop: 28, marginBottom: 12 },
  togglesCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  toggleRowLast: { borderBottomWidth: 0 },
  toggleLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: CvColors.foreground },
});
