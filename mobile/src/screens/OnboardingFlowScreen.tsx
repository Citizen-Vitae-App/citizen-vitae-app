import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { AuthOrbBackground } from '@/components/layout/AuthOrbBackground';
import { CitizenVitaeLogo } from '@/components/branding/CitizenVitaeLogo';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingFlow, type CauseThemeRow } from '@/hooks/useOnboardingFlow';
import { buildWebAppPath } from '@/lib/webAppUrl';
import { CvColors } from '@/theme/colors';

function causeIconName(icon: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const map: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
    Leaf: 'leaf',
    GraduationCap: 'school',
    Heart: 'heart',
    HeartPulse: 'heart-pulse',
    Palette: 'palette',
    Dumbbell: 'dumbbell',
    PawPrint: 'paw',
    Briefcase: 'briefcase',
    Home: 'home',
    Users: 'account-group',
  };
  return map[icon] ?? 'tag-heart';
}

function ProgressRow({ step }: { step: number }) {
  return (
    <View style={styles.progressRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <View key={s} style={[styles.progressSeg, s <= step ? styles.progressOn : styles.progressOff]} />
      ))}
    </View>
  );
}

function CauseChip({
  theme,
  selected,
  onPress,
}: {
  theme: CauseThemeRow;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? theme.color : CvColors.border },
        selected && { backgroundColor: `${theme.color}18` },
      ]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <MaterialCommunityIcons name={causeIconName(theme.icon)} size={18} color={theme.color} />
      <Text style={[styles.chipText, selected && { color: CvColors.foreground, fontWeight: '700' }]}>
        {theme.name}
      </Text>
    </Pressable>
  );
}

