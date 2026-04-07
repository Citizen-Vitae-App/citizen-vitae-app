import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-native-qrcode-svg';
import { SettingsSheetHandle, SettingsSubHeader } from '@/components/settings/SettingsChrome';
import type { ProfileSettingsStackParamList } from '@/navigation/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getWebAppOrigin } from '@/lib/webAppUrl';
import { CvColors } from '@/theme/colors';

type Props = NativeStackScreenProps<ProfileSettingsStackParamList, 'SettingsSharing'>;

export function SettingsSharingScreen({ navigation }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugDraft, setSlugDraft] = useState('');
  const [showQr, setShowQr] = useState(false);

  const origin = getWebAppOrigin();

  const slugQuery = useQuery({
    queryKey: ['profile-slug', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('slug').eq('id', user.id).single();
      if (error) throw error;
      return (data?.slug as string | null) ?? null;
    },
    enabled: !!user?.id,
  });

  const slug = slugQuery.data ?? null;
  const fullUrl = origin && slug ? `${origin}/cv/${slug}` : '';

  const hostDisplay = origin ? origin.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'citizenvitae.com';
  const shortUrlDisplay = slug ? `${hostDisplay}/cv/${slug}` : `${hostDisplay}/cv/…`;

  const updateSlug = useMutation({
    mutationFn: async (newSlug: string) => {
      if (!user?.id) throw new Error('Non authentifié');
      const cleaned = newSlug
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      if (cleaned.length < 3) throw new Error('Le slug doit contenir au moins 3 caractères.');
      const { error } = await supabase.from('profiles').update({ slug: cleaned }).eq('id', user.id);
      if (error) {
        if (error.code === '23505') throw new Error('Cette URL est déjà prise.');
        throw error;
      }
      return cleaned;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile-slug', user?.id] });
      setEditingSlug(false);
      Alert.alert('Enregistré', 'URL mise à jour.');
    },
    onError: (e: Error) => Alert.alert('Erreur', e.message),
  });

  const onCopyFull = async () => {
    if (!fullUrl) {
      Alert.alert('Indisponible', 'Configure EXPO_PUBLIC_WEB_APP_ORIGIN pour obtenir le lien complet.');
      return;
    }
    try {
      await Clipboard.setStringAsync(fullUrl);
      Alert.alert('Copié', 'Lien copié dans le presse-papiers.');
    } catch {
      Alert.alert('Erreur', 'Impossible de copier.');
    }
  };

  const startEdit = () => {
    setSlugDraft(slug ?? '');
    setEditingSlug(true);
  };

  if (slugQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <SettingsSheetHandle />
        <SettingsSubHeader title="Partage" onBack={() => navigation.goBack()} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={CvColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <SettingsSheetHandle />
      <SettingsSubHeader title="Partage" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHead}>
          <MaterialCommunityIcons name="link-variant" size={22} color={CvColors.foreground} />
          <Text style={styles.sectionTitle}>Partage & URL</Text>
        </View>
        <Text style={styles.caption}>Personnalisez l&apos;URL de votre CV citoyen.</Text>

        {editingSlug ? (
          <View style={styles.editBlock}>
            <Text style={styles.monoHint}>{hostDisplay}/cv/</Text>
            <TextInput
              style={styles.input}
              value={slugDraft}
              onChangeText={(t) => setSlugDraft(t.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="votre-nom"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.editActions}>
              <Pressable
                style={styles.saveBtn}
                onPress={() => {
                  if (slugDraft && slugDraft !== slug) updateSlug.mutate(slugDraft);
                  else setEditingSlug(false);
                }}
                disabled={updateSlug.isPending}
              >
                <Text style={styles.saveBtnText}>Enregistrer</Text>
              </Pressable>
              <Pressable onPress={() => setEditingSlug(false)} hitSlop={12}>
                <Text style={styles.cancelText}>Annuler</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.urlRow}>
            <View style={styles.urlBox}>
              <Text style={styles.urlMono} numberOfLines={1}>
                {shortUrlDisplay}
              </Text>
            </View>
            <Pressable
              style={styles.iconBtn}
              onPress={startEdit}
              accessibilityLabel="Modifier le slug"
            >
              <MaterialCommunityIcons name="pencil" size={20} color={CvColors.foreground} />
            </Pressable>
          </View>
        )}

        <View style={styles.urlRow}>
          <View style={styles.urlBox}>
            <Text style={[styles.urlMono, !fullUrl && styles.urlMuted]} numberOfLines={1}>
              {fullUrl || (origin ? 'Chargement…' : 'URL complète après configuration du domaine web')}
            </Text>
          </View>
          <Pressable
            style={styles.iconBtn}
            onPress={() => void onCopyFull()}
            accessibilityLabel="Copier le lien"
            disabled={!fullUrl}
          >
            <MaterialCommunityIcons name="content-copy" size={20} color={fullUrl ? CvColors.foreground : '#CBD5E1'} />
          </Pressable>
        </View>

        <Pressable style={styles.qrToggle} onPress={() => setShowQr((v) => !v)}>
          <MaterialCommunityIcons name="qrcode" size={20} color={CvColors.foreground} />
          <Text style={styles.qrToggleText}>{showQr ? 'Masquer le QR code' : 'Afficher le QR code'}</Text>
        </Pressable>

        {showQr && fullUrl ? (
          <View style={styles.qrWrap}>
            <QRCode value={fullUrl} size={180} backgroundColor="#FFFFFF" color="#000000" />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: CvColors.foreground },
  caption: { fontSize: 13, color: CvColors.mutedForeground, marginTop: 6, marginBottom: 16 },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  urlBox: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  urlMono: { fontFamily: 'monospace', fontSize: 12, color: CvColors.foreground },
  urlMuted: { color: CvColors.mutedForeground },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  editBlock: { marginBottom: 16 },
  monoHint: { fontSize: 12, color: CvColors.mutedForeground, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: 'monospace',
  },
  editActions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  saveBtn: {
    backgroundColor: CvColors.foreground,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700' },
  cancelText: { fontSize: 15, color: '#64748B', fontWeight: '600' },
  qrToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrToggleText: { fontSize: 15, fontWeight: '600', color: CvColors.foreground },
  qrWrap: { alignItems: 'center', marginTop: 20 },
});
