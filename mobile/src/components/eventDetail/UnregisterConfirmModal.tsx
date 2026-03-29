import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Appelé après validation ; la fermeture du modal est gérée par l’écran parent. */
  onConfirm: () => void;
};

/**
 * Modale de confirmation de désinscription (alignée sur la version web / maquette mobile).
 */
export function UnregisterConfirmModal({ visible, onClose, onConfirm }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        />
        <View style={styles.card}>
          <Text style={styles.title}>Confirmer la désinscription</Text>
          <Text style={styles.body}>
            Si vous annulez, vous n&apos;aurez plus accès aux mises à jour et aux activités de
            l&apos;événement. Souhaitez-vous continuer ?
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.btnNon, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Non, garder mon inscription"
            >
              <Text style={styles.btnNonText}>Non</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [styles.btnOui, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Oui, me désinscrire"
            >
              <Text style={styles.btnOuiText}>Oui</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    zIndex: 1,
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 28,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  btnNon: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnNonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  btnOui: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnOuiText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  pressed: { opacity: 0.85 },
});
