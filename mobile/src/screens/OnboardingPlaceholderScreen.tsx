import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthOrbBackground } from '@/components/layout/AuthOrbBackground';
import { useAuth } from '@/contexts/AuthContext';
import { CvColors } from '@/theme/colors';

export function OnboardingPlaceholderScreen() {
  const { signOut } = useAuth();

  const onSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Déconnexion impossible');
    }
  };

  return (
    <AuthOrbBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="account-check-outline" size={28} color={CvColors.mutedForeground} />
            </View>
            <Text style={styles.title}>Bienvenue</Text>
            <Text style={styles.body}>
              Termine ton onboarding depuis l&apos;application web Citizen Vitae pour accéder à toutes les
              fonctionnalités. Cette version mobile affichera bientôt le même parcours.
            </Text>
            <Pressable
              style={styles.button}
              onPress={() => void onSignOut()}
              accessibilityRole="button"
              accessibilityLabel="Se déconnecter"
            >
              <Text style={styles.buttonText}>Se déconnecter</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </AuthOrbBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  card: {
    backgroundColor: CvColors.card,
    borderRadius: 16,
    padding: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CvColors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CvColors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12, color: CvColors.foreground },
  body: { fontSize: 16, color: CvColors.mutedForeground, lineHeight: 24, marginBottom: 28 },
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
