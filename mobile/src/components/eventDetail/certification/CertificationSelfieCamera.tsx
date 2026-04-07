import { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CvColors } from '@/theme/colors';

type Props = {
  onCapture: (imageBase64DataUrl: string) => void;
  onCancel: () => void;
};

/**
 * Selfie frontal pour le face-match Didit (même payload que le web : data URL JPEG).
 */
export function CertificationSelfieCamera({ onCapture, onCancel }: Props) {
  const { width } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);

  const previewW = Math.min(width - 48, 360);
  const previewH = (previewW * 4) / 3;

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.85,
      });
      if (photo.base64) {
        onCapture(`data:image/jpeg;base64,${photo.base64}`);
      }
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={CvColors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.pad}>
        <MaterialCommunityIcons name="camera-outline" size={48} color={CvColors.mutedForeground} />
        <Text style={styles.explain}>Autorise l’accès à la caméra pour la vérification.</Text>
        <Pressable style={styles.primaryBtn} onPress={() => void requestPermission()}>
          <Text style={styles.primaryBtnText}>Autoriser</Text>
        </Pressable>
        <Pressable onPress={onCancel} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Annuler</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Prends un selfie</Text>
      <Text style={styles.sub}>Place ton visage au centre, avec un bon éclairage.</Text>
      <View style={[styles.camOuter, { width: previewW, height: previewH }]}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mirror
          onCameraReady={() => setCameraReady(true)}
        />
        {!cameraReady ? (
          <View style={styles.camLoading}>
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        ) : null}
        <View style={styles.faceGuide} pointerEvents="none">
          <View style={styles.faceGuideInner} />
        </View>
      </View>
      <Pressable
        style={[styles.primaryBtn, (!cameraReady || busy) && styles.btnDisabled]}
        onPress={() => void takePicture()}
        disabled={!cameraReady || busy}
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <MaterialCommunityIcons name="camera" size={22} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>Capturer</Text>
          </>
        )}
      </Pressable>
      <Pressable onPress={onCancel} style={styles.secondaryBtn}>
        <Text style={styles.secondaryText}>Annuler</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
  centered: { padding: 24, alignItems: 'center' },
  pad: { padding: 24, alignItems: 'center', gap: 16 },
  title: { fontSize: 18, fontWeight: '700', color: CvColors.foreground, marginBottom: 8 },
  sub: {
    fontSize: 14,
    color: CvColors.mutedForeground,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  explain: { fontSize: 15, color: CvColors.mutedForeground, textAlign: 'center' },
  camOuter: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginBottom: 20,
  },
  camLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  faceGuide: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuideInner: {
    width: '72%',
    aspectRatio: 3 / 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: 999,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#012573',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 200,
    minHeight: 52,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { marginTop: 12, padding: 12 },
  secondaryText: { color: CvColors.mutedForeground, fontSize: 16, fontWeight: '600' },
});
