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
import { MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthOrbBackground } from '@/components/layout/AuthOrbBackground';
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

export function AuthScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { signInWithOtp, signInWithGoogle, user } = useAuth();
  const redirect = route.params?.redirect;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return null;
  }

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
      const { error } = await signInWithOtp(email.trim());
      if (error) {
        Alert.alert('Erreur', formatAuthError(error.message));
        return;
      }
      navigation.navigate('VerifyOtp', {
        email: email.trim().toLowerCase(),
        redirect,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Configuration Supabase',
        'Supabase : variables manquantes ou invalides dans mobile/.env (EXPO_PUBLIC_* ou VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY comme à la racine). Voir aussi le message configuration email.'
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
            <View style={styles.card}>
              <View style={styles.iconCircle} accessibilityElementsHidden>
                <MaterialCommunityIcons name="login" size={26} color={CvColors.mutedForeground} />
              </View>

              <Text style={styles.title}>Bienvenue sur CitizenVitae</Text>
              <Text style={styles.subtitle}>Veuillez vous connecter ou vous inscrire ci-dessous.</Text>

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
                accessibilityLabel="Continuer avec l'e-mail"
              >
                {loading ? (
                  <ActivityIndicator color={CvColors.primaryForeground} />
                ) : (
                  <Text style={styles.buttonPrimaryText}>Continuer avec l&apos;e-mail</Text>
                )}
              </Pressable>

              <View style={styles.dividerWrap}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <Pressable
                style={[styles.buttonOutline, loading && styles.buttonDisabled]}
                onPress={() => void handleGoogle()}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Se connecter avec Google"
              >
                <FontAwesome name="google" size={20} color={CvColors.foreground} style={styles.googleIcon} />
                <Text style={styles.buttonOutlineText}>Se connecter avec Google</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AuthOrbBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
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
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: CvColors.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: CvColors.mutedForeground,
    marginBottom: 24,
    lineHeight: 22,
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: CvColors.foreground },
  input: {
    borderWidth: 1,
    borderColor: CvColors.input,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    color: CvColors.foreground,
    backgroundColor: CvColors.card,
  },
  buttonPrimary: {
    backgroundColor: CvColors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.55 },
  buttonPrimaryText: { color: CvColors.primaryForeground, fontSize: 16, fontWeight: '600' },
  dividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: CvColors.border },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '600',
    color: CvColors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  buttonOutline: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: CvColors.border,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    backgroundColor: CvColors.card,
  },
  googleIcon: { marginRight: 10 },
  buttonOutlineText: { color: CvColors.foreground, fontSize: 16, fontWeight: '600' },
});
