import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  cacheDirectory,
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
} from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';
import type { CertificateData } from '@/types/certificate';
import { buildCertificatePdfHtml } from '@/lib/certificatePdfHtml';

const PDF_W = 1120;
const PDF_H = 630;

function safeFileSegment(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Génère un PDF puis ouvre la feuille de partage avec un nom de fichier lisible
 * (sur iOS : « Enregistrer dans Fichiers », AirDrop, etc.).
 */
export async function shareCertificatePdf(data: CertificateData, certificateId: string): Promise<void> {
  try {
    const html = buildCertificatePdfHtml(data);
    const { uri: tmpUri } = await Print.printToFileAsync({
      html,
      width: PDF_W,
      height: PDF_H,
    });

    const fileName = `Certificat-CitizenVitae-${safeFileSegment(certificateId)}.pdf`;
    const base = cacheDirectory ?? documentDirectory;
    if (!base) {
      await Sharing.shareAsync(tmpUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Certificat Citizen Vitae',
        ...(Platform.OS === 'ios' ? { UTI: 'com.adobe.pdf' } : {}),
      });
      return;
    }

    const destUri = `${base}${fileName}`;
    const info = await getInfoAsync(destUri);
    if (info.exists) {
      await deleteAsync(destUri, { idempotent: true });
    }
    await copyAsync({ from: tmpUri, to: destUri });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert('Partage indisponible', 'Le partage de fichiers n’est pas disponible sur cet appareil.');
      return;
    }
    await Sharing.shareAsync(destUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Enregistrer ou partager le PDF',
      ...(Platform.OS === 'ios' ? { UTI: 'com.adobe.pdf' } : {}),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    Alert.alert('PDF', `Impossible de générer le PDF : ${message}`);
  }
}