export function OnboardingFlowScreen() {
  const { user, profile, refreshProfile } = useAuth();
  const flow = useOnboardingFlow(user?.id, profile, refreshProfile);
  const [dobModalOpen, setDobModalOpen] = useState(false);

  const openWebOnboarding = async () => {
    const url = buildWebAppPath('/onboarding');
    if (!url) {
      Alert.alert(
        'Lien indisponible',
        'Configure EXPO_PUBLIC_WEB_APP_ORIGIN pour ouvrir la vérification sur le site.'
      );
      return;
    }
    await WebBrowser.openBrowserAsync(url);
  };

  const onStep1 = async () => {
    const err = await flow.handleStep1();
    if (err) Alert.alert('Erreur', err);
  };

  const onStep4 = async () => {
    const err = await flow.handleStep4();
    if (err) Alert.alert('Erreur', err);
  };

  const onFinish = async () => {
    const err = await flow.handleFinish();
    if (err) Alert.alert('Erreur', err);
  };

  const onDobChange = (_: unknown, date?: Date) => {
    if (Platform.OS === 'android') setDobModalOpen(false);
    if (date) flow.setDateOfBirth(date);
  };

  return (
    <AuthOrbBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoRow}>
            <CitizenVitaeLogo width={200} height={30} />
          </View>

          <View style={styles.card}>
            <ProgressRow step={flow.step} />

            {flow.step === 1 && (
              <View style={styles.section}>
                <Text style={styles.h1}>Informations personnelles</Text>
                <Text style={styles.muted}>Commençons par faire connaissance</Text>
                <Text style={styles.label}>Prénom</Text>
                <TextInput
                  style={styles.input}
                  value={flow.firstName}
                  onChangeText={flow.setFirstName}
                  placeholder="Ton prénom"
                  placeholderTextColor={CvColors.mutedForeground}
                  autoCapitalize="words"
                />
                <Text style={styles.label}>Nom</Text>
                <TextInput
                  style={styles.input}
                  value={flow.lastName}
                  onChangeText={flow.setLastName}
                  placeholder="Ton nom"
                  placeholderTextColor={CvColors.mutedForeground}
                  autoCapitalize="words"
                />
                <Pressable
                  style={[styles.primaryBtn, flow.isLoading && styles.btnDisabled]}
                  onPress={() => void onStep1()}
                  disabled={flow.isLoading}
                >
                  {flow.isLoading ? (
                    <ActivityIndicator color={CvColors.primaryForeground} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Continuer</Text>
                  )}
                </Pressable>
              </View>
            )}

            {flow.step === 2 && (
              <View style={styles.section}>
                <Text style={styles.h1}>Vérification d&apos;identité</Text>
                <Text style={styles.muted}>
                  Vérifie ton identité pour débloquer toutes les fonctionnalités. Tu peux aussi le faire plus tard
                  dans les paramètres sur le web.
                </Text>
                {profile?.id_verified ? (
                  <View style={styles.successBanner}>
                    <MaterialCommunityIcons name="check-decagram" size={28} color="#16A34A" />
                    <Text style={styles.successText}>Identité vérifiée</Text>
                  </View>
                ) : (
                  <Pressable style={styles.outlineBtn} onPress={() => void openWebOnboarding()}>
                    <MaterialCommunityIcons name="open-in-new" size={20} color={CvColors.primary} />
                    <Text style={styles.outlineBtnText}>Vérifier sur le web</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.textLink}
                  onPress={() => void refreshProfile()}
                  accessibilityRole="button"
                >
                  <Text style={styles.textLinkLabel}>J&apos;ai terminé sur le web — actualiser</Text>
                </Pressable>
                <View style={styles.rowGap}>
                  {!flow.hasGoogleData && (
                    <Pressable style={styles.outlineBtn} onPress={() => flow.setStep(1)}>
                      <Text style={styles.outlineBtnText}>Retour</Text>
                    </Pressable>
                  )}
                  <Pressable style={styles.primaryBtn} onPress={() => flow.setStep(3)}>
                    <Text style={styles.primaryBtnText}>
                      {profile?.id_verified ? 'Continuer' : 'Passer cette étape'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {flow.step === 3 && (
              <View style={styles.section}>
                <Text style={styles.h1}>Géolocalisation</Text>
                <Text style={styles.muted}>
                  Pour certifier ta présence sur le lieu des missions, l&apos;app doit pouvoir utiliser ta position au
                  moment voulu.
                </Text>
                <View style={styles.infoBlock}>
                  <MaterialCommunityIcons name="map-marker-radius" size={32} color={CvColors.primary} />
                  <Text style={styles.infoTitle}>Pourquoi la géolocalisation ?</Text>
                  <Text style={styles.infoBody}>
                    Elle sert à vérifier que tu es bien sur le lieu pour valider ta participation.
                  </Text>
                </View>
                {flow.geoStatus === 'idle' && (
                  <Pressable style={styles.primaryBtn} onPress={() => void flow.requestGeolocation()}>
                    <Text style={styles.primaryBtnText}>Activer la géolocalisation</Text>
                  </Pressable>
                )}
                {flow.geoStatus === 'requesting' && (
                  <View style={styles.centerRow}>
                    <ActivityIndicator color={CvColors.primary} />
                    <Text style={styles.muted}>Demande en cours…</Text>
                  </View>
                )}
                {flow.geoStatus === 'granted' && (
                  <View style={styles.successBanner}>
                    <MaterialCommunityIcons name="check-circle" size={24} color="#16A34A" />
                    <Text style={styles.successText}>Géolocalisation activée</Text>
                  </View>
                )}
                {(flow.geoStatus === 'denied' || flow.geoStatus === 'error') && flow.geoError ? (
                  <View style={styles.warnBanner}>
                    <MaterialCommunityIcons name="alert" size={22} color="#B45309" />
                    <Text style={styles.warnText}>{flow.geoError}</Text>
                    <Pressable style={styles.outlineBtn} onPress={() => void flow.requestGeolocation()}>
                      <Text style={styles.outlineBtnText}>Réessayer</Text>
                    </Pressable>
                  </View>
                ) : null}
                <Text style={styles.hintCenter}>Tu pourras modifier ce réglage dans l&apos;onglet Profil.</Text>
                <View style={styles.rowGap}>
                  <Pressable style={styles.outlineBtn} onPress={() => flow.setStep(2)}>
                    <Text style={styles.outlineBtnText}>Retour</Text>
                  </Pressable>
                  <Pressable style={styles.primaryBtn} onPress={() => flow.setStep(4)}>
                    <Text style={styles.primaryBtnText}>
                      {flow.geoStatus === 'granted' ? 'Continuer' : 'Passer cette étape'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {flow.step === 4 && (
              <View style={styles.section}>
                <Text style={styles.h1}>Date de naissance</Text>
                <Text style={styles.muted}>Cette information reste privée (minimum 13 ans).</Text>
                <Pressable style={styles.dateReveal} onPress={() => setDobModalOpen(true)}>
                  <Text style={styles.dateRevealText}>
                    {format(flow.dateOfBirth, 'd MMMM yyyy', { locale: fr })}
                  </Text>
                  <MaterialCommunityIcons name="calendar" size={22} color={CvColors.primary} />
                </Pressable>
                {Platform.OS === 'android' && dobModalOpen ? (
                  <DateTimePicker
                    value={flow.dateOfBirth}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    minimumDate={new Date(1920, 0, 1)}
                    onChange={(e, d) => {
                      setDobModalOpen(false);
                      onDobChange(e, d);
                    }}
                  />
                ) : null}
                {Platform.OS === 'ios' ? (
                  <Modal visible={dobModalOpen} transparent animationType="slide">
                    <Pressable style={styles.modalOverlay} onPress={() => setDobModalOpen(false)}>
                      <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                          <Pressable onPress={() => setDobModalOpen(false)}>
                            <Text style={styles.modalDone}>OK</Text>
                          </Pressable>
                        </View>
                        <DateTimePicker
                          value={flow.dateOfBirth}
                          mode="date"
                          display="spinner"
                          locale="fr-FR"
                          maximumDate={new Date()}
                          minimumDate={new Date(1920, 0, 1)}
                          onChange={(_, d) => d && flow.setDateOfBirth(d)}
                        />
                      </Pressable>
                    </Pressable>
                  </Modal>
                ) : null}
                <View style={styles.rowGap}>
                  <Pressable style={styles.outlineBtn} onPress={() => flow.setStep(3)}>
                    <Text style={styles.outlineBtnText}>Retour</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.primaryBtn, flow.isLoading && styles.btnDisabled]}
                    onPress={() => void onStep4()}
                    disabled={flow.isLoading}
                  >
                    {flow.isLoading ? (
                      <ActivityIndicator color={CvColors.primaryForeground} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Continuer</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}

            {flow.step === 5 && (
              <View style={styles.section}>
                <Text style={styles.h1}>Tes centres d&apos;intérêt</Text>
                <Text style={styles.muted}>Choisis 2 à 3 causes qui te tiennent à cœur.</Text>
                <Text style={styles.counter}>{flow.selectedThemes.length}/3 sélectionné(s)</Text>
                <View style={styles.chipWrap}>
                  {flow.causeThemes.map((t) => (
                    <CauseChip
                      key={t.id}
                      theme={t}
                      selected={flow.selectedThemes.includes(t.id)}
                      onPress={() => flow.toggleTheme(t.id)}
                    />
                  ))}
                </View>
                <View style={styles.rowGap}>
                  <Pressable style={styles.outlineBtn} onPress={() => flow.setStep(4)}>
                    <Text style={styles.outlineBtnText}>Retour</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.primaryBtn,
                      (flow.isLoading ||
                        flow.selectedThemes.length < 2 ||
                        flow.selectedThemes.length > 3) &&
                        styles.btnDisabled,
                    ]}
                    onPress={() => void onFinish()}
                    disabled={
                      flow.isLoading || flow.selectedThemes.length < 2 || flow.selectedThemes.length > 3
                    }
                  >
                    {flow.isLoading ? (
                      <ActivityIndicator color={CvColors.primaryForeground} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Terminer</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          <Text style={styles.footerLegal}>
            En continuant, tu acceptes nos conditions d&apos;utilisation du service Citizen Vitae.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </AuthOrbBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
  logoRow: { alignItems: 'center', marginBottom: 16 },
  card: {
    backgroundColor: CvColors.card,
    borderRadius: 16,
    padding: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CvColors.border,
  },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 24, justifyContent: 'center' },
  progressSeg: { height: 6, flex: 1, maxWidth: 56, borderRadius: 4 },
  progressOn: { backgroundColor: CvColors.primary },
  progressOff: { backgroundColor: CvColors.muted },
  section: { gap: 12 },
  h1: { fontSize: 22, fontWeight: '700', color: CvColors.foreground },
  muted: { fontSize: 15, color: CvColors.mutedForeground, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', color: CvColors.foreground, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: CvColors.input,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: CvColors.foreground,
    backgroundColor: CvColors.background,
  },
  primaryBtn: {
    backgroundColor: CvColors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    flex: 1,
  },
  primaryBtnText: { color: CvColors.primaryForeground, fontSize: 16, fontWeight: '700' },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: CvColors.border,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    backgroundColor: CvColors.card,
  },
  outlineBtnText: { color: CvColors.primary, fontSize: 16, fontWeight: '600' },
  btnDisabled: { opacity: 0.55 },
  rowGap: { flexDirection: 'row', gap: 10, marginTop: 8 },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successText: { fontSize: 16, fontWeight: '700', color: '#166534' },
  warnBanner: {
    gap: 10,
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warnText: { fontSize: 14, color: '#92400E', lineHeight: 20 },
  infoBlock: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: CvColors.muted,
    borderRadius: 12,
    gap: 8,
  },
  infoTitle: { fontSize: 16, fontWeight: '700', color: CvColors.foreground },
  infoBody: { fontSize: 14, color: CvColors.mutedForeground, textAlign: 'center', lineHeight: 20 },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  hintCenter: { fontSize: 13, color: CvColors.mutedForeground, textAlign: 'center', marginTop: 4 },
  dateReveal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: CvColors.border,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  dateRevealText: { fontSize: 17, fontWeight: '600', color: CvColors.foreground },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: CvColors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  modalDone: { fontSize: 17, fontWeight: '700', color: CvColors.primary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: CvColors.background,
  },
  chipText: { fontSize: 14, color: CvColors.mutedForeground, fontWeight: '600' },
  counter: { fontSize: 13, color: CvColors.mutedForeground },
  textLink: { alignItems: 'center', paddingVertical: 8 },
  textLinkLabel: { fontSize: 14, color: CvColors.primary, fontWeight: '600' },
  footerLegal: {
    fontSize: 12,
    color: CvColors.mutedForeground,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
