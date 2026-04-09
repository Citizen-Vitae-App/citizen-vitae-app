import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { buildWebAppPath } from '@/lib/webAppUrl';
import { CvColors } from '@/theme/colors';
import { CitizenVitaeSigil } from '@/components/branding/CitizenVitaeSigil';

const QR_SIZE = 200;
const LOGO_INNER = 40;

type Props = {
  qrToken: string;
  registrationId: string;
  eventName: string;
  eventDateLabel: string;
  scanPhase?: 'waiting_first_scan' | 'first_scan_done';
};

/**
 * QR affiché au participant pour scan par l’organisateur (même URL que le web).
 */
export function CertificationQrPanel({
  qrToken,
  registrationId,
  eventName,
  eventDateLabel,
  scanPhase = 'waiting_first_scan',
}: Props) {
  const verificationPath = `/verify/${registrationId}?token=${encodeURIComponent(qrToken)}`;
  const verificationUrl = buildWebAppPath(verificationPath);
  const displayUrl = verificationUrl ?? verificationPath;
  const tokenPreview = `${qrToken.slice(0, 8)}…${qrToken.slice(-6)}`;

  return (
    <View style={styles.scrollContent}>
      {scanPhase === 'waiting_first_scan' ? (
        <View style={styles.statusRow}>
          <MaterialCommunityIcons name="check-decagram" size={22} color="#16A34A" />
          <Text style={styles.statusText}>Face match validé</Text>
        </View>
      ) : (
        <Text style={styles.hintSmall}>En attente du scan de départ</Text>
      )}

      <View style={[styles.qrBox, scanPhase === 'first_scan_done' && styles.qrBoxBlue]}>
        <View style={styles.qrWithLogo}>
          <QRCode value={displayUrl} size={QR_SIZE} ecl="H" />
          <View style={styles.qrLogoOverlay} pointerEvents="none">
            <View style={styles.qrLogoPad}>
              <CitizenVitaeSigil size={LOGO_INNER} />
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.tokenLine}>
        Token : <Text style={styles.tokenMono}>{tokenPreview}</Text>
      </Text>

      <Text style={styles.instr}>
        {scanPhase === 'waiting_first_scan'
          ? 'Présente ce QR code à l’organisateur pour valider ton arrivée (1er scan).'
          : 'Présente à nouveau ce code à l’organisateur pour ton départ.'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.eventName} numberOfLines={2}>
          {eventName}
        </Text>
        <Text style={styles.eventDate}>{eventDateLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { alignItems: 'center', paddingBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statusText: { fontSize: 16, fontWeight: '600', color: '#16A34A' },
  hintSmall: { fontSize: 12, color: '#2563EB', marginBottom: 12 },
  qrBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  qrWithLogo: {
    width: QR_SIZE,
    height: QR_SIZE,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLogoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLogoPad: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  qrBoxBlue: { borderColor: '#BFDBFE' },
  tokenLine: { fontSize: 11, color: CvColors.mutedForeground, marginBottom: 12 },
  tokenMono: { fontFamily: 'monospace', color: CvColors.foreground },
  instr: {
    fontSize: 14,
    color: CvColors.mutedForeground,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
    lineHeight: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  eventName: { fontSize: 14, fontWeight: '600', color: CvColors.foreground, textAlign: 'center' },
  eventDate: { fontSize: 12, color: CvColors.mutedForeground, marginTop: 6 },
});
