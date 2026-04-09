import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { buildWebAppPath } from '@/lib/webAppUrl';
import { useCertificationEligibility } from '@/hooks/useCertificationEligibility';
import { useMobileGeolocation } from '@/hooks/useMobileGeolocation';
import { useLocationPreference } from '@/contexts/LocationPreferenceContext';
import { CertificationSelfieCamera } from '@/components/eventDetail/certification/CertificationSelfieCamera';
import { CertificationQrPanel } from '@/components/eventDetail/certification/CertificationQrPanel';
import type { EventRegistrationRow } from '@/hooks/useMobileEventRegistration';
import { CvColors } from '@/theme/colors';

function logCertificationDiagnostic(tag: string, payload?: Record<string, unknown>) {
  if (!__DEV__) return;
  if (payload && Object.keys(payload).length > 0) {
    console.log(`[CitizenVitae:Certification] ${tag}`, payload);
  } else {
    console.log(`[CitizenVitae:Certification] ${tag}`);
  }
}

function logCertificationError(tag: string, payload: Record<string, unknown>) {
  if (!__DEV__) return;
  console.error(`[CitizenVitae:Certification] ${tag}`, payload);
}

/** Détaille une erreur `functions.invoke` (statut HTTP, corps renvoyé, erreur réseau). */
async function serializeFunctionInvokeError(error: unknown): Promise<Record<string, unknown>> {
  const base: Record<string, unknown> = {
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    message: error instanceof Error ? error.message : String(error),
  };
  if (error instanceof FunctionsHttpError) {
    base.kind = 'FunctionsHttpError';
    try {
      const res = error.context;
      base.httpStatus = res.status;
      const text = await res.clone().text();
      base.responseBodyPreview = text.slice(0, 1200);
    } catch (readErr) {
      base.responseBodyReadError = readErr instanceof Error ? readErr.message : String(readErr);
    }
    return base;
  }
  if (error instanceof FunctionsRelayError) {
    base.kind = 'FunctionsRelayError';
    return base;
  }
  if (error instanceof FunctionsFetchError) {
    base.kind = 'FunctionsFetchError';
    return base;
  }
  return base;
}

type Stage =
  | 'precheck'
  | 'instructions'
  | 'camera'
  | 'processing'
  | 'success_anim'
  | 'qr'
  | 'self_recap'
  | 'self_submitting'
  | 'self_success'
  | 'flow_done'
  | 'error';

type Props = {
  visible: boolean;
  onClose: () => void;
  eventId: string;
  organizationId: string;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLatitude: number | null;
  eventLongitude: number | null;
  allowSelfCertification: boolean;
  registrationId: string;
  userId: string;
  registration: EventRegistrationRow | null;
};

