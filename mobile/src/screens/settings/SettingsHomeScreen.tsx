import { View, Text, Pressable, StyleSheet, ScrollView, Switch, Alert, Linking, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '@/contexts/AuthContext';
import { useLocationPreference } from '@/contexts/LocationPreferenceContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { SettingsSheetHandle, SettingsHomeHeader } from '@/components/settings/SettingsChrome';
import type { ProfileSettingsStackParamList } from '@/navigation/types';
import { buildWebAppPath } from '@/lib/webAppUrl';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { CvColors } from '@/theme/colors';

type Props = NativeStackScreenProps<ProfileSettingsStackParamList, 'SettingsHome'>;

const DELETE_RED = '#EB5757';

export function SettingsHomeScreen({ navigation }: Props) {
  const { profile, user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { preferences, isLoading: prefsLoading, updatePreferences } = useUserPreferences();
  const { locationSharingEnabled, setLocationSharingEnabled, ready: locationPrefReady } = useLocationPreference();

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Citoyen';
  const email = user?.email ?? '—';

  const onSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Déconnexion impossible');
    }
  };

  const privacyUrl = buildWebAppPath('/privacy');

  const openPrivacyPolicy = () => {
    if (privacyUrl) void Linking.openURL(privacyUrl);
  };

  const pickLanguage = () => {
    Alert.alert('Langue', 'Choisis la langue enregistrée sur ton compte.', [
      {
        text: 'Français',
        onPress: () => updatePreferences({ language: 'fr' }),
      },
      {
        text: 'English',
        onPress: () => updatePreferences({ language: 'en' }),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const onDeleteAccount = () => {
    if (!user?.id) return;
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible : ton profil et tes données seront supprimés.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await supabase.rpc('delete_user_account', {
                user_id_to_delete: user.id,
              });
              if (error) throw error;
              const result = data as { success?: boolean; message?: string } | null;
              if (result && !result.success) {
                throw new Error(result.message || 'Suppression impossible');
              }
              queryClient.clear();
              await supabase.auth.signOut();
            } catch (e) {
              Alert.alert('Erreur', e instanceof Error ? e.message : 'Suppression impossible');
            }
          },
        },
      ]
    );
  };

  const langLabel = preferences?.language === 'en' ? 'English' : 'Français';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SettingsSheetHandle />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SettingsHomeHeader title="Réglages" />

        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userEmail}>{email}</Text>
        <View style={styles.divider} />

        <Text style={styles.groupLabel}>Confidentialité des données</Text>
        <View style={styles.group}>
          <Pressable
            style={styles.linkRow}
            onPress={() => navigation.navigate('SettingsVisibility')}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="eye-outline" size={22} color={CvColors.foreground} />
            <Text style={styles.linkLabel}>Visibilité du profil</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={CvColors.mutedForeground} />
          </Pressable>
          <Pressable
            style={[styles.linkRow, styles.linkRowLast]}
            onPress={() => navigation.navigate('SettingsSharing')}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="link-variant" size={22} color={CvColors.foreground} />
            <Text style={styles.linkLabel}>Partage & URL personnalisée</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={CvColors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={styles.groupLabel}>Paramètres</Text>
        <View style={styles.group}>
          <Pressable style={styles.linkRow} onPress={pickLanguage} accessibilityRole="button">
            <MaterialCommunityIcons name="earth" size={22} color={CvColors.foreground} />
            <Text style={styles.linkLabel}>Langue</Text>
            <View style={styles.langRight}>
              {prefsLoading ? (
                <ActivityIndicator size="small" color={CvColors.mutedForeground} />
              ) : (
                <Text style={styles.langValue}>{langLabel}</Text>
              )}
              <MaterialCommunityIcons name="chevron-down" size={20} color={CvColors.mutedForeground} />
            </View>
          </Pressable>

          <View style={styles.linkRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={22} color={CvColors.foreground} />
            <View style={styles.locCol}>
              <Text style={styles.linkLabel}>Localisation</Text>
              <Text style={styles.locHint}>
                {!locationPrefReady ? 'En attente…' : 'Pour la certification de présence sur le lieu de mission.'}
              </Text>
            </View>
            <Switch
              value={locationSharingEnabled}
              onValueChange={(v) => void setLocationSharingEnabled(v)}
              disabled={!locationPrefReady}
              trackColor={{ false: '#E5E7EB', true: '#171717' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#E5E7EB"
            />
          </View>

          <Pressable
            style={[styles.linkRow, styles.linkRowLast]}
            onPress={() => navigation.navigate('SettingsNotifications')}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="bell-outline" size={22} color={CvColors.foreground} />
            <Text style={styles.linkLabel}>Notifications</Text>
            <MaterialCommunityIcons name="chevron-right" size={22} color={CvColors.mutedForeground} />
          </Pressable>
        </View>

        <View style={styles.commitment}>
          <MaterialCommunityIcons name="shield-check-outline" size={24} color={CvColors.mutedForeground} />
          <View style={styles.commitmentText}>
            <Text style={styles.commitmentTitle}>Notre engagement pour vos données</Text>
            <Text style={styles.commitmentBody}>
              Citizen Vitae protège vos données personnelles.{' '}
              {privacyUrl ? (
                <Text style={styles.commitmentLink} onPress={openPrivacyPolicy}>
                  Consultez notre Politique de confidentialité.
                </Text>
              ) : (
                <Text>La politique est disponible sur le site web.</Text>
              )}
            </Text>
          </View>
        </View>

        <Pressable style={styles.signOutBtn} onPress={() => void onSignOut()} accessibilityRole="button">
          <MaterialCommunityIcons name="logout" size={22} color={CvColors.foreground} />
          <Text style={styles.signOutText}>Se déconnecter</Text>
        </Pressable>

        <Pressable style={styles.deleteBtn} onPress={onDeleteAccount} accessibilityRole="button">
          <MaterialCommunityIcons name="delete-outline" size={20} color={DELETE_RED} />
          <Text style={styles.deleteText}>Supprimer mon compte</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  userName: { fontSize: 14, color: CvColors.mutedForeground, textAlign: 'center', marginTop: 4 },
  userEmail: { fontSize: 14, color: CvColors.mutedForeground, textAlign: 'center', marginTop: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E2E8F0',
    marginVertical: 20,
  },
  groupLabel: { fontSize: 15, fontWeight: '700', color: CvColors.foreground, marginBottom: 10 },
  group: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 4,
    marginBottom: 22,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  linkRowLast: { borderBottomWidth: 0 },
  linkLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: CvColors.foreground },
  langRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  langValue: { fontSize: 15, color: CvColors.mutedForeground, fontWeight: '500' },
  locCol: { flex: 1, minWidth: 0 },
  locHint: { fontSize: 12, color: CvColors.mutedForeground, marginTop: 4 },
  commitment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  commitmentText: { flex: 1 },
  commitmentTitle: { fontSize: 15, fontWeight: '700', color: CvColors.foreground, marginBottom: 6 },
  commitmentBody: { fontSize: 13, color: CvColors.mutedForeground, lineHeight: 18 },
  commitmentLink: { textDecorationLine: 'underline', color: CvColors.foreground, fontWeight: '600' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: CvColors.foreground },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  deleteText: { fontSize: 15, fontWeight: '600', color: DELETE_RED },
});
