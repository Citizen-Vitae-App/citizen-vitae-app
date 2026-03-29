import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthOrbBackground } from '@/components/layout/AuthOrbBackground';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthStackParamList } from '@/navigation/types';
import { CvColors } from '@/theme/colors';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'VerifyOtp'>;
type R = RouteProp<AuthStackParamList, 'VerifyOtp'>;

export function VerifyOtpScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { email, redirect: _redirect } = route.params;
  const { verifyOtp, signInWithOtp } = useAuth();

  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (!email) {
      navigation.replace('AuthHome');
    }
  }, [email, navigation]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    setCanResend(true);
  }, [countdown]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Erreur', 'Entre le code à 6 chiffres.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await verifyOtp(email, otp);
      if (error) {
        Alert.alert('Code invalide', error.message);
        setOtp('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(60);
    const { error } = await signInWithOtp(email);
    if (error) {
      Alert.alert('Erreur', error.message);
      setCanResend(true);
    } else {
      Alert.alert('Envoyé', 'Un nouveau code a été envoyé.');
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
              <Text style={styles.title}>Code de vérification</Text>
              <Text style={styles.subtitle}>Saisis le code reçu par email pour {email}</Text>

              <Text nativeID="otpLabel" style={styles.label}>
                Code à 6 chiffres
              </Text>
              <TextInput
                style={styles.input}
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor={CvColors.mutedForeground}
                accessibilityLabel="Code à six chiffres"
                accessibilityLabelledBy="otpLabel"
              />

              <Pressable
                style={[styles.buttonPrimary, submitting && styles.disabled]}
                onPress={() => void handleVerify()}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Vérifier le code"
              >
                {submitting ? (
                  <ActivityIndicator color={CvColors.primaryForeground} />
                ) : (
                  <Text style={styles.buttonPrimaryText}>Vérifier</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => void handleResend()}
                disabled={!canResend}
                accessibilityRole="button"
                accessibilityLabel="Renvoyer le code"
              >
                <Text style={[styles.link, !canResend && styles.linkDisabled]}>
                  {canResend ? 'Renvoyer le code' : `Renvoyer dans ${countdown}s`}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel="Retour"
              >
                <Text style={styles.back}>Retour</Text>
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
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: CvColors.foreground },
  subtitle: { fontSize: 15, color: CvColors.mutedForeground, marginBottom: 24, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: CvColors.foreground },
  input: {
    borderWidth: 1,
    borderColor: CvColors.input,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 22,
    letterSpacing: 4,
    marginBottom: 20,
    textAlign: 'center',
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
  disabled: { opacity: 0.55 },
  buttonPrimaryText: { color: CvColors.primaryForeground, fontSize: 16, fontWeight: '600' },
  link: { marginTop: 20, textAlign: 'center', color: CvColors.ring, fontSize: 15, fontWeight: '600' },
  linkDisabled: { color: CvColors.mutedForeground, fontWeight: '400' },
  back: { marginTop: 24, textAlign: 'center', color: CvColors.mutedForeground, fontSize: 15 },
});
