import { View, Text, Pressable, StyleSheet, Alert, Switch } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationPreference } from '@/contexts/LocationPreferenceContext';
import { CvColors } from '@/theme/colors';

export function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const { locationSharingEnabled, setLocationSharingEnabled, ready: locationPrefReady } =
    useLocationPreference();

  const onSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Déconnexion impossible');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.pad}>
        <Text style={styles.screenTitle}>Profil</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account-circle" size={48} color={CvColors.mutedForeground} />
          </View>

          <Text style={styles.label}>E-mail</Text>
          <Text style={styles.value}>{user?.email ?? '—'}</Text>

          {profile?.first_name || profile?.last_name ? (
            <>
              <Text style={[styles.label, styles.mt]}>Nom</Text>
              <Text style={styles.value}>
                {[profile.first_name, profile.last_name].filter(Boolean).join(' ')}
              </Text>
            </>
          ) : null}
        </View>

        <View style={styles.prefsCard}>
          <Text style={styles.prefsTitle}>Confidentialité</Text>
          <View style={styles.switchRow}>
            <View style={styles.switchTextCol}>
              <Text style={styles.switchLabel}>Localisation pour la certification</Text>
              <Text style={styles.switchHint}>
                Sert à vérifier que tu es sur le lieu au moment de certifier ta présence. Réglage
                enregistré sur cet appareil uniquement.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Autoriser la localisation pour la certification"
              value={locationSharingEnabled}
              onValueChange={(v) => void setLocationSharingEnabled(v)}
              disabled={!locationPrefReady}
              trackColor={{ false: CvColors.muted, true: '#BBF7D0' }}
              thumbColor={locationSharingEnabled ? '#15803D' : '#F1F5F9'}
              ios_backgroundColor={CvColors.muted}
            />
          </View>
        </View>

        <Pressable
          style={styles.button}
          onPress={() => void onSignOut()}
          accessibilityRole="button"
          accessibilityLabel="Se déconnecter"
        >
          <Text style={styles.buttonText}>Se déconnecter</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: CvColors.background },
  pad: { padding: 20 },
  screenTitle: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: CvColors.foreground },
  card: {
    backgroundColor: CvColors.card,
    borderRadius: 16,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CvColors.border,
    marginBottom: 24,
  },
  avatar: { alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 13, color: CvColors.mutedForeground, fontWeight: '600' },
  mt: { marginTop: 16 },
  value: { fontSize: 16, marginTop: 4, color: CvColors.foreground },
  prefsCard: {
    backgroundColor: CvColors.card,
    borderRadius: 16,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CvColors.border,
    marginBottom: 24,
  },
  prefsTitle: { fontSize: 16, fontWeight: '700', color: CvColors.foreground, marginBottom: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchTextCol: { flex: 1, paddingRight: 12 },
  switchLabel: { fontSize: 15, fontWeight: '600', color: CvColors.foreground },
  switchHint: { fontSize: 13, color: CvColors.mutedForeground, marginTop: 6, lineHeight: 18 },
  button: {
    backgroundColor: CvColors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: { color: CvColors.primaryForeground, fontSize: 16, fontWeight: '600' },
});
