import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthOrbBackground } from '@/components/layout/AuthOrbBackground';
import { CitizenVitaeLogo } from '@/components/branding/CitizenVitaeLogo';
import { GoogleLogoMark } from '@/components/branding/GoogleLogoMark';
import { useAuth } from '@/contexts/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { AuthStackParamList } from '@/navigation/types';
import { CvColors } from '@/theme/colors';

function formatAuthError(message: string): string {
  if (message.includes('Network request failed')) {
    return 'Connexion impossible au serveur (réseau ou configuration). Vérifie le Wi‑Fi, que mobile/.env contient EXPO_PUBLIC_SUPABASE_URL (https://…) et EXPO_PUBLIC_SUPABASE_ANON_KEY, puis arrête Metro et relance avec : npx expo start -c';
  }
  return message;
}

type Nav = NativeStackNavigationProp<AuthStackParamList, 'AuthHome'>;
type Route = RouteProp<AuthStackParamList, 'AuthHome'>;

type AuthMode = 'login' | 'signup';

export function AuthScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { signInWithOtp, signInWithGoogle, user } = useAuth();
  const redirect = route.params?.redirect;

  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return null;
  }

  const shouldCreateUser = authMode === 'signup';

  const handleEmail = async () => {
    if (!email?.includes('@')) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide.');
      return;
    }
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Configuration Supabase',
        'Supabase : dans mobile/.env, mets EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY, ou exactement les mêmes clés que le web (VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY). Pas de guillemets superflus. Puis npx expo start -c.'
      );
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithOtp(email.trim(), { shouldCreateUser });
      if (error) {
        Alert.alert('Erreur', formatAuthError(error.message));
        return;
      }
      navigation.navigate('VerifyOtp', {
        email: email.trim().toLowerCase(),
        redirect,
        shouldCreateUser,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Configuration Supabase',
        'Supabase : variables manquantes ou invalides dans mobile/.env (EXPO_PUBLIC_* ou VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY comme à la racine).'
      );
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert('Erreur', formatAuthError(error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthOrbBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <CitizenVitaeLogo width={220} height={34} />
              <Text style={styles.tagline}>Engage-toi pour des missions qui comptent</Text>
            </View>

            <View style={styles.segmentWrap}>
              <Pressable
                style={[styles.segmentBtn, authMode === 'login' && styles.segmentBtnActive]}
                onPress={() => setAuthMode('login')}
                accessibilityRole="tab"
                accessibilityState={{ selected: authMode === 'login' }}
              >
                <Text style={[styles.segmentLabel, authMode === 'login' && styles.segmentLabelActive]}>
                  Connexion
                </Text>
              </Pressable>
              <Pressable
                style={[styles.segmentBtn, authMode === 'signup' && styles.segmentBtnActive]}
                onPress={() => setAuthMode('signup')}
                accessibilityRole="tab"
                accessibilityState={{ selected: authMode === 'signup' }}
              >
                <Text style={[styles.segmentLabel, authMode === 'signup' && styles.segmentLabelActive]}>
                  Créer un compte
                </Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {authMode === 'login' ? 'Content de te revoir' : 'Rejoins la communauté'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {authMode === 'login'
                  ? 'Saisis ton e-mail pour recevoir un code de connexion.'
                  : 'Saisis ton e-mail pour recevoir un code et finaliser ton inscription.'}
              </Text>

              <Text nativeID="emailLabel" style={styles.label}>
                E-mail
              </Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="vous@email.com"
                placeholderTextColor={CvColors.mutedForeground}
                accessibilityLabel="Adresse email"
                accessibilityLabelledBy="emailLabel"
              />

              <Pressable
                style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
                onPress={() => void handleEmail()}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={authMode === 'login' ? 'Continuer avec le code e-mail' : "S'inscrire avec le code e-mail"}
              >
                {loading ? (
                  <ActivityIndicator color={CvColors.primaryForeground} />
                ) : (
                  <Text style={styles.buttonPrimaryText}>
                    {authMode === 'login' ? 'Recevoir le code' : 'Recevoir mon code'}
                  </Text>
                )}
              </Pressable>

              <View style={styles.dividerWrap}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OU</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={[styles.buttonGoogle, loading && styles.buttonDisabled]}
                onPress={() => void handleGoogle()}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Se connecter avec Google"
              >
                <GoogleLogoMark size={22} />
                <Text style={styles.buttonGoogleText}>Se connecter avec Google</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthOrbBackground>
  );
}

const SLATE_200 = '#E2E8F0';

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  tagline: {
    marginTop: 14,
    fontSize: 15,
    color: CvColors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: CvColors.muted,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 11,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: CvColors.card,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: CvColors.mutedForeground,
  },
  segmentLabelActive: {
    color: CvColors.foreground,
  },
  card: {
    backgroundColor: CvColors.card,
    borderRadius: 18,
    padding: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CvColors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: CvColors.foreground,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 15,
    color: CvColors.mutedForeground,
    marginBottom: 20,
    lineHeight: 22,
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: CvColors.foreground },
  input: {
    borderWidth: 1,
    borderColor: CvColors.input,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 18,
    color: CvColors.foreground,
    backgroundColor: CvColors.background,
  },
  buttonPrimary: {
    backgroundColor: CvColors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.55 },
  buttonPrimaryText: { color: CvColors.primaryForeground, fontSize: 16, fontWeight: '700' },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: SLATE_200 },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 1,
  },
  buttonGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: SLATE_200,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    minHeight: 56,
    backgroundColor: '#FFFFFF',
  },
  buttonGoogleText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
});
