import { useFonts } from 'expo-font';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Questrial_400Regular } from '@expo-google-fonts/questrial';
import { EBGaramond_700Bold } from '@expo-google-fonts/eb-garamond';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import { usePublicCertificate } from '@/hooks/usePublicCertificate';
import { CertificateFallbackView } from '@/components/certificate/CertificateFallbackView';
import { CvColors } from '@/theme/colors';

type Props = NativeStackScreenProps<AppStackParamList, 'Certificate'>;

export function CertificateScreen({ navigation, route }: Props) {
  const { certificateId } = route.params;

  const [fontsLoaded] = useFonts({
    Questrial_400Regular,
    EBGaramond_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  const { data: payload, isLoading, isError, error, refetch } = usePublicCertificate(certificateId, true);

  if (isLoading || !fontsLoaded) {
    return (
      <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={CvColors.primary} accessibilityLabel="Chargement" />
      </SafeAreaView>
    );
  }

  if (isError || !payload) {
    return (
      <SafeAreaView style={styles.pad} edges={['top', 'bottom']}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={CvColors.foreground} />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={CvColors.destructive} />
          <Text style={styles.errorTitle}>Certificat introuvable</Text>
          <Text style={styles.errorBody}>
            {error instanceof Error ? error.message : 'Impossible de charger ce certificat.'}
          </Text>
          <Pressable style={styles.retry} onPress={() => void refetch()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={CvColors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>Certificat</Text>
        <View style={{ width: 40 }} />
      </View>
      <CertificateFallbackView
        data={payload.data}
        eventId={payload.eventId}
        certificateId={certificateId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  pad: { flex: 1, padding: 20, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: CvColors.foreground },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 24 },
  backText: { fontSize: 16, fontWeight: '600', color: CvColors.foreground },
  errorBox: { alignItems: 'center', paddingTop: 40 },
  errorTitle: { fontSize: 20, fontWeight: '700', marginTop: 16, color: CvColors.foreground },
  errorBody: { fontSize: 15, color: CvColors.mutedForeground, textAlign: 'center', marginTop: 8 },
  retry: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: CvColors.foreground,
    borderRadius: 10,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700' },
});
