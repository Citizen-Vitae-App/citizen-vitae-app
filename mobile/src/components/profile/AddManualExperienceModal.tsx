import { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  EXPERIENCE_TYPES,
  LOCATION_TYPES,
  MONTHS_FULL_FR,
} from '@/lib/manualExperienceConstants';
import { SettingsSheetHandle } from '@/components/settings/SettingsChrome';
import { CvColors } from '@/theme/colors';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => currentYear - i);

const INPUT_RADIUS = 8;
const BORDER = '#E5E7EB';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function FieldLabel({ children, required, first }: { children: string; required?: boolean; first?: boolean }) {
  return (
    <Text style={[styles.fieldLabel, first && styles.fieldLabelFirst]}>
      {children}
      {required ? <Text style={styles.asterisk}> *</Text> : null}
    </Text>
  );
}

export function AddManualExperienceModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [experienceType, setExperienceType] = useState('');
  const [orgName, setOrgName] = useState('');
  const [startMonth, setStartMonth] = useState<number | null>(null);
  const [startYear, setStartYear] = useState<number | null>(null);
  const [isCurrent, setIsCurrent] = useState(false);
  const [endMonth, setEndMonth] = useState<number | null>(null);
  const [endYear, setEndYear] = useState<number | null>(null);
  const [location, setLocation] = useState('');
  const [locationType, setLocationType] = useState('');
  const [description, setDescription] = useState('');
  const [typeModal, setTypeModal] = useState(false);
  const [locTypeModal, setLocTypeModal] = useState(false);
  const [monthPicker, setMonthPicker] = useState<'start' | 'end' | null>(null);
  const [yearPicker, setYearPicker] = useState<'start' | 'end' | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('auth');
      const t = title.trim();
      const o = orgName.trim();
      if (!t || !experienceType || !o) throw new Error('validation');
      if (startMonth === null || startYear === null) throw new Error('validation');

      const payload = {
        user_id: user.id,
        title: t,
        experience_type: experienceType,
        organization_name: o,
        start_month: startMonth,
        start_year: startYear,
        is_current: isCurrent,
        end_month: isCurrent ? null : endMonth,
        end_year: isCurrent ? null : endYear,
        location: location.trim() || null,
        location_type: locationType || null,
        description: description.trim() || null,
      };

      const { error } = await supabase.from('manual_experiences').insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['manual-experiences', user?.id] });
      reset();
      onClose();
      Alert.alert('Succès', 'Expérience ajoutée avec succès');
    },
    onError: (e: Error) => {
      if (e.message === 'validation') {
        Alert.alert(
          'Champs requis',
          'Renseigne le titre, le type, l’organisation, le mois et l’année de début.'
        );
        return;
      }
      if (e.message === 'auth') {
        Alert.alert('Connexion requise', 'Connecte-toi pour ajouter une expérience.');
        return;
      }
      Alert.alert('Erreur', "Erreur lors de l'ajout de l'expérience");
    },
  });

  const reset = () => {
    setTitle('');
    setExperienceType('');
    setOrgName('');
    setStartMonth(null);
    setStartYear(null);
    setIsCurrent(false);
    setEndMonth(null);
    setEndYear(null);
    setLocation('');
    setLocationType('');
    setDescription('');
  };

  const onSubmit = () => {
    mutation.mutate();
  };

  const pickListModal = (
    open: boolean,
    onRequestClose: () => void,
    title: string,
    items: { value: string; label: string }[],
    onSelect: (v: string) => void
  ) => (
    <Modal visible={open} animationType="fade" transparent onRequestClose={onRequestClose}>
      <Pressable style={styles.pickOverlay} onPress={onRequestClose}>
        <Pressable style={styles.pickSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.pickTitle}>{title}</Text>
          <ScrollView style={styles.pickScroll} keyboardShouldPersistTaps="handled">
            {items.map((item) => (
              <Pressable
                key={item.value}
                style={styles.pickRow}
                onPress={() => {
                  onSelect(item.value);
                  onRequestClose();
                }}
              >
                <Text style={styles.pickRowText}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const monthModal = (
    <Modal
      visible={monthPicker !== null}
      animationType="fade"
      transparent
      onRequestClose={() => setMonthPicker(null)}
    >
      <Pressable style={styles.pickOverlay} onPress={() => setMonthPicker(null)}>
        <Pressable style={styles.pickSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.pickTitle}>Mois</Text>
          <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <Pressable
                key={m}
                style={styles.pickRow}
                onPress={() => {
                  if (monthPicker === 'start') setStartMonth(m);
                  else if (monthPicker === 'end') setEndMonth(m);
                  setMonthPicker(null);
                }}
              >
                <Text style={styles.pickRowText}>{MONTHS_FULL_FR[m]}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const yearModal = (
    <Modal
      visible={yearPicker !== null}
      animationType="fade"
      transparent
      onRequestClose={() => setYearPicker(null)}
    >
      <Pressable style={styles.pickOverlay} onPress={() => setYearPicker(null)}>
        <Pressable style={styles.pickSheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.pickTitle}>Année</Text>
          <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
            {YEARS.map((y) => (
              <Pressable
                key={y}
                style={styles.pickRow}
                onPress={() => {
                  if (yearPicker === 'start') setStartYear(y);
                  else if (yearPicker === 'end') setEndYear(y);
                  setYearPicker(null);
                }}
              >
                <Text style={styles.pickRowText}>{String(y)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.sheetInner}>
            <View style={styles.headerBlock}>
              <SettingsSheetHandle />
              <View style={styles.headerTopRow}>
                <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Fermer">
                  <Text style={styles.fermer}>Fermer</Text>
                </Pressable>
              </View>
              <Text style={styles.sheetTitle}>Ajouter une expérience</Text>
              <Text style={styles.sheetSubtitle}>
                Ajoutez une expérience citoyenne non certifiée à votre profil.
              </Text>
            </View>

            <ScrollView
              style={styles.scroll}
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
              <FieldLabel required first>
                Titre
              </FieldLabel>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex : Bénévole aux Restos du Cœur"
                placeholderTextColor={CvColors.mutedForeground}
              />

              <FieldLabel required>Type d&apos;expérience</FieldLabel>
              <Pressable style={styles.selectBtn} onPress={() => setTypeModal(true)}>
                <Text style={[styles.selectText, !experienceType && styles.placeholder]}>
                  {experienceType
                    ? EXPERIENCE_TYPES.find((x) => x.value === experienceType)?.label
                    : 'Sélectionner un type'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={22} color={CvColors.mutedForeground} />
              </Pressable>

              <FieldLabel required>Organisation</FieldLabel>
              <TextInput
                style={styles.input}
                value={orgName}
                onChangeText={setOrgName}
                placeholder="Ex : Croix-Rouge française"
                placeholderTextColor={CvColors.mutedForeground}
              />

              <View style={styles.dateGrid}>
                <View style={styles.dateCol}>
                  <FieldLabel required>Mois de début</FieldLabel>
                  <Pressable style={styles.selectBtn} onPress={() => setMonthPicker('start')}>
                    <Text style={[styles.selectText, startMonth === null && styles.placeholder]}>
                      {startMonth !== null ? MONTHS_FULL_FR[startMonth] : 'Mois'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={CvColors.mutedForeground} />
                  </Pressable>
                </View>
                <View style={styles.dateCol}>
                  <FieldLabel required>Année de début</FieldLabel>
                  <Pressable style={styles.selectBtn} onPress={() => setYearPicker('start')}>
                    <Text style={[styles.selectText, startYear === null && styles.placeholder]}>
                      {startYear !== null ? String(startYear) : 'Année'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color={CvColors.mutedForeground} />
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={styles.checkRow}
                onPress={() => setIsCurrent((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isCurrent }}
              >
                <View style={[styles.checkBox, isCurrent && styles.checkBoxOn]}>
                  {isCurrent ? (
                    <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                  ) : null}
                </View>
                <Text style={styles.checkLabel}>J&apos;occupe actuellement ce poste</Text>
              </Pressable>

              {!isCurrent ? (
                <View style={styles.dateGrid}>
                  <View style={styles.dateCol}>
                    <FieldLabel>Mois de fin</FieldLabel>
                    <Pressable style={styles.selectBtn} onPress={() => setMonthPicker('end')}>
                      <Text style={[styles.selectText, endMonth === null && styles.placeholder]}>
                        {endMonth !== null ? MONTHS_FULL_FR[endMonth] : 'Mois'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color={CvColors.mutedForeground} />
                    </Pressable>
                  </View>
                  <View style={styles.dateCol}>
                    <FieldLabel>Année de fin</FieldLabel>
                    <Pressable style={styles.selectBtn} onPress={() => setYearPicker('end')}>
                      <Text style={[styles.selectText, endYear === null && styles.placeholder]}>
                        {endYear !== null ? String(endYear) : 'Année'}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={20} color={CvColors.mutedForeground} />
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <FieldLabel>Lieu</FieldLabel>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Ex : Paris, France"
                placeholderTextColor={CvColors.mutedForeground}
              />

              <FieldLabel>Type de lieu</FieldLabel>
              <Pressable style={styles.selectBtn} onPress={() => setLocTypeModal(true)}>
                <Text style={[styles.selectText, !locationType && styles.placeholder]}>
                  {locationType ? LOCATION_TYPES.find((x) => x.value === locationType)?.label : 'Sélectionner'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={22} color={CvColors.mutedForeground} />
              </Pressable>

              <FieldLabel>Description</FieldLabel>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Décrivez votre rôle et vos contributions..."
                placeholderTextColor={CvColors.mutedForeground}
                multiline
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.footer}>
              <Pressable
                style={[styles.primaryBtn, mutation.isPending && styles.primaryBtnDisabled]}
                onPress={onSubmit}
                disabled={mutation.isPending}
                accessibilityRole="button"
                accessibilityLabel="Enregistrer"
              >
                {mutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Enregistrer</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {pickListModal(
        typeModal,
        () => setTypeModal(false),
        "Type d'expérience",
        EXPERIENCE_TYPES.map((x) => ({ value: x.value, label: x.label })),
        setExperienceType
      )}
      {pickListModal(
        locTypeModal,
        () => setLocTypeModal(false),
        'Type de lieu',
        LOCATION_TYPES.map((x) => ({ value: x.value, label: x.label })),
        setLocationType
      )}
      {monthModal}
      {yearModal}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  sheetInner: { flex: 1 },
  headerBlock: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  headerTopRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4 },
  fermer: { fontSize: 16, color: CvColors.mutedForeground, fontWeight: '500' },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: CvColors.foreground,
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: CvColors.mutedForeground,
    marginTop: 6,
    lineHeight: 20,
  },
  scroll: { flex: 1 },
  form: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 0 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: CvColors.foreground,
    marginBottom: 8,
    marginTop: 16,
  },
  fieldLabelFirst: { marginTop: 0 },
  asterisk: { fontWeight: '700', color: CvColors.foreground },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: INPUT_RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: CvColors.foreground,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  textArea: { minHeight: 112, paddingTop: 12 },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: INPUT_RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    backgroundColor: '#FFFFFF',
  },
  selectText: { fontSize: 16, color: CvColors.foreground, flex: 1, paddingRight: 8 },
  placeholder: { color: CvColors.mutedForeground },
  dateGrid: { flexDirection: 'row', gap: 12, marginTop: 0 },
  dateCol: { flex: 1, minWidth: 0 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    marginBottom: 4,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkBoxOn: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  checkLabel: { flex: 1, fontSize: 15, color: CvColors.foreground, fontWeight: '400' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  primaryBtn: {
    backgroundColor: '#000000',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primaryBtnDisabled: { opacity: 0.7 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  pickOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  pickSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  pickTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12, color: CvColors.foreground },
  pickScroll: { maxHeight: 400 },
  pickRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  pickRowText: { fontSize: 16, color: CvColors.foreground },
});
