import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCertificationEligibility } from '@/hooks/useCertificationEligibility';
import { useLocationPreference } from '@/contexts/LocationPreferenceContext';
import { useMobileGeolocation } from '@/hooks/useMobileGeolocation';

type Props = {
  eventStartDate: string;
  eventEndDate: string;
  /** Coordonnées du lieu (événement ou géocodage de l’adresse). */
  eventLatitude: number | null;
  eventLongitude: number | null;
  /** True tant que le géocodage peut encore fournir des coordonnées. */
  isVenueCoordsLoading?: boolean;
  /** Désactive le bouton actif (déjà certifié / présence enregistrée) */
  certifyDisabled?: boolean;
  onCertifyPress: () => void;
};

export function CertifyPresenceButton({
  eventStartDate,
  eventEndDate,
  eventLatitude,
  eventLongitude,
  isVenueCoordsLoading = false,
  certifyDisabled = false,
  onCertifyPress,
}: Props) {
  const [hasRequestedLocation, setHasRequestedLocation] = useState(false);
  const { locationSharingEnabled, ready: locationPreferenceReady } = useLocationPreference();
  const {
    latitude: userLatitude,
    longitude: userLongitude,
    isLoading: isLoadingLocation,
    requestLocation,
  } = useMobileGeolocation();

  const {
    isEligible,
    isWithinTimeWindow,
    timeMessage,
    locationMessage,
    isAfterEvent,
    needsGeolocation,
  } = useCertificationEligibility({
    eventStartDate,
    eventEndDate,
    eventLatitude,
    eventLongitude,
    userLatitude,
    userLongitude,
    isLoadingLocation,
  });

  useEffect(() => {
    if (!locationSharingEnabled) {
      setHasRequestedLocation(false);
    }
  }, [locationSharingEnabled]);

  useEffect(() => {
    if (!locationPreferenceReady || certifyDisabled || !locationSharingEnabled) return;
    if (eventLatitude === null || eventLongitude === null) return;
    if (!hasRequestedLocation) {
      setHasRequestedLocation(true);
      void requestLocation();
    }
  }, [
    certifyDisabled,
    eventLatitude,
    eventLongitude,
    hasRequestedLocation,
    locationPreferenceReady,
    locationSharingEnabled,
    requestLocation,
  ]);

  const venueCoordsMissing = eventLatitude === null || eventLongitude === null;

  const infoMessage = useMemo(() => {
    if (!locationSharingEnabled) {
      return 'Active la localisation dans l’onglet Profil pour que l’app puisse vérifier ta présence sur le lieu.';
    }
    if (venueCoordsMissing && !isVenueCoordsLoading) {
      return 'Les coordonnées GPS du lieu ne sont pas disponibles. La vérification de proximité ne peut pas fonctionner.';
    }
    if (!isWithinTimeWindow) return timeMessage;
    if (needsGeolocation) {
      return 'Active la localisation pour Citizen Vitae dans les réglages de ton téléphone.';
    }
    return locationMessage;
  }, [
    isVenueCoordsLoading,
    isWithinTimeWindow,
    locationSharingEnabled,
    locationMessage,
    needsGeolocation,
    timeMessage,
    venueCoordsMissing,
  ]);

  if (isAfterEvent) {
    return null;
  }

  if (certifyDisabled) {
    return (
      <View style={[styles.btnBase, styles.doneWrap]}>
        <MaterialCommunityIcons name="check-decagram" size={22} color="#16A34A" style={styles.shield} />
        <Text style={styles.doneText}>Présence certifiée</Text>
      </View>
    );
  }

  const showInfo = () => {
    const msg =
      infoMessage.trim() || 'La certification sera possible au bon moment et au bon endroit.';
    Alert.alert('Certifier ma présence', msg, [{ text: 'OK' }]);
  };

  if (!locationPreferenceReady) {
    return (
      <View style={[styles.btnBase, styles.btnMuted]}>
        <ActivityIndicator color="#6B7280" style={styles.loader} />
        <Text style={styles.mutedText}>Chargement…</Text>
      </View>
    );
  }

  if (venueCoordsMissing && isVenueCoordsLoading) {
    return (
      <View style={[styles.btnBase, styles.btnMuted]}>
        <ActivityIndicator color="#6B7280" style={styles.loader} />
        <Text style={styles.mutedText}>Repérage du lieu…</Text>
      </View>
    );
  }

  if (venueCoordsMissing && !isVenueCoordsLoading) {
    return (
      <View style={styles.relative}>
        <View style={[styles.btnBase, styles.btnMuted, styles.btnPaddedRight]}>
          <MaterialCommunityIcons name="shield-outline" size={22} color="#6B7280" style={styles.shield} />
          <Text style={styles.mutedText}>Certifier ma présence</Text>
        </View>
        <Pressable
          style={styles.infoFab}
          onPress={showInfo}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Pourquoi ce bouton est indisponible"
        >
          <MaterialCommunityIcons name="information-outline" size={22} color="#EA580C" />
        </Pressable>
      </View>
    );
  }

  if (isLoadingLocation) {
    return (
      <View style={[styles.btnBase, styles.btnMuted]}>
        <ActivityIndicator color="#6B7280" style={styles.loader} />
        <Text style={styles.mutedText}>Vérification de la position…</Text>
      </View>
    );
  }

  if (isEligible) {
    return (
      <Pressable
        onPress={onCertifyPress}
        accessibilityRole="button"
        accessibilityLabel="Certifier ma présence"
        style={({ pressed }) => [pressed && { opacity: 0.92 }]}
      >
        <LinearGradient
          colors={['#012573', '#083AD2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGrad}
        >
          <MaterialCommunityIcons name="shield-check" size={22} color="#FFFFFF" />
          <Text style={styles.activeText}>Certifier ma présence</Text>
          <MaterialCommunityIcons name="check-circle" size={20} color="#86EFAC" />
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <View style={styles.relative}>
      <View style={[styles.btnBase, styles.btnMuted, styles.btnPaddedRight]}>
        <MaterialCommunityIcons name="shield-outline" size={22} color="#6B7280" style={styles.shield} />
        <Text style={styles.mutedText}>Certifier ma présence</Text>
      </View>
      <Pressable
        style={styles.infoFab}
        onPress={showInfo}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Pourquoi ce bouton est indisponible"
      >
        <MaterialCommunityIcons name="information-outline" size={22} color="#EA580C" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  relative: { position: 'relative', width: '100%' },
  btnBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: 14,
    width: '100%',
  },
  btnMuted: {
    backgroundColor: '#F3F4F6',
  },
  btnPaddedRight: { paddingRight: 44 },
  btnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 18,
  },
  shield: { marginRight: 10 },
  activeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  doneWrap: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  doneText: { color: '#166534', fontSize: 16, fontWeight: '700' },
  mutedText: { color: '#6B7280', fontSize: 16, fontWeight: '600' },
  loader: { marginRight: 10 },
  infoFab: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
});