export function EventCertificationModal({
  visible,
  onClose,
  eventId,
  organizationId,
  eventName,
  eventStartDate,
  eventEndDate,
  eventLatitude,
  eventLongitude,
  allowSelfCertification,
  registrationId,
  userId,
  registration,
}: Props) {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const bottomSheetRef = useRef<React.ComponentRef<typeof BottomSheetModal>>(null);
  const { locationSharingEnabled } = useLocationPreference();
  const {
    latitude: userLatitude,
    longitude: userLongitude,
    isLoading: isLoadingLocation,
    requestLocation,
  } = useMobileGeolocation();

  const {
    isWithinTimeWindow,
    isWithinLocationRadius,
    timeMessage,
    locationMessage,
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

  const [stage, setStage] = useState<Stage>('precheck');
  const [errorMessage, setErrorMessage] = useState('');
  const [qrToken, setQrToken] = useState('');
  const [honorDeclaration, setHonorDeclaration] = useState(false);
  const [certificationTime, setCertificationTime] = useState<Date | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [scanPhase, setScanPhase] = useState<'waiting_first_scan' | 'first_scan_done'>(
    'waiting_first_scan'
  );
  const openedRef = useRef(false);

  const snapPoints = useMemo(() => ['90%'], []);

  const allowPanDownToClose = useMemo(
    () =>
      !(
        stage === 'processing' ||
        stage === 'self_submitting' ||
        stage === 'success_anim' ||
        stage === 'camera'
      ),
    [stage]
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.35}
        pressBehavior={
          stage === 'precheck' || stage === 'instructions' ? 'close' : 'none'
        }
      />
    ),
    [stage]
  );

  useEffect(() => {
    if (visible) {
      const id = requestAnimationFrame(() => bottomSheetRef.current?.present());
      return () => cancelAnimationFrame(id);
    }
    bottomSheetRef.current?.dismiss();
  }, [visible]);

  const handleSheetBack = useCallback(() => {
    switch (stage) {
      case 'instructions':
        setStage('precheck');
        return;
      case 'camera':
        setStage('instructions');
        return;
      case 'self_recap':
        setStage('qr');
        return;
      case 'error':
        setStage('instructions');
        return;
      default:
        return;
    }
  }, [stage]);

  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      switch (stage) {
        case 'processing':
        case 'self_submitting':
        case 'success_anim':
          return true;
        case 'instructions':
          setStage('precheck');
          return true;
        case 'camera':
          setStage('instructions');
          return true;
        case 'self_recap':
          setStage('qr');
          return true;
        case 'error':
          setStage('instructions');
          return true;
        case 'precheck':
        case 'qr':
        case 'flow_done':
        case 'self_success':
          onClose();
          return true;
        default:
          onClose();
          return true;
      }
    });
    return () => sub.remove();
  }, [visible, stage, onClose]);

  const eventDateLabel = `${format(parseISO(eventStartDate), "d MMMM yyyy 'à' HH:mm", {
    locale: fr,
  })}`;

  const invalidateRegistration = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['event-registration', eventId, userId] });
    void queryClient.invalidateQueries({ queryKey: ['my-missions', userId] });
  }, [queryClient, eventId, userId]);

  useEffect(() => {
    if (visible && locationSharingEnabled && eventLatitude != null && eventLongitude != null) {
      void requestLocation();
    }
  }, [visible, locationSharingEnabled, eventLatitude, eventLongitude, requestLocation]);

  useEffect(() => {
    if (!visible) {
      openedRef.current = false;
      setStage('precheck');
      setErrorMessage('');
      setQrToken('');
      setHonorDeclaration(false);
      setCertificationTime(null);
      setLocationLabel('');
      setScanPhase('waiting_first_scan');
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;
    setErrorMessage('');
    const goToQr =
      !allowSelfCertification &&
      registration?.face_match_passed &&
      registration?.qr_token;
    if (goToQr) {
      setQrToken(registration.qr_token!);
      if (registration.certification_start_at && !registration.certification_end_at) {
        setScanPhase('first_scan_done');
      } else {
        setScanPhase('waiting_first_scan');
      }
      setStage('qr');
    } else {
      setStage('precheck');
    }
  }, [visible, allowSelfCertification, registration]);

  useEffect(() => {
    if (visible && stage === 'self_recap' && userLatitude != null && userLongitude != null) {
      setLoadingAddress(true);
      void supabase.functions
        .invoke('reverse-geocode', {
          body: { latitude: userLatitude, longitude: userLongitude },
        })
        .then(({ data, error }) => {
          if (error || !data?.address) {
            setLocationLabel(`${userLatitude.toFixed(4)}, ${userLongitude.toFixed(4)}`);
          } else {
            setLocationLabel(data.address as string);
          }
        })
        .catch(() => {
          setLocationLabel(`${userLatitude.toFixed(4)}, ${userLongitude.toFixed(4)}`);
        })
        .finally(() => setLoadingAddress(false));
    }
  }, [visible, stage, userLatitude, userLongitude]);

  useEffect(() => {
    if (!visible || stage !== 'qr' || !registrationId || allowSelfCertification) return;
    const channel = supabase
      .channel(`cert-flow-${registrationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_registrations',
          filter: `id=eq.${registrationId}`,
        },
        (payload) => {
          const row = payload.new as {
            certification_end_at?: string | null;
            attended_at?: string | null;
            certification_start_at?: string | null;
          };
          if (row.certification_start_at) {
            setScanPhase('first_scan_done');
          }
          if (row.certification_end_at || row.attended_at) {
            setStage('flow_done');
            invalidateRegistration();
          }
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [visible, stage, registrationId, allowSelfCertification, invalidateRegistration]);

  const runFaceMatch = async (imageBase64: string) => {
    setCertificationTime(new Date());
    setStage('processing');
    logCertificationDiagnostic('face-match:request', {
      registrationId,
      eventId,
      payloadSelfieLength: imageBase64.length,
    });
    try {
      const { data, error } = await supabase.functions.invoke('didit-verification', {
        body: {
          action: 'face-match',
          user_id: userId,
          event_id: eventId,
          registration_id: registrationId,
          live_selfie_base64: imageBase64,
        },
      });

      if (error) {
        const detail = await serializeFunctionInvokeError(error);
        logCertificationError('face-match:invoke-failed', detail);
        setErrorMessage('Une erreur est survenue lors de la vérification.');
        setStage('error');
        return;
      }

      logCertificationDiagnostic('face-match:response', {
        success: data?.success,
        passed: data?.passed,
        score: data?.score,
        needs_reverification: data?.needs_reverification,
        cached: data?.cached,
        hasQrToken: typeof data?.qr_token === 'string' && data.qr_token.length > 0,
        serverError: typeof (data as { error?: string })?.error === 'string' ? (data as { error: string }).error : undefined,
      });

      if (!data?.success) {
        if (data?.needs_reverification) {
          setErrorMessage(
            'Ta vérification d’identité a expiré. Passe par le profil ou le site pour la renouveler.'
          );
        } else {
          setErrorMessage(data?.error || 'La vérification a échoué.');
        }
        setStage('error');
        return;
      }
      if (!data.passed) {
        setErrorMessage(
          `Score de correspondance insuffisant (${Math.round(data.score)} %). Réessaie.`
        );
        setStage('error');
        return;
      }
      const token = data.qr_token as string | undefined;
      if (!token) {
        logCertificationError('face-match:missing-qr-token', { dataKeys: data ? Object.keys(data as object) : [] });
        setErrorMessage('Aucun QR code généré. Réessaie.');
        setStage('error');
        return;
      }

      invalidateRegistration();

      if (allowSelfCertification) {
        setQrToken(token);
        setStage('self_recap');
      } else {
        setQrToken(token);
        if (data.cached) {
          setStage('qr');
        } else {
          setStage('success_anim');
          setTimeout(() => setStage('qr'), 1400);
        }
      }
    } catch (err) {
      logCertificationError('face-match:unexpected', {
        message: err instanceof Error ? err.message : String(err),
        name: err instanceof Error ? err.name : undefined,
      });
      setErrorMessage('Une erreur est survenue. Réessaie.');
      setStage('error');
    }
  };

  const submitSelfCertification = async () => {
    if (!honorDeclaration || !certificationTime) {
      Alert.alert('Déclaration', 'Coche la case pour confirmer ta présence sur les lieux.');
      return;
    }
    setStage('self_submitting');
    logCertificationDiagnostic('self-cert:submit', { registrationId });
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({
          status: 'self_certified',
          certification_start_at: certificationTime.toISOString(),
          attended_at: new Date().toISOString(),
        })
        .eq('id', registrationId);

      if (error) {
        logCertificationError('self-cert:db-update-failed', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        setErrorMessage("Impossible d'enregistrer la certification.");
        setStage('error');
        return;
      }

      try {
        await supabase.functions.invoke('generate-certificate', {
          body: { registration_id: registrationId },
        });
      } catch {
        /* best-effort */
      }

      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            organization_id: organizationId,
            type: 'self_certification',
            event_id: eventId,
            event_name: eventName,
            action_url: `/events/${eventId}`,
            custom_message_fr: `Un participant a auto-certifié sa présence : ${eventName}`,
            custom_message_en: `A participant self-certified attendance: ${eventName}`,
          },
        });
      } catch {
        /* best-effort */
      }

      invalidateRegistration();
      setStage('self_success');
      setTimeout(() => {
        onClose();
      }, 2200);
    } catch (err) {
      logCertificationError('self-cert:unexpected', {
        message: err instanceof Error ? err.message : String(err),
      });
      setErrorMessage('Erreur réseau.');
      setStage('error');
    }
  };

  const verifyUrlReady = () => {
    const path = `/verify/${registrationId}?token=${encodeURIComponent(qrToken)}`;
    return buildWebAppPath(path) !== null;
  };

  const renderBody = () => {
    if (stage === 'precheck') {
      return (
        <View style={styles.block}>
          <Text style={styles.h2}>Avant de continuer</Text>
          <View style={styles.checkRow}>
            <MaterialCommunityIcons
              name={isWithinTimeWindow ? 'check-circle' : 'close-circle'}
              size={22}
              color={isWithinTimeWindow ? '#16A34A' : '#DC2626'}
            />
            <Text style={styles.checkText}>
              {isWithinTimeWindow ? 'Fenêtre horaire : OK' : `Horaires : ${timeMessage || '—'}`}
            </Text>
          </View>
          <View style={styles.checkRow}>
            <MaterialCommunityIcons
              name={isWithinLocationRadius ? 'check-circle' : 'close-circle'}
              size={22}
              color={
                needsGeolocation ? '#CA8A04' : isWithinLocationRadius ? '#16A34A' : '#DC2626'
              }
            />
            <Text style={styles.checkText}>
              {needsGeolocation
                ? 'Active la localisation dans les réglages.'
                : isWithinLocationRadius
                  ? 'Tu es à proximité du lieu (≤ 500 m).'
                  : locationMessage || 'Position non disponible.'}
            </Text>
          </View>
          {!locationSharingEnabled ? (
            <Text style={styles.warn}>Active la localisation dans l’onglet Profil.</Text>
          ) : null}
          <Pressable
            style={[styles.primaryBtn, (!isWithinTimeWindow || !isWithinLocationRadius) && styles.disabled]}
            disabled={!isWithinTimeWindow || !isWithinLocationRadius || isLoadingLocation}
            onPress={() => setStage('instructions')}
          >
            <Text style={styles.primaryBtnText}>Continuer</Text>
          </Pressable>
        </View>
      );
    }

    if (stage === 'instructions') {
      return (
        <View style={styles.block}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="shield-check" size={36} color="#012573" />
          </View>
          <Text style={styles.h2}>
            {allowSelfCertification ? 'Auto-certification' : 'Certification de présence'}
          </Text>
          <Text style={styles.p}>
            Nous comparons ton visage à ta photo de vérification (Didit). Assure-toi d’être bien
            éclairé·e.
          </Text>
          <Pressable
            style={styles.gradWrap}
            onPress={() => setStage('camera')}
          >
            <LinearGradient
              colors={['#012573', '#083AD2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradInner}
            >
              <Text style={styles.primaryBtnText}>Commencer</Text>
            </LinearGradient>
          </Pressable>
        </View>
      );
    }

    if (stage === 'camera') {
      return (
        <CertificationSelfieCamera
          onCapture={(b64) => void runFaceMatch(b64)}
          onCancel={() => setStage('instructions')}
        />
      );
    }

    if (stage === 'processing') {
      return (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color="#012573" />
          <Text style={styles.p}>Vérification de ton identité…</Text>
        </View>
      );
    }

    if (stage === 'success_anim') {
      return (
        <View style={styles.centerBlock}>
          <MaterialCommunityIcons name="check-decagram" size={64} color="#16A34A" />
          <Text style={styles.h2}>Identité vérifiée</Text>
          <Text style={styles.p}>Préparation du QR code…</Text>
        </View>
      );
    }

    if (stage === 'qr') {
      if (!verifyUrlReady()) {
        return (
          <View style={styles.block}>
            <Text style={styles.warn}>
              Configure EXPO_PUBLIC_WEB_APP_ORIGIN pour générer le lien du QR code.
            </Text>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Fermer</Text>
            </Pressable>
          </View>
        );
      }
      return (
        <CertificationQrPanel
          qrToken={qrToken}
          registrationId={registrationId}
          eventName={eventName}
          eventDateLabel={eventDateLabel}
          scanPhase={scanPhase}
        />
      );
    }

    if (stage === 'self_recap') {
      return (
        <View style={styles.block}>
          <Text style={styles.h2}>Identité vérifiée</Text>
          <Text style={styles.p}>Confirme les informations avant validation.</Text>
          <View style={styles.recapBox}>
            <Text style={styles.recapTitle}>{eventName}</Text>
            <Text style={styles.recapLine}>
              Heure :{' '}
              {certificationTime
                ? format(certificationTime, "HH'h'mm", { locale: fr })
                : '—'}
            </Text>
            <Text style={styles.recapLine}>
              Position : {loadingAddress ? '…' : locationLabel || '—'}
            </Text>
          </View>
          <Pressable
            style={styles.honorRow}
            onPress={() => setHonorDeclaration((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: honorDeclaration }}
          >
            <MaterialCommunityIcons
              name={honorDeclaration ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={24}
              color="#012573"
            />
            <Text style={styles.honorText}>
              Je déclare sur l’honneur être sur les lieux pour cette mission.
            </Text>
          </Pressable>
          <Pressable
            style={[styles.primaryBtn, !honorDeclaration && styles.disabled]}
            disabled={!honorDeclaration}
            onPress={() => void submitSelfCertification()}
          >
            <Text style={styles.primaryBtnText}>Confirmer ma présence</Text>
          </Pressable>
        </View>
      );
    }

    if (stage === 'self_submitting') {
      return (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color="#012573" />
          <Text style={styles.p}>Enregistrement…</Text>
        </View>
      );
    }

    if (stage === 'self_success') {
      return (
        <View style={styles.centerBlock}>
          <MaterialCommunityIcons name="check-circle" size={64} color="#16A34A" />
          <Text style={styles.h2}>Présence enregistrée</Text>
        </View>
      );
    }

    if (stage === 'flow_done') {
      return (
        <View style={styles.centerBlock}>
          <MaterialCommunityIcons name="check-all" size={64} color="#16A34A" />
          <Text style={styles.h2}>Certification complète</Text>
          <Text style={styles.p}>Ta présence a été enregistrée.</Text>
          <Pressable style={styles.primaryBtn} onPress={onClose}>
            <Text style={styles.primaryBtnText}>Fermer</Text>
          </Pressable>
        </View>
      );
    }

    if (stage === 'error') {
      return (
        <View style={styles.block}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#DC2626" />
          <Text style={styles.h2}>Échec</Text>
          <Text style={styles.errText}>{errorMessage}</Text>
          <View style={styles.errActions}>
            <Pressable style={[styles.secondaryBtn, styles.errBtnHalf]} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>Fermer</Text>
            </Pressable>
            <Pressable style={[styles.primaryBtn, styles.errBtnHalf]} onPress={() => setStage('instructions')}>
              <Text style={styles.primaryBtnText}>Réessayer</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return null;
  };

  const showClose = stage !== 'camera' && stage !== 'self_submitting' && stage !== 'processing';
  const showHeaderBack = stage === 'instructions' || stage === 'camera' || stage === 'self_recap' || stage === 'error';

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose={allowPanDownToClose}
      topInset={insets.top}
      bottomInset={insets.bottom}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.sheetHandleBar}
      backgroundStyle={styles.sheetBackground}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <View style={styles.sheetHeader}>
        <View style={styles.headerSide}>
          {showHeaderBack ? (
            <Pressable
              onPress={handleSheetBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Retour"
            >
              <Text style={styles.headerBackText}>Retour</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.headerTitleCenter} numberOfLines={1}>
          Certification
        </Text>
        <View style={[styles.headerSide, styles.headerSideEnd]}>
          {showClose ? (
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Fermer">
              <MaterialCommunityIcons name="close" size={26} color={CvColors.foreground} />
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
        </View>
      </View>
      <BottomSheetScrollView
        contentContainerStyle={stage === 'camera' ? styles.scrollCamera : styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={stage !== 'camera'}
      >
        {renderBody()}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FAFAFA',
  },
  sheetHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerSide: { width: 72, flexDirection: 'row', alignItems: 'center' },
  headerSideEnd: { justifyContent: 'flex-end' },
  headerBackText: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  headerTitleCenter: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: CvColors.foreground,
    textAlign: 'center',
  },
  scroll: { padding: 20, paddingBottom: 40 },
  scrollCamera: { paddingHorizontal: 16, paddingBottom: 28, paddingTop: 4 },
  block: { gap: 14 },
  centerBlock: { alignItems: 'center', paddingVertical: 32, gap: 16 },
  h2: { fontSize: 20, fontWeight: '700', color: CvColors.foreground, textAlign: 'center' },
  p: { fontSize: 15, color: CvColors.mutedForeground, textAlign: 'center', lineHeight: 22 },
  iconCircle: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8EEF9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkText: { flex: 1, fontSize: 15, color: CvColors.foreground, lineHeight: 22 },
  warn: { fontSize: 13, color: '#CA8A04', textAlign: 'center' },
  primaryBtn: {
    backgroundColor: '#012573',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  gradWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  gradInner: { paddingVertical: 14, alignItems: 'center' },
  recapBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  recapTitle: { fontWeight: '700', color: CvColors.foreground, fontSize: 16 },
  recapLine: { fontSize: 14, color: CvColors.mutedForeground },
  honorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4 },
  honorText: { flex: 1, fontSize: 14, color: CvColors.foreground, lineHeight: 20 },
  errText: { fontSize: 14, color: CvColors.mutedForeground, textAlign: 'center' },
  errActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  errBtnHalf: { flex: 1, marginTop: 0 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: { fontSize: 16, fontWeight: '600', color: CvColors.foreground },
});
