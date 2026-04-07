import { Alert, Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

export type ShareWebLinkOptions = {
  /** Titre (surtout Android, dialogue de partage). */
  title?: string;
};

/**
 * Ouvre la feuille de partage native avec une URL https.
 * Sur iOS, `message` et `url` sont tous deux renseignés pour un comportement cohérent avec UIActivityViewController.
 */
export async function shareWebLink(url: string, options?: ShareWebLinkOptions): Promise<void> {
  const title = options?.title ?? 'Lien';
  try {
    if (Platform.OS === 'ios') {
      await Share.share({ url, message: url });
    } else {
      await Share.share({ message: url, title });
    }
  } catch {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert(
        'Lien copié',
        'Le partage natif a échoué. Le lien a été copié dans le presse-papiers.',
      );
    } catch {
      Alert.alert('Partage impossible', 'Réessaie plus tard ou ouvre le certificat depuis le site.');
    }
  }
}
