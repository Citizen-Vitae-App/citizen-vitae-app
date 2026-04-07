import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { CertificateData } from '@/types/certificate';
import { buildWebAppPath } from '@/lib/webAppUrl';
import { shareWebLink } from '@/lib/shareWebLink';
import { shareCertificatePdf } from '@/lib/certificatePdf';
import { CertificatePreviewNative } from '@/components/certificate/CertificatePreviewNative';
import { CvColors } from '@/theme/colors';

type Props = {
  data: CertificateData;
  eventId: string | null;
  certificateId: string;
};

/**
 * Certificat natif (SVG), export PDF / image, partage du lien web.
 */
export function CertificateFallbackView({ data, eventId, certificateId }: Props) {
  const navigation = useNavigation();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const captureRefView = useRef<View>(null);

  const publicUrl = buildWebAppPath(`/certificate/${certificateId}`);

  const shareCertificateLink = async () => {
    if (publicUrl) {
      await shareWebLink(publicUrl, { title: 'Certificat Citizen Vitae' });
      return;
    }
    try {
      const fallback = `Certificat Citizen Vitae — ID : ${certificateId}`;
      await Clipboard.setStringAsync(fallback);
      Alert.alert(
        'Lien web non configuré',
        'Ajoute EXPO_PUBLIC_WEB_APP_ORIGIN dans .env pour partager l’URL de la page certificat. L’identifiant a été copié dans le presse-papiers.'
      );
    } catch {
      /* ignore */
    }
  };

  const onPdf = async () => {
    setPdfBusy(true);
    try {
      await shareCertificatePdf(data, certificateId);
    } finally {
      setPdfBusy(false);
    }
  };

  const saveImageWithFormat = async (format: 'png' | 'jpg') => {
    setImageBusy(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission requise',
          'Autorise l’accès à la photothèque pour enregistrer l’image du certificat.'
        );
        return;
      }
      const uri = await captureRef(captureRefView, {
        format: format === 'jpg' ? 'jpg' : 'png',
        quality: format === 'jpg' ? 0.92 : 1,
        result: 'tmpfile',
      });
      await MediaLibrary.saveToLibraryAsync(uri);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erreur inconnue';
      Alert.alert('Image', `Impossible d’enregistrer l’image : ${message}`);
    } finally {
      setImageBusy(false);
    }
  };

  const onSaveImage = () => {
    Alert.alert('Format d’image', 'Choisis comment enregistrer le certificat dans Photos.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'PNG (qualité max.)',
        onPress: () => void saveImageWithFormat('png'),
      },
      {
        text: 'JPEG (fichier plus léger)',
        onPress: () => void saveImageWithFormat('jpg'),
      },
    ]);
  };

  const openEvent = () => {
    if (!eventId) return;
    navigation.dispatch(CommonActions.navigate({ name: 'EventDetail', params: { eventId } }));
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <View ref={captureRefView} collapsable={false} style={styles.captureWrap}>
        <CertificatePreviewNative data={data} />
      </View>

      <Pressable
        style={[styles.btnBlack, pdfBusy && styles.btnDisabled]}
        onPress={() => void onPdf()}
        accessibilityRole="button"
        disabled={pdfBusy}
      >
        {pdfBusy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <MaterialCommunityIcons name="download" size={22} color="#FFFFFF" />
            <Text style={styles.btnBlackText}>Exporter en PDF</Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={[styles.btnOutline, imageBusy && styles.btnDisabled]}
        onPress={onSaveImage}
        accessibilityRole="button"
        disabled={imageBusy}
      >
        {imageBusy ? (
          <ActivityIndicator color={CvColors.foreground} />
        ) : (
          <>
            <MaterialCommunityIcons name="image-outline" size={22} color={CvColors.foreground} />
            <Text style={styles.btnOutlineText}>Enregistrer dans Photos</Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={styles.btnGray}
        onPress={() => void shareCertificateLink()}
        accessibilityRole="button"
        accessibilityLabel="Partager le certificat"
      >
        <MaterialCommunityIcons name="share-variant" size={24} color={CvColors.foreground} />
        <Text style={styles.btnGrayText}>Partager le certificat</Text>
      </Pressable>

      {eventId ? (
        <Pressable onPress={openEvent} style={styles.linkWrap}>
          <Text style={styles.link}>Voir les détails de l&apos;événement</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  captureWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  btnBlack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 12,
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.7 },
  btnBlackText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 16,
    marginBottom: 12,
    minHeight: 52,
  },
  btnOutlineText: { color: CvColors.foreground, fontSize: 16, fontWeight: '600' },
  btnGray: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 16,
    minHeight: 52,
    marginBottom: 20,
  },
  btnGrayText: { color: CvColors.foreground, fontSize: 16, fontWeight: '600' },
  linkWrap: { alignItems: 'center', marginTop: 4 },
  link: {
    fontSize: 14,
    color: CvColors.foreground,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});
