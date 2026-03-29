import { useState } from 'react';
import { View, Pressable, StyleSheet, Modal, Platform, StatusBar } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getGoogleMapsApiKey } from '@/lib/googleMapsConfig';

type Props = {
  latitude: number;
  longitude: number;
};

function buildRegion(lat: number, lng: number) {
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  };
}

export function EventMapBlock({ latitude, longitude }: Props) {
  const insets = useSafeAreaInsets();
  const [fullscreen, setFullscreen] = useState(false);
  const hasKey = getGoogleMapsApiKey().length > 0;
  const provider = Platform.OS === 'android' || hasKey ? PROVIDER_GOOGLE : undefined;
  const region = buildRegion(latitude, longitude);

  const mapNode = (
    <MapView
      style={styles.mapFill}
      provider={provider}
      initialRegion={region}
      zoomEnabled
      scrollEnabled
      rotateEnabled
      pitchEnabled={false}
      showsUserLocation={false}
      mapType="standard"
    >
      <Marker coordinate={{ latitude, longitude }} />
    </MapView>
  );

  return (
    <>
      <View style={styles.previewShell}>
        {mapNode}
        <Pressable
          style={styles.expandFab}
          onPress={() => setFullscreen(true)}
          accessibilityRole="button"
          accessibilityLabel="Agrandir la carte"
        >
          <MaterialCommunityIcons name="fullscreen" size={22} color="#111827" />
        </Pressable>
      </View>

      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <StatusBar barStyle="light-content" />
        <View style={styles.modalRoot}>
          <MapView
            style={styles.mapFlex}
            provider={provider}
            initialRegion={region}
            zoomEnabled
            scrollEnabled
            rotateEnabled
            pitchEnabled
            showsUserLocation={false}
            mapType="standard"
          >
            <Marker coordinate={{ latitude, longitude }} />
          </MapView>
          <Pressable
            style={[styles.closeFab, { top: insets.top + 8 }]}
            onPress={() => setFullscreen(false)}
            accessibilityRole="button"
            accessibilityLabel="Fermer la carte"
          >
            <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const PREVIEW_H = 220;

const styles = StyleSheet.create({
  previewShell: {
    height: PREVIEW_H,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  mapFill: { ...StyleSheet.absoluteFillObject },
  expandFab: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  modalRoot: { flex: 1, backgroundColor: '#000' },
  mapFlex: { flex: 1 },
  closeFab: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
